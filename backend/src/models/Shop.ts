import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IShopAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface ISocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
}

export interface IShop extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  contactPhone?: string;
  whatsappNumber: string; // International format e.g. 919876543210
  email?: string;
  address?: IShopAddress;
  businessHours?: string;
  socialLinks?: ISocialLinks;
  accentColor: string;
  currency: string;
  currencySymbol: string;
  status: 'active' | 'inactive' | 'suspended';
  subscriptionId?: Types.ObjectId;
  productFormTemplateId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ShopSchema = new Schema<IShop>(
  {
    name: {
      type: String,
      required: [true, 'Shop name is required'],
      trim: true,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: [true, 'Shop slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    logo: {
      type: String,
      default: '',
    },
    banner: {
      type: String,
      default: '',
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    whatsappNumber: {
      type: String,
      required: [true, 'WhatsApp number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, trim: true, default: 'India' },
    },
    businessHours: {
      type: String,
      trim: true,
      default: 'Mon - Sat: 9:00 AM - 8:00 PM',
    },
    socialLinks: {
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      twitter: { type: String, trim: true },
      website: { type: String, trim: true },
    },
    accentColor: {
      type: String,
      default: '#2563eb', // Default royal blue
      trim: true,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    currencySymbol: {
      type: String,
      default: '₹',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'ShopSubscription',
      index: true,
    },
    productFormTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductFormTemplate',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const Shop = mongoose.model<IShop>('Shop', ShopSchema);
