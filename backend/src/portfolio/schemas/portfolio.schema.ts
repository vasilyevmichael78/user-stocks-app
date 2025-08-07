import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PortfolioDocument = Portfolio & Document;

@Schema()
export class PortfolioStock {
  @Prop({ required: true })
  symbol!: string;

  @Prop({ default: Date.now })
  addedDate!: Date;
}

@Schema({ timestamps: true })
export class Portfolio extends Document {
  @Prop({ required: true, ref: 'User' })
  userId!: string;

  @Prop({ type: [PortfolioStock], default: [] })
  stocks!: PortfolioStock[];
}

export const PortfolioSchema = SchemaFactory.createForClass(Portfolio);
