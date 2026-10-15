import mongoose, { Document, Schema, Types } from 'mongoose';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'expired'
  | 'cancelled'
  | 'suspended';

export type PaymentRecordStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export interface ISubscriptionPayment {
  _id?: Types.ObjectId;
  amount: number;
  currency: string;
  paymentDate: Date;
  paymentMethod: 'bank_transfer' | 'upi' | 'cash' | 'card' | 'cheque' | 'other';
  paymentStatus: PaymentRecordStatus;
  referenceNumber: string;
  planName?: string;
  discount?: number;
  notes?: string;
  recordedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISubscriptionStatusChange {
  fromStatus: string;
  toStatus: string;
  reason?: string;
  changedAt: Date;
  changedBy?: Types.ObjectId;
}

export interface IPlanSnapshot {
  name: string;
  code: string;
  price: number;
  currency: string;
  billingInterval: string;
  maxProducts: number;
  maxCategories: number;
  maxAdmins: number;
  features: string[];
}

export interface IShopSubscription extends Document {
  _id: Types.ObjectId;
  shopId: Types.ObjectId;
  planId: Types.ObjectId;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  renewalDate?: Date;
  trialEndsAt?: Date;
  autoRenew: boolean;
  billingAmount?: number;
  paymentStatus?: 'paid' | 'pending' | 'overdue';
  planSnapshot?: IPlanSnapshot;
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
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'failed', 'refunded'],
      default: 'paid',
      index: true,
    },
    referenceNumber: { type: String, trim: true, default: '' },
    planName: { type: String, trim: true },
    discount: { type: Number, default: 0, min: 0 },
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

const PlanSnapshotSchema = new Schema<IPlanSnapshot>(
  {
    name: { type: String, default: '' },
    code: { type: String, default: '' },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    billingInterval: { type: String, default: 'monthly' },
    maxProducts: { type: Number, default: 50 },
    maxCategories: { type: Number, default: 10 },
    maxAdmins: { type: Number, default: 1 },
    features: { type: [String], default: [] },
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
    renewalDate: {
      type: Date,
    },
    trialEndsAt: {
      type: Date,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    billingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'overdue'],
      default: 'paid',
      index: true,
    },
    planSnapshot: {
      type: PlanSnapshotSchema,
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
ShopSubscriptionSchema.index({ 'payments.paymentDate': -1 });

export const ShopSubscription = mongoose.model<IShopSubscription>(
  'ShopSubscription',
  ShopSubscriptionSchema
);
