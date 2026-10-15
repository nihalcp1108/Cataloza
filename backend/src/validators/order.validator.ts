import { z } from 'zod';

const indianPhoneRegex = /^(?:(?:\+|0{0,2})91[\s-]?)?[6-9]\d{9}$/;
const indianPinRegex = /^[1-9][0-9]{5}$/;

export const guestCheckoutSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  phone: z
    .string()
    .trim()
    .regex(indianPhoneRegex, 'Please enter a valid 10-digit Indian mobile number'),
  whatsapp: z
    .string()
    .trim()
    .regex(indianPhoneRegex, 'Please enter a valid WhatsApp mobile number')
    .optional()
    .or(z.literal('')),
  businessName: z
    .string()
    .trim()
    .max(120, 'Business name cannot exceed 120 characters')
    .optional()
    .or(z.literal('')),
  addressLine1: z
    .string()
    .trim()
    .min(3, 'Address line 1 / Building name is required')
    .max(250, 'Address line 1 cannot exceed 250 characters')
    .optional(),
  street: z
    .string()
    .trim()
    .min(3, 'Address line 1 / Street is required')
    .max(250)
    .optional(),
  addressLine2: z
    .string()
    .trim()
    .max(250, 'Address line 2 cannot exceed 250 characters')
    .optional()
    .or(z.literal('')),
  city: z
    .string()
    .trim()
    .min(2, 'City / Town is required')
    .max(80, 'City cannot exceed 80 characters'),
  district: z
    .string()
    .trim()
    .min(2, 'District is required')
    .max(80, 'District cannot exceed 80 characters'),
  state: z
    .string()
    .trim()
    .min(2, 'State is required')
    .max(80, 'State cannot exceed 80 characters'),
  postalCode: z
    .string()
    .trim()
    .regex(indianPinRegex, 'Please enter a valid 6-digit Indian PIN code'),
  country: z.string().trim().default('India').optional(),
  customerNotes: z.string().trim().max(1000, 'Order notes cannot exceed 1000 characters').optional().or(z.literal('')),
  idempotencyKey: z.string().trim().max(120).optional().or(z.literal('')),
  deliveryAddress: z.any().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        variantName: z.string().optional(),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      })
    )
    .optional(),
}).refine((data) => Boolean(data.addressLine1 || data.street || (data.deliveryAddress && (data.deliveryAddress.addressLine1 || data.deliveryAddress.street))), {
  message: 'Address line 1 / Building name is required',
  path: ['addressLine1'],
});

export const checkoutSchema = z.object({
  deliveryAddress: z.object({
    fullName: z.string().trim().min(2, 'Recipient full name is required'),
    phone: z.string().trim().regex(indianPhoneRegex, 'Valid mobile number is required'),
    whatsapp: z.string().trim().optional(),
    businessName: z.string().trim().optional(),
    addressLine1: z.string().trim().min(3).optional(),
    addressLine2: z.string().trim().optional(),
    street: z.string().trim().min(3).optional(),
    city: z.string().trim().min(2, 'City is required'),
    district: z.string().trim().min(2).optional(),
    state: z.string().trim().min(2, 'State is required'),
    postalCode: z.string().trim().regex(indianPinRegex, 'Valid 6-digit PIN code is required'),
    country: z.string().trim().default('India'),
  }).refine((data) => Boolean(data.addressLine1 || data.street), {
    message: 'Address line 1 or street address is required',
    path: ['addressLine1'],
  }),
  customerNotes: z.string().trim().max(1000).optional(),
  idempotencyKey: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantName: z.string().optional(),
        quantity: z.number().int().min(1),
      })
    )
    .optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pending',
    'confirmed',
    'processing',
    'ready_for_dispatch',
    'shipped',
    'delivered',
    'cancelled',
  ]),
  note: z.string().max(500).optional(),
  cancellationReason: z.string().max(500).optional(),
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum(['unpaid', 'partially_paid', 'paid', 'refunded']),
  amount: z.number().min(0, 'Payment amount must be positive'),
  reference: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
});

export const addOrderNoteSchema = z.object({
  internalNotes: z.string().min(1).max(2000),
});
