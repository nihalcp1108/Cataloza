export type UserRole = 'super_admin' | 'shop_admin' | 'customer';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_for_dispatch'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refunded';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  assignedShopIds?: any[];
  isActive: boolean;
  mustChangePassword?: boolean;
  lastLogin?: string;
  invitationToken?: string;
  invitationExpires?: string;
  createdAt?: string;
}

export interface IShopAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface IShop {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  contactPhone?: string;
  whatsappNumber: string;
  email?: string;
  address?: IShopAddress;
  businessHours?: string;
  accentColor?: string;
  currency?: string;
  currencySymbol?: string;
  status: 'active' | 'inactive' | 'suspended';
  productCount?: number;
  orderCount?: number;
  admins?: any[];
  publicUrl?: string;
  subscriptionId?: any;
  productFormTemplateId?: any;
}

export interface ICategory {
  _id: string;
  shopId: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface IProductVariant {
  name: string;
  sku?: string;
  price: number;
  stockQuantity?: number;
}

export interface IProduct {
  _id: string;
  shopId: string;
  name: string;
  slug: string;
  sku: string;
  description?: string;
  categoryId?: any;
  images: string[];
  price: number;
  compareAtPrice?: number;
  unit: string;
  minimumOrderQuantity: number;
  trackInventory: boolean;
  stockQuantity: number;
  isActive: boolean;
  isFeatured: boolean;
  variants?: IProductVariant[];
  customFields?: Record<string, any>;
  createdAt?: string;
}

export interface ICartItem {
  productId: string;
  name: string;
  sku: string;
  variantName?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  image?: string;
  minimumOrderQuantity: number;
  trackInventory: boolean;
  stockQuantity: number;
  isOutOfStock?: boolean;
  belowMoq?: boolean;
}

export interface ICart {
  shop: {
    _id: string;
    name: string;
    slug: string;
    currencySymbol?: string;
  };
  items: ICartItem[];
  subtotal: number;
  itemCount: number;
  hasUnavailable?: boolean;
}

export interface IAddress {
  _id: string;
  fullName: string;
  phone: string;
  businessName?: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface IOrderItem {
  productId: string;
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
  changedBy?: { name: string; role: string };
  note?: string;
  timestamp: string;
}

export interface IPaymentHistory {
  status: PaymentStatus;
  amount: number;
  reference?: string;
  recordedBy?: { name: string; role: string };
  note?: string;
  timestamp: string;
}

export interface IOrder {
  _id: string;
  orderNumber: string;
  shopId: any;
  customerId: any;
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
  items: IOrderItem[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  grandTotal: number;
  currency: string;
  currencySymbol: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  customerNotes?: string;
  internalNotes?: string;
  statusHistory: IOrderStatusHistory[];
  paymentHistory: IPaymentHistory[];
  whatsappHandoffInitiated?: boolean;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
}

// ==========================================
// FORM BUILDER TYPES
// ==========================================
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
  fieldKey: string;
  label: string;
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
  visibleOnCard: boolean;
  visibleOnDetails: boolean;
  searchable: boolean;
  filterable: boolean;
  isPublic: boolean;
  editableByShopAdmin: boolean;
  displayOrder: number;
}

export interface IProductFormVersion {
  _id: string;
  templateId: string;
  versionNumber: number;
  status: 'draft' | 'published';
  fields: IFormFieldConfig[];
  publishedAt?: string;
  createdBy?: any;
  changeSummary?: string;
  createdAt?: string;
}

export interface IProductFormTemplate {
  _id: string;
  name: string;
  description: string;
  isPlatformDefault: boolean;
  assignedShopIds: any[];
  status: 'draft' | 'published' | 'archived';
  currentPublishedVersionId?: any;
  latestDraftVersionId?: any;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// SUBSCRIPTION TYPES
// ==========================================
export type BillingInterval = 'monthly' | 'quarterly' | 'yearly' | 'one-time';

export interface ISubscriptionPlan {
  _id: string;
  name: string;
  code: string;
  description: string;
  price: number;
  currency: string;
  billingInterval: BillingInterval;
  trialDays: number;
  maxProducts: number;
  maxCategories: number;
  maxAdmins: number;
  allowCustomProductFields: boolean;
  allowAnalytics: boolean;
  allowExportInvoices: boolean;
  allowOnlineOrdering: boolean;
  isActive: boolean;
  displayOrder: number;
  features: string[];
  createdAt?: string;
}

export interface ISubscriptionPayment {
  _id?: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string;
  notes?: string;
  recordedBy?: any;
}

export interface IShopSubscription {
  _id: string;
  shopId: any;
  planId: any;
  status: 'trialing' | 'active' | 'past_due' | 'expired' | 'cancelled' | 'suspended';
  startDate: string;
  endDate: string;
  trialEndsAt?: string;
  autoRenew: boolean;
  payments: ISubscriptionPayment[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IShopSubscriptionDetails {
  subscription: IShopSubscription | null;
  plan: ISubscriptionPlan | null;
  isCompliant: boolean;
  status: string;
  daysRemaining: number;
  usage: {
    productCount: number;
    maxProducts: number;
    categoryCount: number;
    maxCategories: number;
  };
  permissions: {
    allowCustomProductFields: boolean;
    allowAnalytics: boolean;
    allowExportInvoices: boolean;
    allowOnlineOrdering: boolean;
  };
}
