import { Global, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

// Runs idempotent performance bootstrap statements (materialized view +
// indexes). Each statement is executed separately so one failure
// (e.g. table not migrated yet) doesn't block the others.
async function runPerfBootstrap(dataSource: DataSource) {
  try {
    const sqlPath = path.join(__dirname, 'sql', 'perf-bootstrap.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const statements = sql
      .split(/;\s*(?:\r?\n|$)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await dataSource.query(statement);
      } catch (err) {
        console.error(
          '⚠️  perf-bootstrap statement failed:',
          statement.slice(0, 80).replace(/\s+/g, ' '),
          err?.message ?? err,
        );
      }
    }
    console.log('✅ Perf bootstrap (materialized view + indexes) checked');
  } catch (err) {
    console.error('⚠️  Perf bootstrap skipped:', err?.message ?? err);
  }
}

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })], // Load environment variables
  providers: [
    {
      provide: DataSource,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        try {
          const dataSource = new DataSource({
            type: 'postgres',
            url: configService.get<string>('DATABASE_URL'), // Load from .env
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: true,
            extra: {
              max: Number(process.env.DB_POOL_MAX ?? 10), // pool хэмжээ
              idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS ?? 30_000),
              connectionTimeoutMillis: Number(
                process.env.DB_CONN_TIMEOUT_MS ?? 5_000,
              ),
              keepAlive: true,
              statement_timeout: Number(
                process.env.DB_STATEMENT_TIMEOUT_MS ?? 30_000,
              ),
              query_timeout: Number(process.env.DB_QUERY_TIMEOUT_MS ?? 35_000),
            },

          });

          await dataSource.initialize();
          console.log('✅ Database Connected Successfully');
          await runPerfBootstrap(dataSource);
          return dataSource;
        } catch (error) {
          console.error('❌ Database Connection Error:', error);
          throw error;
        }
      },
    },
  ],
  exports: [DataSource],
})
export class DatabaseModule {}
