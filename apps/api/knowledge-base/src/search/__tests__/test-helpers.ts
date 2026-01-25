/**
 * Test Helpers for Search Module Tests
 *
 * Provides mock factories, test fixtures, and utility functions
 * for testing the search module.
 */

import { vi, expect } from 'vitest'
import type { ScoredEntry, RankedEntry } from '../schemas.js'

/**
 * Create a mock scored entry for testing.
 */
export function createMockScoredEntry(
  overrides: Partial<ScoredEntry> = {},
  index: number = 0,
): ScoredEntry {
  return {
    id: `test-id-${index}`,
    content: `Test content for entry ${index}`,
    role: 'dev',
    tags: ['test', 'mock'],
    createdAt: new Date('2026-01-25T00:00:00Z'),
    updatedAt: new Date('2026-01-25T00:00:00Z'),
    score: 0.9 - index * 0.1, // Decreasing scores
    ...overrides,
  }
}

/**
 * Create multiple mock scored entries.
 */
export function createMockScoredEntries(count: number, scoreStart: number = 0.9): ScoredEntry[] {
  return Array.from({ length: count }, (_, i) =>
    createMockScoredEntry(
      {
        id: `entry-${i + 1}`,
        score: scoreStart - i * 0.1,
      },
      i,
    ),
  )
}

/**
 * Create mock semantic search results.
 * Entries are sorted by score descending (as semantic search returns).
 */
export function createMockSemanticResults(ids: string[], scores: number[]): ScoredEntry[] {
  return ids.map((id, i) =>
    createMockScoredEntry({
      id,
      content: `Semantic content for ${id}`,
      score: scores[i],
    }),
  )
}

/**
 * Create mock keyword search results.
 * Entries are sorted by FTS rank descending (as keyword search returns).
 */
export function createMockKeywordResults(ids: string[], scores: number[]): ScoredEntry[] {
  return ids.map((id, i) =>
    createMockScoredEntry({
      id,
      content: `Keyword content for ${id}`,
      score: scores[i],
    }),
  )
}

/**
 * Test case structure for RRF algorithm testing.
 */
export interface RRFTestCase {
  name: string
  semanticResults: ScoredEntry[]
  keywordResults: ScoredEntry[]
  expectedOrder: string[] // Expected order of entry IDs after RRF merge
  config?: {
    semanticWeight?: number
    keywordWeight?: number
    k?: number
  }
}

/**
 * Standard test cases for RRF algorithm.
 */
export const rrfTestCases: RRFTestCase[] = [
  {
    name: 'Entry in both results should rank highest',
    semanticResults: createMockSemanticResults(['A', 'B', 'C'], [0.9, 0.8, 0.7]),
    keywordResults: createMockKeywordResults(['A', 'D', 'E'], [0.5, 0.4, 0.3]),
    expectedOrder: ['A', 'B', 'C', 'D', 'E'],
  },
  {
    name: 'Semantic-only entries should rank higher than keyword-only',
    semanticResults: createMockSemanticResults(['A', 'B'], [0.9, 0.8]),
    keywordResults: createMockKeywordResults(['C', 'D'], [0.5, 0.4]),
    expectedOrder: ['A', 'B', 'C', 'D'],
  },
  {
    name: 'Empty semantic results should use keyword ranking',
    semanticResults: [],
    keywordResults: createMockKeywordResults(['A', 'B', 'C'], [0.5, 0.4, 0.3]),
    expectedOrder: ['A', 'B', 'C'],
  },
  {
    name: 'Empty keyword results should use semantic ranking',
    semanticResults: createMockSemanticResults(['A', 'B', 'C'], [0.9, 0.8, 0.7]),
    keywordResults: [],
    expectedOrder: ['A', 'B', 'C'],
  },
  {
    name: 'Both empty should return empty',
    semanticResults: [],
    keywordResults: [],
    expectedOrder: [],
  },
]

/**
 * Mock embedding vector (1536 dimensions).
 */
export function createMockEmbedding(seed: number = 1): number[] {
  // Create a deterministic pseudo-random embedding
  const embedding: number[] = []
  let value = seed
  for (let i = 0; i < 1536; i++) {
    value = ((value * 1103515245 + 12345) % 2147483648) / 2147483648
    embedding.push(value * 2 - 1) // Normalize to [-1, 1]
  }
  return embedding
}

/**
 * Mock EmbeddingClient for testing.
 */
export function createMockEmbeddingClient(options: {
  shouldFail?: boolean
  embedding?: number[]
} = {}) {
  const mockEmbedding = options.embedding ?? createMockEmbedding()

  return {
    generateEmbedding: vi.fn().mockImplementation(async () => {
      if (options.shouldFail) {
        throw new Error('OpenAI API unavailable')
      }
      return mockEmbedding
    }),
    generateEmbeddingsBatch: vi.fn().mockImplementation(async (texts: string[]) => {
      if (options.shouldFail) {
        throw new Error('OpenAI API unavailable')
      }
      return texts.map(() => mockEmbedding)
    }),
  }
}

/**
 * Mock database client for testing.
 */
export function createMockDbClient() {
  return {
    execute: vi.fn(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
}

/**
 * Assert that two arrays have the same elements in the same order.
 */
export function assertOrderedEquals<T>(actual: T[], expected: T[]) {
  expect(actual).toHaveLength(expected.length)
  for (let i = 0; i < expected.length; i++) {
    expect(actual[i]).toEqual(expected[i])
  }
}

/**
 * Extract IDs from ranked entries.
 */
export function extractIds(entries: RankedEntry[]): string[] {
  return entries.map(e => e.id)
}
