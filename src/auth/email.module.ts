import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: 'smtp.hire.mn',
          port: 587,
          service: 'gmail',
          auth: {
            user: 'info@hire.mn',
            pass: 'jgig fpup gisr obii',
          },
        },
        defaults: {
          from: 'info@hire.mn',
        },
      }),
    }),
  ],
})
export class EmailModule {}
