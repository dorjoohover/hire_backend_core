import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { promises as fsp } from 'node:fs';
import { createWriteStream, WriteStream } from 'node:fs';
import * as path from 'node:path';

export type ErrorLogEntry = {
  ts: string;
  status: number;
  message: string;
  name?: string;
  stack?: string;
  method?: string;
  url?: string;
  ip?: string;
  user?: any;
};

@Injectable()
export class FileErrorLogService implements OnModuleDestroy {
  private dir = process.env.CORE_LOG_DIR ?? path.resolve(process.cwd(), 'logs');
  private stream: WriteStream | null = null;
  private day = '';

  private today(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  private async ensureStream() {
    const d = this.today();
    if (this.stream && this.day === d) return;

    await fsp.mkdir(this.dir, { recursive: true });
    if (this.stream) this.stream.end();

    const filename = path.join(this.dir, `errors-${d}.jsonl`);
    this.stream = createWriteStream(filename, { flags: 'a' });
    this.day = d;
  }

  async log(entry: ErrorLogEntry): Promise<void> {
    await this.ensureStream();
    const line = JSON.stringify(entry) + '\n';
    await new Promise<void>((resolve, reject) => {
      const ok = this.stream!.write(line, (err) =>
        err ? reject(err) : resolve(),
      );
      if (!ok) this.stream!.once('drain', resolve);
    });
  }

  onModuleDestroy() {
    if (this.stream) this.stream.end();
  }
}
