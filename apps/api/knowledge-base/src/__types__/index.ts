/**
 * Knowledge Base Type Schemas
 *
 * Zod schemas for runtime validation of knowledge entries and embeddings.
 * All types are inferred from Zod schemas following monorepo conventions.
 *
 * @see CLAUDE.md for Zod-first types requirement
 */

import { z } from 'zod'

/**
 * Valid roles for knowledge entries.
 *
 * - 'pm': Product manager knowledge
 * - 'dev': Developer knowledge
 * - 'qa': QA/testing knowledge
 * - 'all': Universal knowledge applicable to all roles
 */
export const KnowledgeRoleSchema = z.enum(['pm', 'dev', 'qa', 'all'])
export type KnowledgeRole = z.infer<typeof KnowledgeRoleSchema>

/**
 * Vector embedding schema.
 *
 * Validates that embedding is an array of numbers with exactly 1536 dimensions
 * (matching OpenAI text-embedding-3-small output).
 */
export const EmbeddingSchema = z
  .array(z.number())
  .length(1536, 'Embedding must have exactly 1536 dimensions (OpenAI text-embedding-3-small)')

export type Embedding = z.infer<typeof EmbeddingSchema>

/**
 * Knowledge entry schema for validation.
 *
 * Used for validating knowledge entries before database operations.
 */
export const KnowledgeEntrySchema = z.object({
  id: z.string().uuid().optional(),
  content: z.string().min(1, 'Content cannot be empty'),
  embedding: EmbeddingSchema,
  role: KnowledgeRoleSchema,
  tags: z.array(z.string()).optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

export type KnowledgeEntryInput = z.infer<typeof KnowledgeEntrySchema>

/**
 * Schema for creating a new knowledge entry.
 *
 * Excludes auto-generated fields (id, timestamps).
 */
export const NewKnowledgeEntrySchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  embedding: EmbeddingSchema,
  role: KnowledgeRoleSchema,
  tags: z.array(z.string()).optional().nullable(),
})

export type NewKnowledgeEntryInput = z.infer<typeof NewKnowledgeEntrySchema>

/**
 * Schema for updating a knowledge entry.
 *
 * All fields are optional to support partial updates.
 */
export const UpdateKnowledgeEntrySchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').optional(),
  embedding: EmbeddingSchema.optional(),
  role: KnowledgeRoleSchema.optional(),
  tags: z.array(z.string()).optional().nullable(),
})

export type UpdateKnowledgeEntryInput = z.infer<typeof UpdateKnowledgeEntrySchema>

/**
 * Embedding cache entry schema.
 */
export const EmbeddingCacheEntrySchema = z.object({
  contentHash: z.string().min(1, 'Content hash cannot be empty'),
  embedding: EmbeddingSchema,
  createdAt: z.date().optional(),
})

export type EmbeddingCacheEntryInput = z.infer<typeof EmbeddingCacheEntrySchema>

/**
 * Schema for new embedding cache entry.
 */
export const NewEmbeddingCacheEntrySchema = z.object({
  contentHash: z.string().min(1, 'Content hash cannot be empty'),
  embedding: EmbeddingSchema,
})

export type NewEmbeddingCacheEntryInput = z.infer<typeof NewEmbeddingCacheEntrySchema>

/**
 * Schema for vector similarity search parameters.
 */
export const SimilaritySearchParamsSchema = z.object({
  /** The query embedding vector */
  queryEmbedding: EmbeddingSchema,

  /** Maximum number of results to return */
  limit: z.number().int().positive().max(100).default(10),

  /** Optional role filter */
  role: KnowledgeRoleSchema.optional(),

  /** Optional tags filter (entries must have at least one matching tag) */
  tags: z.array(z.string()).optional(),

  /** Minimum similarity threshold (0-1) */
  minSimilarity: z.number().min(0).max(1).optional(),
})

export type SimilaritySearchParams = z.infer<typeof SimilaritySearchParamsSchema>

/**
 * Schema for similarity search result.
 */
export const SimilaritySearchResultSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  role: KnowledgeRoleSchema,
  tags: z.array(z.string()).nullable(),

  /** Cosine similarity score (0-1, higher is more similar) */
  similarity: z.number().min(0).max(1),
})

export type SimilaritySearchResult = z.infer<typeof SimilaritySearchResultSchema>

/**
 * Validate a knowledge entry.
 *
 * @param data - Data to validate
 * @returns Validated knowledge entry
 * @throws ZodError if validation fails
 */
export function validateKnowledgeEntry(data: unknown): KnowledgeEntryInput {
  return KnowledgeEntrySchema.parse(data)
}

/**
 * Validate embedding dimensions.
 *
 * @param embedding - Embedding array to validate
 * @returns true if valid
 * @throws ZodError if validation fails
 */
export function validateEmbedding(embedding: unknown): Embedding {
  return EmbeddingSchema.parse(embedding)
}

/**
 * Safely validate a knowledge entry.
 *
 * @param data - Data to validate
 * @returns Result object with success flag and data or error
 */
export function safeValidateKnowledgeEntry(data: unknown) {
  return KnowledgeEntrySchema.safeParse(data)
}
