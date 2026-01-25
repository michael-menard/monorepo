/**
 * Zod Input Schemas for CRUD Operations
 *
 * All CRUD operation inputs are validated using these schemas
 * before any side effects occur.
 *
 * @see KNOW-003 for validation requirements
 */

import { z } from 'zod'
import { KnowledgeRoleSchema } from '../__types__/index.js'

/**
 * Maximum content length in characters.
 *
 * OpenAI text-embedding-3-small supports up to 8191 tokens.
 * With an average of ~4 characters per token, 30000 characters
 * provides a safety margin.
 */
export const MAX_CONTENT_LENGTH = 30000

/**
 * Schema for kb_add input.
 *
 * @example
 * ```typescript
 * const input = KbAddInputSchema.parse({
 *   content: 'Use Zod for validation',
 *   role: 'dev',
 *   tags: ['typescript', 'best-practice']
 * })
 * ```
 */
export const KbAddInputSchema = z.object({
  /** Knowledge content text (1-30000 characters) */
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(MAX_CONTENT_LENGTH, `Content cannot exceed ${MAX_CONTENT_LENGTH} characters`),

  /** Role this knowledge is relevant for */
  role: KnowledgeRoleSchema,

  /** Optional tags for categorization */
  tags: z.array(z.string()).optional().nullable(),
})

export type KbAddInput = z.infer<typeof KbAddInputSchema>

/**
 * Schema for kb_get input.
 *
 * @example
 * ```typescript
 * const input = KbGetInputSchema.parse({
 *   id: '123e4567-e89b-12d3-a456-426614174000'
 * })
 * ```
 */
export const KbGetInputSchema = z.object({
  /** UUID of the knowledge entry to retrieve */
  id: z.string().uuid('Invalid UUID format'),
})

export type KbGetInput = z.infer<typeof KbGetInputSchema>

/**
 * Schema for kb_update input.
 *
 * At least one field (content, role, or tags) must be provided.
 * Undefined fields are not modified.
 *
 * @example
 * ```typescript
 * // Update content only
 * const input = KbUpdateInputSchema.parse({
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   content: 'Updated content'
 * })
 *
 * // Update tags only
 * const input = KbUpdateInputSchema.parse({
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   tags: ['new-tag']
 * })
 * ```
 */
export const KbUpdateInputSchema = z
  .object({
    /** UUID of the knowledge entry to update */
    id: z.string().uuid('Invalid UUID format'),

    /** New content (triggers re-embedding if different from existing) */
    content: z
      .string()
      .min(1, 'Content cannot be empty')
      .max(MAX_CONTENT_LENGTH, `Content cannot exceed ${MAX_CONTENT_LENGTH} characters`)
      .optional(),

    /** New role */
    role: KnowledgeRoleSchema.optional(),

    /** New tags (null clears tags, undefined leaves unchanged) */
    tags: z.array(z.string()).optional().nullable(),
  })
  .refine(
    data => data.content !== undefined || data.role !== undefined || data.tags !== undefined,
    {
      message: 'At least one field (content, role, or tags) must be provided for update',
    },
  )

export type KbUpdateInput = z.infer<typeof KbUpdateInputSchema>

/**
 * Schema for kb_delete input.
 *
 * @example
 * ```typescript
 * const input = KbDeleteInputSchema.parse({
 *   id: '123e4567-e89b-12d3-a456-426614174000'
 * })
 * ```
 */
export const KbDeleteInputSchema = z.object({
  /** UUID of the knowledge entry to delete */
  id: z.string().uuid('Invalid UUID format'),
})

export type KbDeleteInput = z.infer<typeof KbDeleteInputSchema>

/**
 * Schema for kb_list input.
 *
 * All fields are optional. Defaults:
 * - limit: 10
 * - role: undefined (no filter)
 * - tags: undefined (no filter)
 *
 * @example
 * ```typescript
 * // List all entries (default limit 10)
 * const input = KbListInputSchema.parse({})
 *
 * // List dev entries with limit
 * const input = KbListInputSchema.parse({
 *   role: 'dev',
 *   limit: 20
 * })
 *
 * // List entries with any of the specified tags
 * const input = KbListInputSchema.parse({
 *   tags: ['typescript', 'best-practice']
 * })
 * ```
 */
export const KbListInputSchema = z
  .object({
    /** Filter by role */
    role: KnowledgeRoleSchema.optional(),

    /** Filter by tags (ANY match - entries with at least one matching tag) */
    tags: z.array(z.string()).optional(),

    /** Maximum number of results (1-100, default 10) */
    limit: z.number().int().positive().max(100).default(10),
  })
  .optional()

export type KbListInput = z.infer<typeof KbListInputSchema>
