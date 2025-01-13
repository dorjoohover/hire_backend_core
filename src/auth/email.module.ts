import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: 'smtp.ethereal.email',
          port: 587,
          service: 'gmail',
          auth: {
            user: 'dorjoohover@gmail.com',
            pass: 'qwrn ysyk prkg iuls',
          },
        },
        defaults: {
          from: 'dorjoohover@gmail.com',
        },
      }),
    }),
  ],
})
export class EmailModule {}
