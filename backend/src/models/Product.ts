import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProductVariant {
  name: string;
  sku?: string;
  price: number;
  stockQuantity?: number;
}

export interface IProduct extends Document {
  _id: Types.ObjectId;
  shopId: Types.ObjectId;
  name: string;
  slug: string;
  sku: string;
  description: string;
  categoryId: Types.ObjectId;
  images: string[];
  price: number;
  compareAtPrice?: number;
  unit: string;
  minimumOrderQuantity: number;
  trackInventory: boolean;
  stockQuantity: number;
  isActive: boolean;
  isFeatured: boolean;
  variants: IProductVariant[];
  customFields?: Record<string, any>;
  formVersionId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    stockQuantity: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    shopId: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      trim: true,
      lowercase: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 4000,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true,
    },
    images: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be non-negative'],
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare-at price must be non-negative'],
    },
    unit: {
      type: String,
      default: 'piece',
      trim: true,
    },
    minimumOrderQuantity: {
      type: Number,
      default: 1,
      min: [1, 'Minimum order quantity must be at least 1'],
    },
    trackInventory: {
      type: Boolean,
      default: false,
    },
    stockQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Stock quantity cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    variants: {
      type: [ProductVariantSchema],
      default: [],
    },
    customFields: {
      type: Schema.Types.Mixed,
      default: {},
    },
    formVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductFormVersion',
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique SKU and unique Slug per shop
ProductSchema.index({ shopId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ shopId: 1, slug: 1 }, { unique: true });
ProductSchema.index({ shopId: 1, isActive: 1, categoryId: 1 });
ProductSchema.index({ shopId: 1, isActive: 1, isFeatured: 1 });
ProductSchema.index({ shopId: 1, isActive: 1, createdAt: -1 });
ProductSchema.index({ shopId: 1, isActive: 1, price: 1 });
ProductSchema.index({ shopId: 1, isActive: 1, price: -1 });
ProductSchema.index({ shopId: 1, isActive: 1, name: 1 });

// Full text search indexing
ProductSchema.index(
  { name: 'text', description: 'text', sku: 'text' },
  { weights: { name: 5, sku: 3, description: 1 } }
);

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
