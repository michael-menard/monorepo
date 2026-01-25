/**
 * Test Helpers for CRUD Operations
 *
 * Provides mock dependencies, fixtures, and cleanup utilities for testing.
 *
 * @see KNOW-003 test plan for usage patterns
 */

import { vi } from 'vitest'
import type { EmbeddingClient } from '../../embedding-client/index.js'
import type { Embedding } from '../../embedding-client/__types__/index.js'

/**
 * Generate a fixed 1536-dimensional embedding vector for testing.
 * All values are 0.001 for deterministic testing.
 */
export function createMockEmbedding(): Embedding {
  return Array(1536).fill(0.001) as Embedding
}

/**
 * Create a mock EmbeddingClient for testing.
 *
 * By default, returns a fixed embedding. Can be configured to throw errors.
 *
 * @example
 * ```typescript
 * const embeddingClient = createMockEmbeddingClient()
 *
 * // Or configure to fail
 * const failingClient = createMockEmbeddingClient({
 *   shouldFail: true,
 *   errorMessage: 'API error'
 * })
 * ```
 */
export function createMockEmbeddingClient(options?: {
  shouldFail?: boolean
  errorMessage?: string
  mockEmbedding?: Embedding
}): EmbeddingClient {
  const embedding = options?.mockEmbedding ?? createMockEmbedding()

  return {
    generateEmbedding: vi.fn().mockImplementation(async (_text: string) => {
      if (options?.shouldFail) {
        throw new Error(options.errorMessage ?? 'Mock embedding generation failed')
      }
      return embedding
    }),
    generateEmbeddingsBatch: vi.fn().mockImplementation(async (texts: string[]) => {
      if (options?.shouldFail) {
        throw new Error(options.errorMessage ?? 'Mock batch embedding generation failed')
      }
      return texts.map(() => embedding)
    }),
  } as unknown as EmbeddingClient
}

/**
 * Sample knowledge entry fixtures for testing.
 */
export const sampleEntries = {
  dev1: {
    content: 'Use Zod for validation in all TypeScript projects',
    role: 'dev' as const,
    tags: ['typescript', 'validation', 'best-practice'],
  },
  dev2: {
    content: 'Always use dependency injection for testability',
    role: 'dev' as const,
    tags: ['testing', 'architecture'],
  },
  pm1: {
    content: 'Write testable acceptance criteria for every story',
    role: 'pm' as const,
    tags: ['process', 'stories'],
  },
  qa1: {
    content: 'Test all error cases and edge conditions',
    role: 'qa' as const,
    tags: ['testing', 'quality'],
  },
  all1: {
    content: 'Follow the monorepo coding standards',
    role: 'all' as const,
    tags: ['standards', 'best-practice'],
  },
  noTags: {
    content: 'Entry without tags for testing null handling',
    role: 'dev' as const,
    tags: null,
  },
  emptyTags: {
    content: 'Entry with empty tags array',
    role: 'dev' as const,
    tags: [] as string[],
  },
}

/**
 * Generate a valid UUID for testing.
 */
export function generateTestUuid(): string {
  return crypto.randomUUID()
}

/**
 * Generate content of a specific length for testing limits.
 */
export function generateContentOfLength(length: number): string {
  return 'A'.repeat(length)
}

/**
 * Wait for a specified number of milliseconds.
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
