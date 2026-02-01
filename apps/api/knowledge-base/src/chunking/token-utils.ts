/**
 * Token Counting Utilities
 *
 * Provides token counting for markdown chunking using tiktoken.
 * Uses the same pattern as embedding-client/retry-handler.ts for consistency.
 *
 * @see KNOW-048 for chunking requirements
 */

import { encoding_for_model } from 'tiktoken'

/**
 * Simple console logger for chunking utilities.
 * Uses console.warn to avoid import issues with @repo/logger in CLI context.
 */
const logWarn = (message: string, context?: Record<string, unknown>) => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn(`[chunking] ${message}`, context ? JSON.stringify(context) : '')
  }
}

/**
 * Model used for token counting.
 * text-embedding-3-small is our standard embedding model.
 */
const EMBEDDING_MODEL = 'text-embedding-3-small'

/**
 * Cached encoder instance for performance.
 * Tiktoken encoders are expensive to create, so we cache.
 */
let cachedEncoder: ReturnType<typeof encoding_for_model> | null = null

/**
 * Get or create the tiktoken encoder.
 *
 * @returns Tiktoken encoder instance
 */
function getEncoder(): ReturnType<typeof encoding_for_model> | null {
  if (cachedEncoder) {
    return cachedEncoder
  }

  try {
    cachedEncoder = encoding_for_model(EMBEDDING_MODEL as any)
    return cachedEncoder
  } catch (error) {
    logWarn('Failed to create tiktoken encoder, using fallback estimation', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Count tokens in text using tiktoken.
 *
 * Uses text-embedding-3-small tokenizer for accurate counts.
 * Falls back to character-based estimation (4 chars/token) if tiktoken fails.
 *
 * @param text - Input text to count tokens for
 * @returns Token count
 *
 * @example
 * ```typescript
 * const tokens = countTokens('Hello, world!')
 * // Returns accurate token count or estimate
 * ```
 */
export function countTokens(text: string): number {
  if (!text || text.length === 0) {
    return 0
  }

  const encoder = getEncoder()

  if (encoder) {
    try {
      const tokens = encoder.encode(text)
      return tokens.length
    } catch (error) {
      logWarn('Token counting failed, using estimate', {
        error: error instanceof Error ? error.message : String(error),
        textLength: text.length,
      })
    }
  }

  // Fallback: estimate 4 characters per token
  // This is a conservative estimate that tends to overcount slightly
  return Math.ceil(text.length / 4)
}

/**
 * Check if text exceeds token limit.
 *
 * @param text - Input text
 * @param maxTokens - Maximum allowed tokens
 * @returns true if text exceeds limit
 */
export function exceedsTokenLimit(text: string, maxTokens: number): boolean {
  return countTokens(text) > maxTokens
}

/**
 * Clean up tiktoken encoder resources.
 * Call this when done with chunking operations to free memory.
 */
export function cleanupEncoder(): void {
  if (cachedEncoder) {
    try {
      cachedEncoder.free()
    } catch {
      // Ignore cleanup errors
    }
    cachedEncoder = null
  }
}
