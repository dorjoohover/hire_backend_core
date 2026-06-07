import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Хялбар in-process TTL cache.
 * Redis суулгаагүй үед static / rarely-changing өгөгдлийг санах ойд хадгалана.
 *
 * Хэрэглээ:
 *   const data = await this.cache.getOrSet('levels', () => this.dao.findAll(), 60_000);
 */
@Injectable()
export class CacheService {
  private store = new Map<string, CacheEntry<unknown>>();

  /** Утгыг авна; байхгүй буюу хугацаа дуусвал `loader`-ийг дуудаж шинэчилнэ */
  async getOrSet<T>(key: string, loader: () => Promise<T>, ttlMs = 30_000): Promise<T> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (entry && Date.now() < entry.expiresAt) {
      return entry.value;
    }
    const value = await loader();
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  /** Тухайн key-г устгана (cache invalidation) */
  del(key: string) {
    this.store.delete(key);
  }

  /** Бүх cache цэвэрлэнэ */
  clear() {
    this.store.clear();
  }
}
