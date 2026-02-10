/**
 * Zod Input Schemas for CRUD Operations
 *
 * All CRUD operation inputs are validated using these schemas
 * before any side effects occur.
 *
 * @see KNOW-003 for validation requirements
 */

import { z } from 'zod'
import { KnowledgeRoleSchema, KnowledgeEntryTypeSchema } from '../__types__/index.js'

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
 *
 * @example with entry_type and story_id
 * ```typescript
 * const input = KbAddInputSchema.parse({
 *   content: 'Decision: Use server-side image processing',
 *   role: 'dev',
 *   entry_type: 'decision',
 *   story_id: 'WISH-2045',
 *   tags: ['architecture', 'images']
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

  /**
   * Type of knowledge entry (optional, defaults to 'note').
   * Values: 'note', 'decision', 'constraint', 'runbook', 'lesson'
   */
  entry_type: KnowledgeEntryTypeSchema.optional(),

  /**
   * Optional story ID this entry is linked to.
   * Examples: 'WISH-2045', 'KBMEM-001'
   */
  story_id: z.string().optional().nullable(),

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
 * At least one modifiable field must be provided.
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
 *
 * // Mark as verified
 * const input = KbUpdateInputSchema.parse({
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   verified: true,
 *   verified_by: 'qa-gate:WISH-2045'
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

    /** New entry type */
    entry_type: KnowledgeEntryTypeSchema.optional(),

    /** New story ID (null clears, undefined leaves unchanged) */
    story_id: z.string().optional().nullable(),

    /** New tags (null clears tags, undefined leaves unchanged) */
    tags: z.array(z.string()).optional().nullable(),

    /** Update verification status */
    verified: z.boolean().optional(),

    /** Who verified the entry */
    verified_by: z.string().optional().nullable(),

    /** Mark entry as archived (superseded by a canonical entry) */
    archived: z.boolean().optional(),

    /** Timestamp when the entry was archived */
    archived_at: z.date().optional().nullable(),

    /** UUID of the canonical entry that replaced this archived entry */
    canonical_id: z.string().uuid().optional().nullable(),

    /** Whether this entry is a canonical (merged) entry from compression */
    is_canonical: z.boolean().optional(),
  })
  .refine(
    data =>
      data.content !== undefined ||
      data.role !== undefined ||
      data.entry_type !== undefined ||
      data.story_id !== undefined ||
      data.tags !== undefined ||
      data.verified !== undefined ||
      data.verified_by !== undefined ||
      data.archived !== undefined ||
      data.archived_at !== undefined ||
      data.canonical_id !== undefined ||
      data.is_canonical !== undefined,
    {
      message: 'At least one field must be provided for update',
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
 * - entry_type: undefined (no filter)
 * - story_id: undefined (no filter)
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
 *
 * // List all decisions
 * const input = KbListInputSchema.parse({
 *   entry_type: 'decision'
 * })
 *
 * // List constraints for a specific story
 * const input = KbListInputSchema.parse({
 *   entry_type: 'constraint',
 *   story_id: 'WISH-2045'
 * })
 * ```
 */
export const KbListInputSchema = z
  .object({
    /** Filter by role */
    role: KnowledgeRoleSchema.optional(),

    /** Filter by entry type */
    entry_type: KnowledgeEntryTypeSchema.optional(),

    /** Filter by story ID */
    story_id: z.string().optional(),

    /** Filter by tags (ANY match - entries with at least one matching tag) */
    tags: z.array(z.string()).optional(),

    /** Filter by verification status */
    verified: z.boolean().optional(),

    /** Maximum number of results (1-100, default 10) */
    limit: z.number().int().positive().max(100).default(10),
  })
  .optional()

export type KbListInput = z.infer<typeof KbListInputSchema>
