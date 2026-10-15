import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IShopAddress {
  addressLine1?: string;
  addressLine2?: string;
  street?: string;
  city?: string;
  district?: string;
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

export interface IShopBranding {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  buttonColor: string;
  backgroundColor: string;
  textColor: string;
}

export interface IShop extends Document {
  _id: Types.ObjectId;
  name: string;
  businessName?: string;
  slug: string;
  description?: string;
  ownerName?: string;
  businessCategory?: string;
  gstNumber?: string;
  logo?: string;
  banner?: string;
  contactPhone?: string;
  whatsappNumber: string; // International format e.g. 919876543210
  whatsappCheckoutEnabled?: boolean;
  email?: string;
  website?: string;
  address?: IShopAddress;
  businessHours?: string;
  socialLinks?: ISocialLinks;
  branding?: IShopBranding;
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
    businessName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
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
      default: '',
    },
    ownerName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    businessCategory: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'General Wholesale',
    },
    gstNumber: {
      type: String,
      trim: true,
      maxlength: 30,
      default: '',
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
      default: '',
    },
    whatsappNumber: {
      type: String,
      required: [true, 'WhatsApp number is required'],
      trim: true,
    },
    whatsappCheckoutEnabled: {
      type: Boolean,
      default: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      addressLine1: { type: String, trim: true, default: '' },
      addressLine2: { type: String, trim: true, default: '' },
      street: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      district: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      postalCode: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: 'India' },
    },
    businessHours: {
      type: String,
      trim: true,
      default: 'Mon - Sat: 9:00 AM - 8:00 PM',
    },
    socialLinks: {
      facebook: { type: String, trim: true, default: '' },
      instagram: { type: String, trim: true, default: '' },
      twitter: { type: String, trim: true, default: '' },
      website: { type: String, trim: true, default: '' },
    },
    branding: {
      primaryColor: { type: String, default: '#2563eb', trim: true },
      secondaryColor: { type: String, default: '#475569', trim: true },
      accentColor: { type: String, default: '#3b82f6', trim: true },
      buttonColor: { type: String, default: '#2563eb', trim: true },
      backgroundColor: { type: String, default: '#ffffff', trim: true },
      textColor: { type: String, default: '#0f172a', trim: true },
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
