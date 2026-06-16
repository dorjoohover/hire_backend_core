import { Global, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PERF_BOOTSTRAP_STATEMENTS } from './sql/perf-bootstrap';

// Runs idempotent performance bootstrap statements (materialized view +
// indexes). Each statement is executed separately so one failure
// (e.g. table not migrated yet) doesn't block the others. Statements are
// embedded as TS (not a separate .sql asset) so they always ship with the
// compiled dist regardless of the nest-cli asset-copy config.
async function runPerfBootstrap(dataSource: DataSource) {
  for (const statement of PERF_BOOTSTRAP_STATEMENTS) {
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
            synchronize: false,
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
