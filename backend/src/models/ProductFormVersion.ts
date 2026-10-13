import mongoose, { Document, Schema, Types } from 'mongoose';

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'decimal'
  | 'price'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'url'
  | 'email'
  | 'phone'
  | 'image'
  | 'multi_image'
  | 'boolean'
  | 'sku'
  | 'uom'
  | 'moq'
  | 'stock'
  | 'variants';

export interface IFormFieldOption {
  label: string;
  value: string;
}

export interface IFormFieldConfig {
  fieldKey: string; // Stable internal identifier, e.g., 'brand_name'
  label: string; // Display label
  internalName?: string;
  type: FormFieldType;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  defaultValue?: any;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  options?: IFormFieldOption[];
  defaultOption?: string;
  regex?: string;
  visibleOnCard: boolean; // Shown on public catalogue cards
  visibleOnDetails: boolean; // Shown on product detail page
  searchable: boolean;
  filterable: boolean;
  isPublic: boolean; // If false, never exposed in public API
  editableByShopAdmin: boolean;
  displayOrder: number;
}

export interface IProductFormVersion extends Document {
  _id: Types.ObjectId;
  templateId: Types.ObjectId;
  versionNumber: number;
  status: 'draft' | 'published';
  fields: IFormFieldConfig[];
  publishedAt?: Date;
  createdBy?: Types.ObjectId;
  changeSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const FormFieldOptionSchema = new Schema<IFormFieldOption>(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

export const FormFieldConfigSchema = new Schema<IFormFieldConfig>(
  {
    fieldKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    label: { type: String, required: true, trim: true },
    internalName: { type: String, trim: true },
    type: {
      type: String,
      required: true,
      enum: [
        'text',
        'textarea',
        'number',
        'decimal',
        'price',
        'select',
        'multiselect',
        'radio',
        'checkbox',
        'date',
        'url',
        'email',
        'phone',
        'image',
        'multi_image',
        'boolean',
        'sku',
        'uom',
        'moq',
        'stock',
        'variants',
      ],
      default: 'text',
    },
    placeholder: { type: String, default: '' },
    helpText: { type: String, default: '' },
    required: { type: Boolean, default: false },
    defaultValue: { type: Schema.Types.Mixed },
    minLength: { type: Number },
    maxLength: { type: Number },
    minValue: { type: Number },
    maxValue: { type: Number },
    step: { type: Number },
    options: { type: [FormFieldOptionSchema], default: [] },
    defaultOption: { type: String },
    regex: { type: String },
    visibleOnCard: { type: Boolean, default: false },
    visibleOnDetails: { type: Boolean, default: true },
    searchable: { type: Boolean, default: false },
    filterable: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: true },
    editableByShopAdmin: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

const ProductFormVersionSchema = new Schema<IProductFormVersion>(
  {
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductFormTemplate',
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },
    fields: {
      type: [FormFieldConfigSchema],
      default: [],
    },
    publishedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    changeSummary: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

ProductFormVersionSchema.index({ templateId: 1, versionNumber: 1 }, { unique: true });

export const ProductFormVersion = mongoose.model<IProductFormVersion>(
  'ProductFormVersion',
  ProductFormVersionSchema
);
