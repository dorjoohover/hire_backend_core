import { Injectable } from '@nestjs/common';

interface RequestSample {
  ts: number;
  durationMs: number;
}

/**
 * Хүсэлтийн тоо/хариу хугацааг санах ойд хадгалдаг хялбар "sliding window"
 * тоолуур. DB/Redis шаардлагагүй, process restart хийхэд 0-ээс дахин
 * эхэлнэ — /health/metrics endpoint-ийн "app ачаалал" хэсэгт ашиглагдана.
 */
@Injectable()
export class MetricsService {
  private samples: RequestSample[] = [];
  private readonly WINDOW_MS = 15 * 60_000; // 15 минутын цонх хадгална
  private readonly MAX_SAMPLES = 20_000; // санах ой хамгаалалт

  record(durationMs: number) {
    const now = Date.now();
    this.samples.push({ ts: now, durationMs });
    if (this.samples.length > this.MAX_SAMPLES) {
      this.samples.splice(0, this.samples.length - this.MAX_SAMPLES);
    }
  }

  private prune() {
    const cutoff = Date.now() - this.WINDOW_MS;
    while (this.samples.length && this.samples[0].ts < cutoff) {
      this.samples.shift();
    }
  }

  /** Сүүлийн `minutes` минутад ирсэн хүсэлтийн тоо ба дундаж хариу хугацаа */
  stats(minutes: number) {
    this.prune();
    const cutoff = Date.now() - minutes * 60_000;
    const inWindow = this.samples.filter((s) => s.ts >= cutoff);
    const count = inWindow.length;
    const avgMs = count
      ? Math.round(
          inWindow.reduce((sum, s) => sum + s.durationMs, 0) / count,
        )
      : 0;
    return { count, avgMs };
  }
}
