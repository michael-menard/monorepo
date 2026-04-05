/**
 * Ollama Embedding Client
 *
 * Drop-in replacement for the OpenAI EmbeddingClient that uses local
 * Ollama for embedding generation. Produces 1536-dimensional vectors
 * by truncating and L2-normalizing the native model output (e.g.
 * qwen3-embedding at 4096 dims → 1536 via Matryoshka truncation).
 *
 * Same public interface as EmbeddingClient: generateEmbedding(text)
 * and generateEmbeddingsBatch(texts).
 */

import { logger } from '@repo/logger'
import {
  EmbeddingRequestSchema,
  BatchEmbeddingRequestSchema,
  type Embedding,
} from './__types__/index.js'
import { computeContentHash, getFromCache, saveToCache } from './cache-manager.js'

const TARGET_DIMS = 1536

/**
 * L2-normalizes a vector in place and returns it.
 */
function l2Normalize(vec: number[]): number[] {
  let norm = 0
  for (const v of vec) norm += v * v
  norm = Math.sqrt(norm)
  if (norm === 0) return vec
  for (let i = 0; i < vec.length; i++) vec[i] /= norm
  return vec
}

/**
 * Truncates a vector to TARGET_DIMS and L2-normalizes.
 * This works because qwen3-embedding supports Matryoshka representation
 * — the first N dimensions are a valid lower-dimensional embedding.
 */
function truncateAndNormalize(vec: number[]): number[] {
  const truncated = vec.length > TARGET_DIMS ? vec.slice(0, TARGET_DIMS) : vec
  // Pad if shorter (shouldn't happen with qwen3-embedding)
  while (truncated.length < TARGET_DIMS) truncated.push(0)
  return l2Normalize(truncated)
}

export type OllamaEmbeddingClientConfig = {
  /** Ollama base URL (default: http://localhost:11434) */
  baseUrl?: string
  /** Ollama embedding model (default: qwen3-embedding:latest) */
  model?: string
  /** Request timeout in ms (default: 30000) */
  timeoutMs?: number
  /** Enable caching (default: true) */
  cacheEnabled?: boolean
}

export class OllamaEmbeddingClient {
  private readonly baseUrl: string
  private readonly model: string
  private readonly timeoutMs: number
  private readonly cacheEnabled: boolean

  constructor(config: OllamaEmbeddingClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
    this.model = config.model ?? process.env.EMBEDDING_MODEL ?? 'qwen3-embedding:latest'
    this.timeoutMs = config.timeoutMs ?? 30000
    this.cacheEnabled = config.cacheEnabled ?? true

    logger.info('OllamaEmbeddingClient initialized', {
      baseUrl: this.baseUrl,
      model: this.model,
      cacheEnabled: this.cacheEnabled,
      targetDims: TARGET_DIMS,
    })
  }

  async generateEmbedding(text: string): Promise<Embedding> {
    const validatedText = EmbeddingRequestSchema.parse(text)
    const contentHash = computeContentHash(validatedText)

    // Check cache
    if (this.cacheEnabled) {
      const cached = await getFromCache(contentHash, this.model)
      if (cached) {
        logger.debug('OllamaEmbeddingClient: cache hit', { contentHash })
        return cached
      }
    }

    const embedding = await this.callOllama(validatedText)

    // Cache result
    if (this.cacheEnabled) {
      await saveToCache(contentHash, this.model, embedding)
    }

    return embedding
  }

  async generateEmbeddingsBatch(texts: string[]): Promise<Embedding[]> {
    const validatedTexts = BatchEmbeddingRequestSchema.parse(texts)
    // Process sequentially — Ollama embedding API doesn't support batches
    const results: Embedding[] = []
    for (const text of validatedTexts) {
      results.push(await this.generateEmbedding(text))
    }
    return results
  }

  private async callOllama(text: string): Promise<Embedding> {
    const url = `${this.baseUrl}/api/embed`
    const body = JSON.stringify({
      model: this.model,
      input: text,
    })

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      throw new Error(`Ollama embedding failed (${res.status}): ${errBody.slice(0, 200)}`)
    }

    const data = (await res.json()) as { embeddings?: number[][] }
    const rawVec = data.embeddings?.[0]

    if (!rawVec || !Array.isArray(rawVec)) {
      throw new Error('Ollama embedding response missing embeddings array')
    }

    logger.debug('OllamaEmbeddingClient: generated embedding', {
      nativeDims: rawVec.length,
      targetDims: TARGET_DIMS,
    })

    return truncateAndNormalize(rawVec) as Embedding
  }
}
