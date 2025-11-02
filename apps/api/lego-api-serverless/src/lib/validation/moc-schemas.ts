/**
 * Zod Validation Schemas for MOC Instructions API
 */

import { z } from 'zod'

/**
 * MOC Type Enum
 */
export const MocTypeSchema = z.enum(['moc', 'set'])

/**
 * Difficulty Level Enum
 */
export const DifficultySchema = z.enum(['beginner', 'intermediate', 'advanced', 'expert'])

/**
 * File Type Enum
 */
export const FileTypeSchema = z.enum(['instruction', 'parts-list', 'thumbnail', 'gallery-image'])

/**
 * Create MOC Request Schema
 */
export const CreateMocSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  type: MocTypeSchema,
  difficulty: DifficultySchema.optional(),
  pieceCount: z.number().int().positive().optional(),
  estimatedCost: z.string().regex(/^\d+(\.\d{2})?$/, 'Invalid cost format').optional(),
  timeToComplete: z.number().int().positive().optional(),
  isPublic: z.boolean().default(true),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').default([]),
})

/**
 * Update MOC Request Schema (all fields optional for PATCH)
 */
export const UpdateMocSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  difficulty: DifficultySchema.optional(),
  pieceCount: z.number().int().positive().optional(),
  estimatedCost: z.string().regex(/^\d+(\.\d{2})?$/).optional(),
  timeToComplete: z.number().int().positive().optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).max(10).optional(),
})

/**
 * Query Parameters Schema for List MOCs
 */
export const ListMocsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1, 'Page must be >= 1')),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100, 'Limit must be between 1 and 100')),
  search: z.string().max(200).optional(),
  tag: z.string().max(50).optional(),
})

/**
 * File Upload Metadata Schema
 */
export const FileUploadMetadataSchema = z.object({
  fileType: FileTypeSchema,
  mimeType: z.string(),
  size: z.number().int().positive().max(10485760, 'File size must be less than 10MB'),
  filename: z.string().min(1, 'Filename is required'),
})

/**
 * Path Parameter Schemas
 */
export const MocIdSchema = z.object({
  id: z.string().uuid('Invalid MOC ID format').or(z.string().min(1)),
})

/**
 * Validate and transform function
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data)
}
