import { z } from 'zod';

export const checkoutSchema = z.object({
  deliveryAddress: z.object({
    fullName: z.string().min(2, 'Recipient full name is required'),
    phone: z.string().min(7, 'Phone number is required'),
    businessName: z.string().optional(),
    street: z.string().min(3, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    postalCode: z.string().min(3, 'Postal code is required'),
    country: z.string().default('India'),
  }),
  customerNotes: z.string().max(1000).optional(),
  idempotencyKey: z.string().optional(),
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
