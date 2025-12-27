/**
 * Edit MOC Types
 *
 * Story 3.1.40: Zod schemas for MOC edit page data fetching.
 * Used by main-app and API for consistent type definitions.
 */

import { z } from 'zod'
import { FileCategorySchema } from './upload'

/**
 * MOC status enum
 */
export const MocStatusSchema = z.enum(['draft', 'published', 'archived', 'pending_review'])

export type MocStatus = z.infer<typeof MocStatusSchema>

/**
 * File item schema for edit page - represents an existing file attached to a MOC
 */
export const MocFileItemSchema = z.object({
  /** Unique file ID */
  id: z.string(),
  /** File category */
  category: FileCategorySchema,
  /** Original filename */
  filename: z.string(),
  /** File size in bytes */
  size: z.number().nonnegative(),
  /** MIME type */
  mimeType: z.string(),
  /** Presigned URL for download/preview */
  url: z.string().url(),
  /** Upload timestamp */
  uploadedAt: z.string().datetime(),
})

export type MocFileItem = z.infer<typeof MocFileItemSchema>

/**
 * MOC for edit response schema - data returned by GET /mocs/:mocId/edit
 */
export const MocForEditResponseSchema = z.object({
  /** MOC ID */
  id: z.string().uuid(),
  /** MOC title */
  title: z.string().min(1),
  /** MOC description */
  description: z.string().nullable(),
  /** URL slug for the MOC */
  slug: z.string().nullable(),
  /** Tags array */
  tags: z.array(z.string()).nullable(),
  /** Theme/category */
  theme: z.string().nullable(),
  /** Publication status */
  status: MocStatusSchema,
  /** Whether current user is the owner */
  isOwner: z.boolean(),
  /** Attached files */
  files: z.array(MocFileItemSchema),
  /** Creation timestamp */
  createdAt: z.string().datetime().optional(),
  /** Last update timestamp */
  updatedAt: z.string().datetime().optional(),
})

export type MocForEditResponse = z.infer<typeof MocForEditResponseSchema>

/**
 * Edit MOC request schema - data sent to PATCH /mocs/:mocId
 */
export const EditMocRequestSchema = z.object({
  /** Updated title */
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title must be at most 120 characters')
    .optional(),
  /** Updated description */
  description: z.string().max(2000, 'Description must be at most 2000 characters').optional(),
  /** Updated tags */
  tags: z.array(z.string().max(50)).max(10).optional(),
  /** Updated theme */
  theme: z.string().max(100).optional(),
  /** Updated slug */
  slug: z.string().max(120).optional(),
})

export type EditMocRequest = z.infer<typeof EditMocRequestSchema>

/**
 * Edit MOC form schema - used for form validation in the frontend
 * Slightly different from request schema to handle form input (e.g., tags as comma-separated string)
 */
export const EditMocFormSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title must be at most 120 characters'),
  description: z.string().max(2000, 'Description must be at most 2000 characters').optional(),
  tags: z.string().max(500).optional(), // Comma-separated string for form input
  theme: z.string().max(100).optional(),
  slug: z.string().max(120).optional(),
})

export type EditMocFormInput = z.infer<typeof EditMocFormSchema>

/**
 * Convert form input to API request format
 */
export const formToEditRequest = (form: EditMocFormInput): EditMocRequest => ({
  title: form.title,
  description: form.description || undefined,
  tags: form.tags
    ? form.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)
    : undefined,
  theme: form.theme || undefined,
  slug: form.slug || undefined,
})

/**
 * Convert API response to form input format
 */
export const responseToFormInput = (moc: MocForEditResponse): EditMocFormInput => ({
  title: moc.title,
  description: moc.description ?? '',
  tags: moc.tags?.join(', ') ?? '',
  theme: moc.theme ?? '',
  slug: moc.slug ?? '',
})
