import { z } from 'zod'

/**
 * Parts Lists Domain Types
 *
 * Zod schemas for validation + type inference
 */

// ─────────────────────────────────────────────────────────────────────────
// Parts List Types
// ─────────────────────────────────────────────────────────────────────────

export const PartsListSchema = z.object({
  id: z.string().uuid(),
  mocId: z.string().uuid(),
  fileId: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  built: z.boolean(),
  purchased: z.boolean(),
  inventoryPercentage: z.string().nullable(),
  totalPartsCount: z.string().nullable(),
  acquiredPartsCount: z.string().nullable(),
  costEstimate: z.string().nullable(),
  actualCost: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type PartsList = z.infer<typeof PartsListSchema>

export const CreatePartsListInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
})

export type CreatePartsListInput = z.infer<typeof CreatePartsListInputSchema>

export const UpdatePartsListInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  built: z.boolean().optional(),
  purchased: z.boolean().optional(),
  costEstimate: z.string().optional(),
  actualCost: z.string().optional(),
})

export type UpdatePartsListInput = z.infer<typeof UpdatePartsListInputSchema>

export const ListPartsListsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListPartsListsQuery = z.infer<typeof ListPartsListsQuerySchema>

// ─────────────────────────────────────────────────────────────────────────
// Part Types
// ─────────────────────────────────────────────────────────────────────────

export const PartSchema = z.object({
  id: z.string().uuid(),
  partsListId: z.string().uuid(),
  partId: z.string(),
  partName: z.string(),
  quantity: z.number().int(),
  color: z.string(),
  createdAt: z.date(),
})

export type Part = z.infer<typeof PartSchema>

export const CreatePartInputSchema = z.object({
  partId: z.string().min(1, 'Part ID is required'),
  partName: z.string().min(1, 'Part name is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  color: z.string().min(1, 'Color is required'),
})

export type CreatePartInput = z.infer<typeof CreatePartInputSchema>

export const UpdatePartInputSchema = z.object({
  partName: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
  color: z.string().min(1).optional(),
})

export type UpdatePartInput = z.infer<typeof UpdatePartInputSchema>

export const BulkCreatePartsInputSchema = z.object({
  parts: z.array(CreatePartInputSchema),
})

export type BulkCreatePartsInput = z.infer<typeof BulkCreatePartsInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Parts List with Parts
// ─────────────────────────────────────────────────────────────────────────

export const PartsListWithPartsSchema = PartsListSchema.extend({
  parts: z.array(PartSchema),
})

export type PartsListWithParts = z.infer<typeof PartsListWithPartsSchema>

// ─────────────────────────────────────────────────────────────────────────
// Status Types
// ─────────────────────────────────────────────────────────────────────────

export const PartsListStatusSchema = z.enum(['planning', 'in_progress', 'completed'])

export type PartsListStatus = z.infer<typeof PartsListStatusSchema>

export const UpdateStatusInputSchema = z.object({
  status: PartsListStatusSchema,
})

export type UpdateStatusInput = z.infer<typeof UpdateStatusInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Summary Types
// ─────────────────────────────────────────────────────────────────────────

export const UserSummarySchema = z.object({
  totalPartsLists: z.number().int(),
  byStatus: z.object({
    planning: z.number().int(),
    in_progress: z.number().int(),
    completed: z.number().int(),
  }),
  totalParts: z.number().int(),
  totalAcquiredParts: z.number().int(),
  completionPercentage: z.number().int(),
})

export type UserSummary = z.infer<typeof UserSummarySchema>

// ─────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────

export type PartsListError =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'MOC_NOT_FOUND'
  | 'PARTS_LIST_NOT_FOUND'
  | 'PART_NOT_FOUND'
  | 'DB_ERROR'
  | 'VALIDATION_ERROR'
