import { z } from 'zod';
import { config } from '../config';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createShopSchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters').max(120),
  businessName: z.string().max(150).optional().or(z.literal('')),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(60)
    .regex(slugRegex, 'Slug must only contain lowercase alphanumeric characters and single hyphens')
    .refine((slug) => !config.reservedSlugs.includes(slug), {
      message: 'This slug is reserved by the system and cannot be used',
    }),
  description: z.string().max(1000).optional().or(z.literal('')),
  businessCategory: z.string().max(100).optional().or(z.literal('')),
  gstNumber: z.string().max(30).optional().or(z.literal('')),
  logo: z.string().optional().or(z.literal('')),
  banner: z.string().optional().or(z.literal('')),
  contactPhone: z.string().optional().or(z.literal('')),
  whatsappNumber: z
    .string()
    .min(7, 'WhatsApp number is required')
    .regex(/^\+?[1-9]\d{6,14}$/, 'WhatsApp number must be a valid international number with country code'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z
    .object({
      addressLine1: z.string().optional().or(z.literal('')),
      addressLine2: z.string().optional().or(z.literal('')),
      street: z.string().optional().or(z.literal('')),
      city: z.string().optional().or(z.literal('')),
      district: z.string().optional().or(z.literal('')),
      state: z.string().optional().or(z.literal('')),
      postalCode: z.string().optional().or(z.literal('')),
      country: z.string().default('India'),
    })
    .optional(),
  businessHours: z.string().optional().or(z.literal('')),
  socialLinks: z
    .object({
      facebook: z.string().optional().or(z.literal('')),
      instagram: z.string().optional().or(z.literal('')),
      twitter: z.string().optional().or(z.literal('')),
      website: z.string().optional().or(z.literal('')),
    })
    .optional(),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/, 'Accent color must be a valid 6-character hex code').default('#2563eb'),
  adminName: z.string().min(2, 'Admin name is required'),
  adminEmail: z.string().email('Invalid admin email address').toLowerCase().trim(),
  adminPhone: z.string().optional().or(z.literal('')),
  adminPassword: z.string().min(8, 'Admin password must be at least 8 characters'),

  // Subscription plan & payment fields
  planId: z.string().optional(),
  billingAmount: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  paymentStatus: z.enum(['paid', 'pending']).optional(),
  paymentMethod: z.enum(['bank_transfer', 'upi', 'cash', 'card', 'cheque', 'other']).optional(),
  transactionReference: z.string().optional().or(z.literal('')),
  paymentNotes: z.string().optional().or(z.literal('')),
  startDate: z.string().optional(),
});

export const updateShopSchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters').max(120).optional(),
  businessName: z.string().max(150).optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
  ownerName: z.string().max(100).optional().or(z.literal('')),
  businessCategory: z.string().max(100).optional().or(z.literal('')),
  gstNumber: z.string().max(30).optional().or(z.literal('')),
  logo: z.string().optional().or(z.literal('')),
  banner: z.string().optional().or(z.literal('')),
  contactPhone: z.string().optional().or(z.literal('')),
  whatsappNumber: z
    .string()
    .min(7)
    .regex(/^(?:(?:\+|0{0,2})91[\s-]?)?[6-9]\d{9}$|^\+?[1-9]\d{6,14}$/, 'WhatsApp number must be a valid mobile number')
    .optional(),
  whatsappCheckoutEnabled: z.boolean().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  address: z
    .object({
      addressLine1: z.string().optional().or(z.literal('')),
      addressLine2: z.string().optional().or(z.literal('')),
      street: z.string().optional().or(z.literal('')),
      city: z.string().optional().or(z.literal('')),
      district: z.string().optional().or(z.literal('')),
      state: z.string().optional().or(z.literal('')),
      postalCode: z.string().optional().or(z.literal('')),
      country: z.string().optional().or(z.literal('')),
    })
    .optional(),
  businessHours: z.string().optional().or(z.literal('')),
  socialLinks: z
    .object({
      facebook: z.string().optional().or(z.literal('')),
      instagram: z.string().optional().or(z.literal('')),
      twitter: z.string().optional().or(z.literal('')),
      website: z.string().optional().or(z.literal('')),
    })
    .optional(),
  branding: z
    .object({
      primaryColor: z.string().regex(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/, 'Invalid hex color').optional(),
      secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/, 'Invalid hex color').optional(),
      accentColor: z.string().regex(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/, 'Invalid hex color').optional(),
      buttonColor: z.string().regex(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/, 'Invalid hex color').optional(),
      backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/, 'Invalid hex color').optional(),
      textColor: z.string().regex(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/, 'Invalid hex color').optional(),
    })
    .optional(),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/, 'Invalid hex color').optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
});

export const updateBrandingSchema = z.object({
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/, 'Invalid hex color'),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/, 'Invalid hex color').optional(),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/, 'Invalid hex color').optional(),
  buttonColor: z.string().regex(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/, 'Invalid hex color').optional(),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/, 'Invalid hex color').optional(),
  textColor: z.string().regex(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/, 'Invalid hex color').optional(),
});

export const updateAccountSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password confirmation must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match',
  path: ['confirmPassword'],
});
