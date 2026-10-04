import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/*
 * Тестийн "тодорхойлолт"-ын кэш (v1.3.0): асуулт, хариулт (mv_question_answer_full), хэсэг —
 * admin засах үед л өөрчлөгддөг, харин шалгалт өгөх бүрд (олон хүн зэрэг) уншигддаг өгөгдөл.
 *
 * Хүчингүй болгох (invalidation): Redis-ийн `defcache:epoch` тоолуур. Түлхүүр бүр epoch-ийг
 * агуулна → admin бичилт бүрд (DefinitionCacheInterceptor) эсвэл MV refresh дууссаны дараа
 * epoch++ → бүх replica (4 core) шинэ түлхүүр рүү шилжинэ; хуучин түлхүүр TTL-ээр арилна.
 * TTL таах шаардлагагүй, хуучирсан томьёо/асуулт гарах эрсдэлгүй.
 *
 * Давхарга: процесс доторх L1 (≤60с, epoch-тэй түлхүүр) → Redis (TTL 1ц) → DB.
 * Redis унавал кэшийг алгасаж шууд DB (fail-open, зөвхөн гүйцэтгэл буурна).
 * Утга бүрийг JSON-оор хадгалж уншилт бүрд ШИНЭ объект буцаана (дуудагч мутаци хийсэн ч
 * кэш эвдрэхгүй). DEF_CACHE=off бол бүхэлдээ унтарна.
 */
const EPOCH_KEY = 'defcache:epoch';
const L1_TTL_MS = Number(process.env.DEF_CACHE_L1_MS ?? 60_000);
const EPOCH_L1_MS = Number(process.env.DEF_CACHE_EPOCH_MS ?? 500);
const REDIS_TTL_S = Number(process.env.DEF_CACHE_TTL_S ?? 3600);
const L1_MAX = 5000;

@Injectable()
export class DefinitionCacheService implements OnModuleDestroy {
  private readonly log = new Logger('DefinitionCache');
  private readonly redis: Redis | null;
  private readonly l1 = new Map<string, { exp: number; json: string }>();
  private epochL1: { value: string; exp: number } | null = null;
  private lastErrorLog = 0;
  stats = { l1: 0, redis: 0, miss: 0, bypass: 0 };

  constructor() {
    const off = (process.env.DEF_CACHE ?? '').toLowerCase() === 'off';
    this.redis =
      off || !process.env.REDIS_HOST
        ? null
        : new Redis({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT ?? 6379),
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            connectTimeout: 2000,
            lazyConnect: false,
          });
    this.redis?.on('error', (e) => this.warn(`redis: ${e?.message ?? e}`));
  }

  enabled(): boolean {
    return !!this.redis && this.redis.status === 'ready';
  }

  private warn(msg: string) {
    if (Date.now() - this.lastErrorLog > 60_000) {
      this.lastErrorLog = Date.now();
      this.log.warn(`${msg} — кэш алгасагдана (DB-ээс шууд)`);
    }
  }

  /** Одоогийн epoch (500мс процесс дотор). Redis боломжгүй бол null → кэш алгасна. */
  async epoch(): Promise<string | null> {
    if (!this.enabled()) return null;
    if (this.epochL1 && this.epochL1.exp > Date.now()) return this.epochL1.value;
    try {
      const v = (await this.redis!.get(EPOCH_KEY)) ?? '0';
      this.epochL1 = { value: v, exp: Date.now() + EPOCH_L1_MS };
      return v;
    } catch (e: any) {
      this.warn(`epoch: ${e?.message ?? e}`);
      return null;
    }
  }

  private key(epoch: string, part: string, id: string | number) {
    return `defcache:${epoch}:${part}:${id}`;
  }

  private l1Get(key: string): string | undefined {
    const e = this.l1.get(key);
    if (!e) return undefined;
    if (e.exp < Date.now()) {
      this.l1.delete(key);
      return undefined;
    }
    return e.json;
  }

  private l1Set(key: string, json: string) {
    if (this.l1.size >= L1_MAX) this.l1.clear();
    this.l1.set(key, { exp: Date.now() + L1_TTL_MS, json });
  }

  /** Нэг утга. loader нь кэш алга үед л дуудагдана. */
  async getOrLoad<T>(part: string, id: string | number, loader: () => Promise<T>): Promise<T> {
    const ep = await this.epoch();
    if (ep == null) {
      this.stats.bypass++;
      return loader();
    }
    const key = this.key(ep, part, id);
    const local = this.l1Get(key);
    if (local !== undefined) {
      this.stats.l1++;
      return JSON.parse(local);
    }
    try {
      const remote = await this.redis!.get(key);
      if (remote != null) {
        this.stats.redis++;
        this.l1Set(key, remote);
        return JSON.parse(remote);
      }
    } catch (e: any) {
      this.warn(`get: ${e?.message ?? e}`);
      return loader();
    }
    this.stats.miss++;
    const value = await loader();
    const json = JSON.stringify(value ?? null);
    this.l1Set(key, json);
    this.redis!.set(key, json, 'EX', REDIS_TTL_S).catch((e) => this.warn(`set: ${e?.message ?? e}`));
    return JSON.parse(json);
  }

  /**
   * Олон id нэг дор (MGET). loader(missingIds) → Map<id, value>; loader буцаагаагүй id-д
   * `empty` хадгална (дараа дахин DB-д асуухгүй).
   */
  async getMany<T>(
    part: string,
    ids: number[],
    loader: (missing: number[]) => Promise<Map<number, T>>,
    empty: T,
  ): Promise<Map<number, T>> {
    const out = new Map<number, T>();
    const uniq = [...new Set(ids)];
    const ep = await this.epoch();
    if (ep == null || !uniq.length) {
      this.stats.bypass++;
      return uniq.length ? loader(uniq) : out;
    }
    const keys = uniq.map((id) => this.key(ep, part, id));
    let missing: number[] = [];
    const fromRedis: (string | null)[] = new Array(uniq.length).fill(null);
    const needRemote: number[] = [];
    uniq.forEach((id, i) => {
      const local = this.l1Get(keys[i]);
      if (local !== undefined) {
        out.set(id, JSON.parse(local));
        this.stats.l1++;
      } else needRemote.push(i);
    });
    if (needRemote.length) {
      try {
        const vals = await this.redis!.mget(...needRemote.map((i) => keys[i]));
        needRemote.forEach((i, j) => (fromRedis[i] = vals[j]));
      } catch (e: any) {
        this.warn(`mget: ${e?.message ?? e}`);
      }
      for (const i of needRemote) {
        const v = fromRedis[i];
        if (v != null) {
          this.l1Set(keys[i], v);
          out.set(uniq[i], JSON.parse(v));
          this.stats.redis++;
        } else missing.push(uniq[i]);
      }
    }
    if (missing.length) {
      this.stats.miss += missing.length;
      const loaded = await loader(missing);
      const pipe = this.redis!.pipeline();
      for (const id of missing) {
        const json = JSON.stringify(loaded.has(id) ? loaded.get(id) : empty);
        const k = this.key(ep, part, id);
        this.l1Set(k, json);
        pipe.set(k, json, 'EX', REDIS_TTL_S);
        out.set(id, JSON.parse(json));
      }
      pipe.exec().catch((e) => this.warn(`mset: ${e?.message ?? e}`));
      missing = [];
    }
    return out;
  }

  /** Admin бичилт / MV refresh-ийн дараа: бүх replica-д хүчингүй. */
  async bump(reason: string): Promise<void> {
    this.l1.clear();
    this.epochL1 = null;
    if (!this.redis) return;
    try {
      const v = await this.redis.incr(EPOCH_KEY);
      this.log.log(`epoch → ${v} (${reason})`);
    } catch (e: any) {
      this.warn(`bump: ${e?.message ?? e}`);
    }
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
  }
}
