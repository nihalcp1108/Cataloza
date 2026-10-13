import { z } from 'zod';
import { config } from '../config';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createShopSchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters').max(120),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(60)
    .regex(slugRegex, 'Slug must only contain lowercase alphanumeric characters and single hyphens')
    .refine((slug) => !config.reservedSlugs.includes(slug), {
      message: 'This slug is reserved by the system and cannot be used',
    }),
  description: z.string().max(1000).optional(),
  logo: z.string().optional(),
  banner: z.string().optional(),
  contactPhone: z.string().optional(),
  whatsappNumber: z
    .string()
    .min(7, 'WhatsApp number is required')
    .regex(/^\+?[1-9]\d{6,14}$/, 'WhatsApp number must be a valid international number with country code'),
  email: z.string().email('Invalid email address').optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().default('India'),
    })
    .optional(),
  businessHours: z.string().optional(),
  socialLinks: z
    .object({
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      twitter: z.string().optional(),
      website: z.string().optional(),
    })
    .optional(),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/, 'Accent color must be a valid 6-character hex code').default('#2563eb'),
  adminName: z.string().min(2, 'Admin name is required'),
  adminEmail: z.string().email('Invalid admin email address').toLowerCase().trim(),
  adminPhone: z.string().optional(),
  adminPassword: z.string().min(8, 'Admin password must be at least 8 characters'),
});

export const updateShopSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(1000).optional(),
  logo: z.string().optional(),
  banner: z.string().optional(),
  contactPhone: z.string().optional(),
  whatsappNumber: z
    .string()
    .min(7)
    .regex(/^\+?[1-9]\d{6,14}$/, 'WhatsApp number must be a valid international number with country code')
    .optional(),
  email: z.string().email().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  businessHours: z.string().optional(),
  socialLinks: z
    .object({
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      twitter: z.string().optional(),
      website: z.string().optional(),
    })
    .optional(),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/, 'Invalid hex color').optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
});
