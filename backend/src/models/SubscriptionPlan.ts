import mongoose, { Document, Schema, Types } from 'mongoose';

export type BillingInterval = 'monthly' | 'quarterly' | 'yearly' | 'one-time';

export interface ISubscriptionPlan extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  description: string;
  price: number;
  currency: string;
  billingInterval: BillingInterval;
  trialDays: number;
  maxProducts: number; // -1 for unlimited
  maxCategories: number; // -1 for unlimited
  maxAdmins: number; // -1 for unlimited
  allowCustomProductFields: boolean;
  allowAnalytics: boolean;
  allowExportInvoices: boolean;
  allowOnlineOrdering: boolean;
  isActive: boolean;
  displayOrder: number;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: [true, 'Plan code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be non-negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    billingInterval: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly', 'one-time'],
      default: 'monthly',
    },
    trialDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxProducts: {
      type: Number,
      default: 50, // -1 means unlimited
    },
    maxCategories: {
      type: Number,
      default: 10, // -1 means unlimited
    },
    maxAdmins: {
      type: Number,
      default: 1, // -1 means unlimited
    },
    allowCustomProductFields: {
      type: Boolean,
      default: true,
    },
    allowAnalytics: {
      type: Boolean,
      default: true,
    },
    allowExportInvoices: {
      type: Boolean,
      default: true,
    },
    allowOnlineOrdering: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    features: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>(
  'SubscriptionPlan',
  SubscriptionPlanSchema
);
