import { Global, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [
    {
      provide: DataSource,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        try {
          const dataSource = new DataSource({
            type: 'postgres',

            // 🔥 URL бүү ашигла — force IPv4
            host: '172.17.0.1',
            port: 5432,
            username: 'dorjoo',
            password: 'a1rKebDn7IIpisr9boM8dE6lzKW9D20xl3Rz',
            database: 'hire',

            entities: [__dirname + '/../**/*.entity{.ts,.js}'],

            synchronize: false, // 🔴 прод-д true БИТГИЙ
            logging: false,

            ssl: false,
            extra: {
              ssl: false,
              family: 4,              // 🔥 IPv4 force (ЧУХАЛ)
              max: 10,
              connectionTimeoutMillis: 20000,
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
