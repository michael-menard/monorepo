/**
 * Retry Handler with OpenAI Integration
 *
 * Implements exponential backoff retry logic for OpenAI embeddings API.
 * Handles rate limits, transient failures, and token counting/truncation.
 *
 * @see KNOW-002 AC5, AC6, AC12, AC14 for retry and error handling requirements
 */

import { OpenAI } from 'openai'
import { encoding_for_model } from 'tiktoken'
import { logger } from '@repo/logger'
import type { Embedding } from './__types__/index.js'

/**
 * Error classification for retry decisions
 */
export type RetryErrorType =
  | 'RATE_LIMIT' // 429 - Retry with backoff
  | 'SERVER_ERROR' // 500 - Retry with backoff
  | 'TIMEOUT' // Network timeout - Retry
  | 'AUTH_ERROR' // 401 - Don't retry (permanent)
  | 'BAD_REQUEST' // 400 - Don't retry (permanent)
  | 'FORBIDDEN' // 403 - Don't retry (permanent)
  | 'UNKNOWN' // Other error - Don't retry

/**
 * Configuration for retry handler
 */
export interface RetryConfig {
  /** OpenAI API key */
  apiKey: string
  /** Embedding model */
  model: string
  /** Request timeout in milliseconds */
  timeoutMs: number
  /** Number of retry attempts */
  retryCount: number
}

/**
 * Cost per 1K tokens for text-embedding-3-small
 * @see https://openai.com/pricing
 */
const COST_PER_1K_TOKENS = 0.00002

/**
 * Maximum token limit for text-embedding-3-small
 */
const MAX_TOKENS = 8191

/**
 * Classify error for retry decision.
 *
 * @param error - Error from OpenAI API
 * @returns Error type classification
 */
function classifyError(error: unknown): RetryErrorType {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Check for OpenAI API error status codes
    if ('status' in error) {
      const status = (error as any).status
      if (status === 429) return 'RATE_LIMIT'
      if (status === 401) return 'AUTH_ERROR'
      if (status === 400) return 'BAD_REQUEST'
      if (status === 403) return 'FORBIDDEN'
      if (status >= 500) return 'SERVER_ERROR'
    }

    // Check for timeout
    if (message.includes('timeout')) return 'TIMEOUT'

    // Check for network errors (often retryable)
    if (message.includes('network') || message.includes('econnrefused')) {
      return 'SERVER_ERROR'
    }
  }

  return 'UNKNOWN'
}

/**
 * Determine if error is retryable.
 *
 * @param errorType - Classified error type
 * @returns true if should retry, false otherwise
 */
function isRetryable(errorType: RetryErrorType): boolean {
  return errorType === 'RATE_LIMIT' || errorType === 'SERVER_ERROR' || errorType === 'TIMEOUT'
}

/**
 * Calculate exponential backoff delay with jitter.
 *
 * Base delays: [1000ms, 2000ms, 4000ms]
 * Jitter: ±20% random variation
 *
 * @param attempt - Current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
function calculateBackoff(attempt: number): number {
  const baseDelay = 1000 * 2 ** attempt // 1s, 2s, 4s, 8s, ...
  const jitter = baseDelay * (0.8 + Math.random() * 0.4) // ±20% jitter
  return Math.floor(jitter)
}

/**
 * Sleep for specified duration.
 *
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Count tokens in text using tiktoken.
 *
 * @param text - Input text
 * @param model - Embedding model
 * @returns Token count
 */
function countTokens(text: string, model: string): number {
  try {
    const encoding = encoding_for_model(model as any)
    const tokens = encoding.encode(text)
    encoding.free() // Free memory
    return tokens.length
  } catch (error) {
    // Fallback: estimate 4 characters per token
    logger.warn('Token counting failed, using estimate', {
      error: error instanceof Error ? error.message : String(error),
    })
    return Math.ceil(text.length / 4)
  }
}

/**
 * Truncate text to fit within token limit.
 *
 * @param text - Input text
 * @param model - Embedding model
 * @param maxTokens - Maximum allowed tokens
 * @returns Truncated text
 */
function truncateToTokenLimit(text: string, model: string, maxTokens: number): string {
  const tokenCount = countTokens(text, model)

  if (tokenCount <= maxTokens) {
    return text
  }

  logger.warn('Text exceeds token limit, truncating', {
    originalTokens: tokenCount,
    maxTokens,
    model,
  })

  // Binary search to find truncation point
  // (Approximation: truncate characters proportionally to token overage)
  const truncationRatio = maxTokens / tokenCount
  const truncatedLength = Math.floor(text.length * truncationRatio * 0.95) // 5% safety margin

  return text.slice(0, truncatedLength)
}

/**
 * Estimate API cost for token count.
 *
 * @param tokens - Number of tokens
 * @returns Estimated cost in dollars
 */
function estimateCost(tokens: number): number {
  return (tokens / 1000) * COST_PER_1K_TOKENS
}

/**
 * Generate embedding with retry logic.
 *
 * Handles:
 * - Token counting and truncation
 * - Exponential backoff for transient errors
 * - Cost logging
 * - Error classification
 *
 * @param text - Input text
 * @param config - Retry configuration
 * @returns 1536-dimensional embedding vector
 * @throws Error if all retries exhausted or permanent error
 */
export async function generateEmbeddingWithRetry(
  text: string,
  config: RetryConfig,
): Promise<Embedding> {
  const { apiKey, model, timeoutMs, retryCount } = config

  // Create OpenAI client
  const openai = new OpenAI({
    apiKey,
    timeout: timeoutMs,
  })

  // Truncate text if needed
  const truncatedText = truncateToTokenLimit(text, model, MAX_TOKENS)
  const tokenCount = countTokens(truncatedText, model)
  const estimatedCostDollars = estimateCost(tokenCount)

  let lastError: unknown = null

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      logger.debug('Calling OpenAI embeddings API', {
        model,
        tokens: tokenCount,
        estimatedCost: `$${estimatedCostDollars.toFixed(6)}`,
        attempt: attempt + 1,
        maxAttempts: retryCount + 1,
      })

      const response = await openai.embeddings.create({
        model,
        input: truncatedText,
      })

      const embedding = response.data[0]?.embedding

      if (!embedding || embedding.length !== 1536) {
        throw new Error(
          `Invalid embedding response: expected 1536 dimensions, got ${embedding?.length ?? 0}`,
        )
      }

      logger.info('Embedding generated successfully', {
        model,
        tokens: tokenCount,
        cost: `$${estimatedCostDollars.toFixed(6)}`,
        attempt: attempt + 1,
      })

      return embedding as Embedding
    } catch (error) {
      lastError = error
      const errorType = classifyError(error)

      logger.error('OpenAI API call failed', {
        errorType,
        attempt: attempt + 1,
        maxAttempts: retryCount + 1,
        error: error instanceof Error ? error.message : String(error),
      })

      // Don't retry on permanent errors
      if (!isRetryable(errorType)) {
        if (errorType === 'AUTH_ERROR') {
          throw new Error('OpenAI API authentication failed')
        }
        throw new Error(
          `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`,
        )
      }

      // Don't retry on last attempt
      if (attempt >= retryCount) {
        break
      }

      // Calculate backoff and wait
      const delayMs = calculateBackoff(attempt)
      logger.info('Retrying after backoff', {
        errorType,
        delayMs,
        nextAttempt: attempt + 2,
      })
      await sleep(delayMs)
    }
  }

  // All retries exhausted
  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError)
  throw new Error(`OpenAI API rate limit exceeded after ${retryCount} retries: ${errorMessage}`)
}
