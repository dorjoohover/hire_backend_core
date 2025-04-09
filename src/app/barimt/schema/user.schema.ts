import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Receipt, ReceiptSchema } from './receipt.schema';

@Schema({
  timestamps: true,
})
export class User {
  @Prop({ type: String })
  // like system token
  token: string;
  @Prop({ type: String })
  // ebarimt token
  accessToken: string;

  @Prop({ type: String })
  // expiredDate
  date: Date;

  @Prop({ type: String })
  type: string;
  @Prop({ type: String })
  clientId: string;
  @Prop({ type: String })
  username: string;
  @Prop({ type: String })
  password: string;

  @Prop()
  role: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Receipt' }], default: [] })
  receipts: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);
export type UserDocument = HydratedDocument<User>;
