import mongoose, { Document, Schema } from 'mongoose';

export interface IPlatformSetting extends Document {
  platformName: string;
  supportEmail: string;
  supportPhone?: string;
  logoUrl?: string;
  maintenanceMode: boolean;
  defaultCurrency: string;
  defaultCurrencySymbol: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformSettingSchema = new Schema<IPlatformSetting>(
  {
    platformName: {
      type: String,
      default: 'WholesaleFlow',
    },
    supportEmail: {
      type: String,
      default: 'support@wholesaleflow.com',
    },
    supportPhone: {
      type: String,
      default: '+91 98765 43210',
    },
    logoUrl: {
      type: String,
      default: '',
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    defaultCurrency: {
      type: String,
      default: 'INR',
    },
    defaultCurrencySymbol: {
      type: String,
      default: '₹',
    },
  },
  {
    timestamps: true,
  }
);

export const PlatformSetting = mongoose.model<IPlatformSetting>('PlatformSetting', PlatformSettingSchema);
