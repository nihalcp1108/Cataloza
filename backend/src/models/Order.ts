import mongoose, { Document, Schema, Types } from 'mongoose';
import { OrderStatus, PaymentStatus } from '../types';

export interface IOrderItemSnapshot {
  productId: Types.ObjectId;
  name: string;
  sku: string;
  variantName?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  image?: string;
}

export interface IOrderStatusHistory {
  status: OrderStatus;
  changedBy?: Types.ObjectId;
  note?: string;
  timestamp: Date;
}

export interface IPaymentHistory {
  status: PaymentStatus;
  amount: number;
  reference?: string;
  recordedBy?: Types.ObjectId;
  note?: string;
  timestamp: Date;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string;
  shopId: Types.ObjectId;
  customerId: Types.ObjectId;
  customerSnapshot: {
    name: string;
    email: string;
    phone: string;
    businessName?: string;
  };
  deliveryAddress: {
    fullName: string;
    phone: string;
    businessName?: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: IOrderItemSnapshot[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  grandTotal: number;
  currency: string;
  currencySymbol: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentNotes?: string;
  customerNotes?: string;
  internalNotes?: string;
  cancellationReason?: string;
  statusHistory: IOrderStatusHistory[];
  paymentHistory: IPaymentHistory[];
  whatsappHandoffInitiated: boolean;
  whatsappHandoffTimestamp?: Date;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSnapshotSchema = new Schema<IOrderItemSnapshot>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    variantName: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: 'piece' },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    image: { type: String },
  },
  { _id: false }
);

const OrderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'ready_for_dispatch', 'shipped', 'delivered', 'cancelled'],
      required: true,
    },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PaymentHistorySchema = new Schema<IPaymentHistory>(
  {
    status: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid', 'refunded'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    shopId: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customerSnapshot: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      businessName: { type: String },
    },
    deliveryAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      businessName: { type: String },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: 'India' },
    },
    items: {
      type: [OrderItemSnapshotSchema],
      required: true,
      validate: [(val: any[]) => val.length > 0, 'Order must contain at least one item'],
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    currencySymbol: { type: String, default: '₹' },
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'ready_for_dispatch', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid', 'refunded'],
      default: 'unpaid',
      index: true,
    },
    paymentNotes: { type: String },
    customerNotes: { type: String },
    internalNotes: { type: String },
    cancellationReason: { type: String },
    statusHistory: { type: [OrderStatusHistorySchema], default: [] },
    paymentHistory: { type: [PaymentHistorySchema], default: [] },
    whatsappHandoffInitiated: { type: Boolean, default: false },
    whatsappHandoffTimestamp: { type: Date },
    idempotencyKey: { type: String, index: true, sparse: true },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ shopId: 1, createdAt: -1 });
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ shopId: 1, orderStatus: 1 });
OrderSchema.index({ shopId: 1, paymentStatus: 1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
