import { z } from 'zod'

// Image schema for a set
export const SetImageSchema = z.object({
  id: z.string().uuid(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().nullable().optional(),
  position: z.number().int().nonnegative(),
})

export const SetSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  type: z.literal('set'),
  title: z.string(),
  description: z.string().nullable().optional(),
  theme: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),

  partsCount: z.number().int().nullable().optional(),
  isBuilt: z.boolean().default(false),
  quantity: z.number().int().min(1).default(1),

  brand: z.string().nullable().optional(),
  setNumber: z.string().nullable().optional(),
  releaseYear: z.number().int().nullable().optional(),
  retired: z.boolean().nullable().optional(),

  store: z.string().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  purchasePrice: z.string().nullable().optional(),
  tax: z.string().nullable().optional(),
  shipping: z.string().nullable().optional(),
  purchaseDate: z.string().datetime().nullable().optional(),
  wishlistItemId: z.string().uuid().nullable().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  images: z.array(SetImageSchema).default([]),
})

export type Set = z.infer<typeof SetSchema>

export const SetListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  theme: z.string().optional(),
  isBuilt: z
    .union([z.literal('true'), z.literal('false')])
    .transform(v => v === 'true')
    .optional(),
  tags: z
    .string()
    .transform(s => s.split(',').map(t => t.trim()).filter(Boolean))
    .optional(),
  sortField: z
    .enum(['title', 'partsCount', 'purchaseDate', 'purchasePrice', 'createdAt'])
    .default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
})

export type SetListQuery = z.infer<typeof SetListQuerySchema>

export const SetListResponseSchema = z.object({
  items: z.array(SetSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
  filters: z.object({
    availableThemes: z.array(z.string()),
    availableTags: z.array(z.string()),
  }),
})

export type SetListResponse = z.infer<typeof SetListResponseSchema>

export const CreateSetSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    theme: z.string().optional(),
    tags: z.array(z.string()).optional(),
    partsCount: z.number().int().positive().optional(),
    isBuilt: z.boolean().optional(),
    quantity: z.number().int().min(1).optional(),
    brand: z.string().optional(),
    setNumber: z.string().optional(),
    releaseYear: z.number().int().optional(),
    retired: z.boolean().optional(),
    store: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    purchasePrice: z.string().optional(),
    tax: z.string().optional(),
    shipping: z.string().optional(),
    purchaseDate: z.string().datetime().optional(),
  })

export type CreateSetInput = z.infer<typeof CreateSetSchema>

export const UpdateSetSchema = CreateSetSchema.partial()

export type UpdateSetInput = z.infer<typeof UpdateSetSchema>

export const PresignImageSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
})

export const RegisterImageSchema = z.object({
  imageUrl: z.string().url(),
  key: z.string().min(1),
  thumbnailUrl: z.string().url().optional(),
})
