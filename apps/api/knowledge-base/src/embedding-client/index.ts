/**
 * Embedding Client for Knowledge Base
 *
 * Production-ready OpenAI embedding client with:
 * - PostgreSQL caching using content-hash deduplication
 * - Exponential backoff retry logic for transient failures
 * - Batch processing with order preservation
 * - Graceful degradation when cache is unavailable
 * - Cost logging and token counting
 *
 * @see KNOW-002 for implementation details and acceptance criteria
 */

import { logger } from '@repo/logger'
import {
  EmbeddingRequestSchema,
  BatchEmbeddingRequestSchema,
  type Embedding,
} from './__types__/index.js'
import { computeContentHash, getFromCache, saveToCache } from './cache-manager.js'
import { generateEmbeddingWithRetry, type RetryConfig } from './retry-handler.js'
import { processBatchWithSplitting } from './batch-processor.js'

/**
 * Configuration for EmbeddingClient.
 *
 * All fields have sensible defaults except apiKey (required).
 */
export interface EmbeddingClientConfig {
  /** OpenAI API key (required) */
  apiKey: string

  /** Embedding model to use (default: text-embedding-3-small) */
  model?: string

  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number

  /** Number of retry attempts for transient failures (default: 3) */
  retryCount?: number

  /** Maximum concurrent requests to OpenAI API (default: 10) */
  maxConcurrentRequests?: number

  /** Enable/disable caching (default: true) */
  cacheEnabled?: boolean
}

/**
 * Embedding Client
 *
 * Main class for generating embeddings with caching and retry logic.
 *
 * @example
 * ```typescript
 * const client = new EmbeddingClient({
 *   apiKey: process.env.OPENAI_API_KEY,
 * })
 *
 * // Generate single embedding
 * const embedding = await client.generateEmbedding('Hello world')
 *
 * // Generate batch embeddings
 * const embeddings = await client.generateEmbeddingsBatch([
 *   'Text 1',
 *   'Text 2',
 *   'Text 3',
 * ])
 * ```
 */
export class EmbeddingClient {
  private readonly config: Required<EmbeddingClientConfig>
  private readonly retryConfig: RetryConfig

  constructor(config: EmbeddingClientConfig) {
    // Apply defaults
    this.config = {
      apiKey: config.apiKey,
      model: config.model ?? 'text-embedding-3-small',
      timeoutMs: config.timeoutMs ?? 30000,
      retryCount: config.retryCount ?? 3,
      maxConcurrentRequests: config.maxConcurrentRequests ?? 10,
      cacheEnabled: config.cacheEnabled ?? true,
    }

    // Validate API key
    if (!this.config.apiKey || this.config.apiKey.trim().length === 0) {
      throw new Error('OpenAI API key is required')
    }

    // Create retry config
    this.retryConfig = {
      apiKey: this.config.apiKey,
      model: this.config.model,
      timeoutMs: this.config.timeoutMs,
      retryCount: this.config.retryCount,
    }

    logger.info('EmbeddingClient initialized', {
      model: this.config.model,
      cacheEnabled: this.config.cacheEnabled,
      retryCount: this.config.retryCount,
    })
  }

  /**
   * Generate embedding for a single text.
   *
   * Flow:
   * 1. Validate and preprocess input
   * 2. Compute content hash
   * 3. Check cache (if enabled)
   * 4. If cache miss, generate via OpenAI API
   * 5. Save to cache (if enabled)
   * 6. Return embedding
   *
   * @param text - Input text (non-empty string)
   * @returns 1536-dimensional embedding vector
   * @throws Error if validation fails or API error
   */
  async generateEmbedding(text: string): Promise<Embedding> {
    // Validate input
    const validatedText = EmbeddingRequestSchema.parse(text)

    // Compute content hash
    const contentHash = computeContentHash(validatedText)

    // Check cache if enabled
    if (this.config.cacheEnabled) {
      const cachedEmbedding = await getFromCache(contentHash, this.config.model)

      if (cachedEmbedding) {
        logger.debug('Returning cached embedding', {
          contentHash,
          model: this.config.model,
        })
        return cachedEmbedding
      }
    }

    // Generate embedding via OpenAI API
    const embedding = await generateEmbeddingWithRetry(validatedText, this.retryConfig)

    // Save to cache if enabled
    if (this.config.cacheEnabled) {
      await saveToCache(contentHash, this.config.model, embedding)
    }

    return embedding
  }

  /**
   * Generate embeddings for batch of texts.
   *
   * Flow:
   * 1. Validate batch input
   * 2. Process batch with cache coordination and deduplication
   * 3. Return embeddings in original input order
   *
   * Features:
   * - Cache prefetching (single query for all lookups)
   * - In-memory deduplication for concurrent identical requests
   * - Automatic batch splitting if >2048 texts
   * - Order preservation
   *
   * @param texts - Array of input texts (non-empty strings)
   * @returns Array of 1536-dimensional embedding vectors (same order as input)
   * @throws Error if validation fails or API error
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<Embedding[]> {
    // Validate batch input
    const validatedTexts = BatchEmbeddingRequestSchema.parse(texts)

    if (!this.config.cacheEnabled) {
      // Without cache, generate all embeddings directly
      logger.warn('Cache disabled, generating all embeddings via API', {
        batchSize: validatedTexts.length,
      })

      return Promise.all(
        validatedTexts.map(text => generateEmbeddingWithRetry(text, this.retryConfig)),
      )
    }

    // Process batch with cache coordination
    const generateFn = async (text: string): Promise<Embedding> => {
      const embedding = await generateEmbeddingWithRetry(text, this.retryConfig)

      // Save to cache
      const contentHash = computeContentHash(text)
      await saveToCache(contentHash, this.config.model, embedding)

      return embedding
    }

    return processBatchWithSplitting(validatedTexts, this.config.model, generateFn)
  }
}

/**
 * Singleton instance for easy consumption.
 *
 * Configured via environment variables:
 * - OPENAI_API_KEY (required)
 * - EMBEDDING_MODEL (default: text-embedding-3-small)
 * - OPENAI_TIMEOUT_MS (default: 30000)
 * - OPENAI_RETRY_COUNT (default: 3)
 * - CACHE_ENABLED (default: true)
 */
export function createEmbeddingClient(): EmbeddingClient {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is required. See apps/api/knowledge-base/.env.example',
    )
  }

  return new EmbeddingClient({
    apiKey,
    model: process.env.EMBEDDING_MODEL,
    timeoutMs: process.env.OPENAI_TIMEOUT_MS
      ? parseInt(process.env.OPENAI_TIMEOUT_MS, 10)
      : undefined,
    retryCount: process.env.OPENAI_RETRY_COUNT
      ? parseInt(process.env.OPENAI_RETRY_COUNT, 10)
      : undefined,
    cacheEnabled: process.env.CACHE_ENABLED !== 'false',
  })
}
