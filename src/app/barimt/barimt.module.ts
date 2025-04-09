import { Module } from '@nestjs/common';
import { BarimtService } from './barimt.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/user.schema';
import { Receipt, ReceiptSchema } from './schema/receipt.schema';

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
  ],
  providers: [BarimtService],
})
export class BarimtModule {}
