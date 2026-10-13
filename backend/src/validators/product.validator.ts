import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name is required').max(200),
  sku: z.string().min(1, 'SKU is required').max(50).toUpperCase(),
  description: z.string().max(4000).default(''),
  categoryId: z.string().min(1, 'Category is required'),
  images: z.array(z.string()).default([]),
  price: z.number().min(0, 'Price must be non-negative'),
  compareAtPrice: z.number().min(0).optional(),
  unit: z.string().default('piece'),
  minimumOrderQuantity: z.number().int().min(1).default(1),
  trackInventory: z.boolean().default(false),
  stockQuantity: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        sku: z.string().optional(),
        price: z.number().min(0),
        stockQuantity: z.number().int().min(0).optional(),
      })
    )
    .default([]),
});

export const updateProductSchema = createProductSchema.partial();
