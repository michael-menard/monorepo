import { z } from 'zod';

export const WishlistItemSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  productLink: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  category: z.string().min(1).max(50),
  sortOrder: z.number().int().min(0),
});
