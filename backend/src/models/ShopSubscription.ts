import mongoose, { Document, Schema, Types } from 'mongoose';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'expired'
  | 'cancelled'
  | 'suspended';

export interface ISubscriptionPayment {
  amount: number;
  currency: string;
  paymentDate: Date;
  paymentMethod: 'bank_transfer' | 'upi' | 'cash' | 'card' | 'cheque' | 'other';
  referenceNumber: string;
  notes?: string;
  recordedBy?: Types.ObjectId;
}

export interface ISubscriptionStatusChange {
  fromStatus: string;
  toStatus: string;
  reason?: string;
  changedAt: Date;
  changedBy?: Types.ObjectId;
}

export interface IShopSubscription extends Document {
  _id: Types.ObjectId;
  shopId: Types.ObjectId;
  planId: Types.ObjectId;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  trialEndsAt?: Date;
  autoRenew: boolean;
  payments: ISubscriptionPayment[];
  statusHistory: ISubscriptionStatusChange[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPaymentSchema = new Schema<ISubscriptionPayment>(
  {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'upi', 'cash', 'card', 'cheque', 'other'],
      default: 'bank_transfer',
    },
    referenceNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true, timestamps: true }
);

const SubscriptionStatusChangeSchema = new Schema<ISubscriptionStatusChange>(
  {
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    reason: { type: String, trim: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const ShopSubscriptionSchema = new Schema<IShopSubscription>(
  {
    shopId: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['trialing', 'active', 'past_due', 'expired', 'cancelled', 'suspended'],
      default: 'active',
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    trialEndsAt: {
      type: Date,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    payments: {
      type: [SubscriptionPaymentSchema],
      default: [],
    },
    statusHistory: {
      type: [SubscriptionStatusChangeSchema],
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

ShopSubscriptionSchema.index({ shopId: 1, status: 1 });

export const ShopSubscription = mongoose.model<IShopSubscription>(
  'ShopSubscription',
  ShopSubscriptionSchema
);
