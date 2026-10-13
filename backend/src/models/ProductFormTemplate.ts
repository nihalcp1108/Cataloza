import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProductFormTemplate extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  isPlatformDefault: boolean;
  assignedShopIds: Types.ObjectId[];
  status: 'draft' | 'published' | 'archived';
  currentPublishedVersionId?: Types.ObjectId;
  latestDraftVersionId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductFormTemplateSchema = new Schema<IProductFormTemplate>(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    isPlatformDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    assignedShopIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        index: true,
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    currentPublishedVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductFormVersion',
    },
    latestDraftVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductFormVersion',
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

ProductFormTemplateSchema.index({ isPlatformDefault: 1, status: 1 });

export const ProductFormTemplate = mongoose.model<IProductFormTemplate>(
  'ProductFormTemplate',
  ProductFormTemplateSchema
);
