import { Global, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
              max: Number(25), // pool хэмжээ
              idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS ?? 30_000),
              connectionTimeoutMillis: Number(
                process.env.DB_CONN_TIMEOUT_MS ?? 15_000,
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
