import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({
  timestamps: true,
})
export class Receipt {
  @Prop({ type: String })
  id: string;
  @Prop({ type: Number })
  totalAmount: number;

  @Prop({ type: Number })
  totalVAT: number;
  @Prop({ type: Number })
  totalCityTax: number;

  @Prop({ type: String })
  lottery: string;
  // @Prop({ type: String })
  // qrData: string;
  @Prop({ type: String })
  status: string;
  @Prop({ type: Number })
  userId: number;
  @Prop({ type: Number })
  service: number;
  @Prop({ type: String })
  date: Date;
  @Prop({ type: Boolean })
  easy: boolean;
}

export const ReceiptSchema = SchemaFactory.createForClass(Receipt);
export type ReceiptDocument = HydratedDocument<Receipt>;
