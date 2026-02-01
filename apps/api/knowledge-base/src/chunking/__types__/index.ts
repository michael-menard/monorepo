/**
 * Document Chunking Type Schemas
 *
 * Zod schemas for markdown document chunking operations.
 * Used for splitting long documents into smaller, semantically meaningful chunks
 * for knowledge base import.
 *
 * @see KNOW-048 for chunking requirements
 */

import { z } from 'zod'

/**
 * Options for chunking operation.
 */
export const ChunkOptionsSchema = z.object({
  /** Maximum tokens per chunk (default: 500) */
  maxTokens: z.number().int().positive().default(500),
})

export type ChunkOptions = z.infer<typeof ChunkOptionsSchema>

/**
 * Front matter metadata extracted from document.
 * Supports common YAML front matter fields.
 * Note: js-yaml may parse dates as Date objects, so we accept and coerce them.
 */
export const FrontMatterSchema = z
  .object({
    title: z.string().optional(),
    // js-yaml parses dates as Date objects, so coerce to string
    date: z.union([z.string(), z.date().transform(d => d.toISOString())]).optional(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional(),
    // Allow additional fields
  })
  .passthrough()

export type FrontMatter = z.infer<typeof FrontMatterSchema>

/**
 * A single chunk of a document.
 *
 * @see KNOW-048 AC1, AC4 for chunk requirements
 */
export const ChunkedDocumentSchema = z.object({
  /** The chunk content (includes header as context) */
  content: z.string().min(1),

  /** Original source file path */
  sourceFile: z.string(),

  /** Zero-based index of this chunk */
  chunkIndex: z.number().int().nonnegative(),

  /** Total number of chunks from source file */
  totalChunks: z.number().int().positive(),

  /** The immediate header for this chunk (e.g., "## Installation"), empty for headerless content */
  headerPath: z.string(),

  /** Token count for this chunk */
  tokenCount: z.number().int().positive(),

  /** Extracted front matter metadata (same for all chunks from same file) */
  frontMatter: FrontMatterSchema.optional(),
})

export type ChunkedDocument = z.infer<typeof ChunkedDocumentSchema>

/**
 * Result of chunking operation.
 */
export const ChunkResultSchema = z.object({
  /** Array of document chunks */
  chunks: z.array(ChunkedDocumentSchema),

  /** Source file path */
  sourceFile: z.string(),

  /** Total chunks generated */
  totalChunks: z.number().int().nonnegative(),

  /** Extracted front matter (if any) */
  frontMatter: FrontMatterSchema.optional(),

  /** Warnings generated during chunking (e.g., oversized code blocks) */
  warnings: z.array(z.string()),
})

export type ChunkResult = z.infer<typeof ChunkResultSchema>
