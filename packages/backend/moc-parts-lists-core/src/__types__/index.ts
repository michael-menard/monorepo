/**
 * Internal Types for MOC Parts Lists Core Package
 *
 * Zod schemas for MOC parts lists data structures used by core functions.
 */

import { z } from 'zod'

// ============================================================
// PART SCHEMAS
// ============================================================

/**
 * Part Input Schema (for creating parts)
 */
export const PartInputSchema = z.object({
  partId: z.string().min(1, 'Part ID is required'),
  partName: z.string().min(1, 'Part name is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  color: z.string().min(1, 'Color is required'),
})

export type PartInput = z.infer<typeof PartInputSchema>

/**
 * Part Schema (API response format)
 */
export const PartSchema = z.object({
  id: z.string().uuid(),
  partsListId: z.string().uuid(),
  partId: z.string(),
  partName: z.string(),
  quantity: z.number().int(),
  color: z.string(),
  createdAt: z.string(), // ISO date string
})

export type Part = z.infer<typeof PartSchema>

/**
 * Part Row Schema (DB row format)
 */
export const PartRowSchema = z.object({
  id: z.string().uuid(),
  partsListId: z.string().uuid(),
  partId: z.string(),
  partName: z.string(),
  quantity: z.number().int(),
  color: z.string(),
  createdAt: z.date(),
})

export type PartRow = z.infer<typeof PartRowSchema>

// ============================================================
// PARTS LIST SCHEMAS
// ============================================================

/**
 * Parts List Schema (API response format)
 */
export const PartsListSchema = z.object({
  id: z.string().uuid(),
  mocId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  built: z.boolean(),
  purchased: z.boolean(),
  notes: z.string().nullable(),
  costEstimate: z.string().nullable(),
  actualCost: z.string().nullable(),
  totalPartsCount: z.string().nullable(),
  acquiredPartsCount: z.string().nullable(),
  createdAt: z.string(), // ISO date string
  updatedAt: z.string(), // ISO date string
})

export type PartsList = z.infer<typeof PartsListSchema>

/**
 * Parts List with Parts Schema (for GET responses)
 */
export const PartsListWithPartsSchema = PartsListSchema.extend({
  parts: z.array(PartSchema),
})

export type PartsListWithParts = z.infer<typeof PartsListWithPartsSchema>

/**
 * Parts List Row Schema (DB row format)
 */
export const PartsListRowSchema = z.object({
  id: z.string().uuid(),
  mocId: z.string().uuid(),
  fileId: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  built: z.boolean().nullable(),
  purchased: z.boolean().nullable(),
  inventoryPercentage: z.string().nullable(),
  totalPartsCount: z.string().nullable(),
  acquiredPartsCount: z.string().nullable(),
  costEstimate: z.string().nullable(),
  actualCost: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type PartsListRow = z.infer<typeof PartsListRowSchema>

// ============================================================
// CREATE PARTS LIST SCHEMAS
// ============================================================

/**
 * Create Parts List Input Schema
 *
 * Validation for creating a new parts list.
 * - title: Required, non-empty string, max 200 chars
 * - description: Optional string, max 2000 chars
 * - built: Optional boolean, defaults to false
 * - purchased: Optional boolean, defaults to false
 * - parts: Optional array of initial parts
 */
export const CreatePartsListInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .nullable(),
  built: z.boolean().optional(),
  purchased: z.boolean().optional(),
  parts: z.array(PartInputSchema).optional(),
})

export type CreatePartsListInput = z.infer<typeof CreatePartsListInputSchema>

// ============================================================
// UPDATE PARTS LIST SCHEMAS
// ============================================================

/**
 * Update Parts List Input Schema
 *
 * Validation for updating parts list metadata.
 * All fields are optional (patch semantics).
 */
export const UpdatePartsListInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  costEstimate: z.string().max(50).nullable().optional(),
  actualCost: z.string().max(50).nullable().optional(),
})

export type UpdatePartsListInput = z.infer<typeof UpdatePartsListInputSchema>

/**
 * Update Parts List Status Input Schema
 *
 * Validation for updating built/purchased flags.
 */
export const UpdatePartsListStatusInputSchema = z.object({
  built: z.boolean().optional(),
  purchased: z.boolean().optional(),
})

export type UpdatePartsListStatusInput = z.infer<typeof UpdatePartsListStatusInputSchema>

// ============================================================
// CSV PARSE SCHEMAS
// ============================================================

/**
 * CSV Row Schema (parsed from CSV)
 */
export const CsvRowSchema = z.object({
  'Part ID': z.string().min(1, 'Part ID is required'),
  'Part Name': z.string().min(1, 'Part Name is required'),
  Quantity: z.string().regex(/^\d+$/, 'Quantity must be a positive integer'),
  Color: z.string().min(1, 'Color is required'),
})

export type CsvRow = z.infer<typeof CsvRowSchema>

/**
 * Parse CSV Input Schema
 */
export const ParseCsvInputSchema = z.object({
  csvContent: z.string().min(1, 'CSV content is required'),
})

export type ParseCsvInput = z.infer<typeof ParseCsvInputSchema>

/**
 * Parse CSV Result Schema
 */
export const ParseCsvResultSchema = z.object({
  partsListId: z.string().uuid(),
  totalParts: z.number().int(),
  rowsProcessed: z.number().int(),
})

export type ParseCsvResult = z.infer<typeof ParseCsvResultSchema>

// ============================================================
// USER SUMMARY SCHEMAS
// ============================================================

/**
 * User Summary Schema (aggregated stats)
 */
export const UserSummarySchema = z.object({
  totalLists: z.number().int(),
  totalParts: z.number().int(),
  listsBuilt: z.number().int(),
  listsPurchased: z.number().int(),
})

export type UserSummary = z.infer<typeof UserSummarySchema>

// ============================================================
// MOC INSTRUCTION SCHEMAS (for ownership verification)
// ============================================================

/**
 * MOC Instruction Row Schema (minimal, for ownership check)
 */
export const MocInstructionRowSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
})

export type MocInstructionRow = z.infer<typeof MocInstructionRowSchema>
