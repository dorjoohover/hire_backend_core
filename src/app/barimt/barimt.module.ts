import { Module } from '@nestjs/common';
import { BarimtService } from './barimt.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/user.schema';
import { Receipt, ReceiptSchema } from './schema/receipt.schema';
import { HttpModule, HttpService } from '@nestjs/axios';
import { BarimtController } from './barimt.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Receipt.name,
        schema: ReceiptSchema,
      },
    ]),
    HttpModule,
  ],
  controllers: [BarimtController],
  providers: [BarimtService],
})
export class BarimtModule {}
