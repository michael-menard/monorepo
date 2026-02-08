/**
 * Test Helpers for MCP Server
 *
 * Provides mock dependencies, fixtures, and utilities for testing MCP tools.
 *
 * @see KNOW-0051 AC7 for test harness requirements
 */

import { vi } from 'vitest'
import type { EmbeddingClient } from '../../embedding-client/index.js'
import type { Embedding } from '../../embedding-client/__types__/index.js'
import type { KnowledgeEntry } from '../../db/schema.js'

/**
 * Generate a fixed 1536-dimensional embedding vector for testing.
 */
export function createMockEmbedding(): Embedding {
  return Array(1536).fill(0.001) as Embedding
}

/**
 * Create a mock EmbeddingClient for testing.
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
 * Create a mock database client for testing.
 *
 * Uses vi.fn() to create chainable mock methods that simulate Drizzle ORM.
 */
export function createMockDbClient() {
  const mockInsert = vi.fn()
  const mockSelect = vi.fn()
  const mockUpdate = vi.fn()
  const mockDelete = vi.fn()

  // Chainable mock for insert
  const insertChain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'test-uuid' }]),
  }
  mockInsert.mockReturnValue(insertChain)

  // Chainable mock for select
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  }
  mockSelect.mockReturnValue(selectChain)

  // Chainable mock for update
  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  }
  mockUpdate.mockReturnValue(updateChain)

  // Chainable mock for delete
  const deleteChain = {
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  }
  mockDelete.mockReturnValue(deleteChain)

  return {
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
    _chains: {
      insert: insertChain,
      select: selectChain,
      update: updateChain,
      delete: deleteChain,
    },
  }
}

/**
 * Create a mock knowledge entry for testing.
 */
export function createMockKnowledgeEntry(overrides?: Partial<KnowledgeEntry>): KnowledgeEntry {
  const now = new Date()
  return {
    id: overrides?.id ?? crypto.randomUUID(),
    content: overrides?.content ?? 'Test knowledge content',
    embedding: overrides?.embedding ?? createMockEmbedding(),
    role: overrides?.role ?? 'dev',
    entryType: overrides?.entryType ?? 'note',
    storyId: overrides?.storyId ?? null,
    tags: overrides?.tags ?? ['test'],
    verified: overrides?.verified ?? false,
    verifiedAt: overrides?.verifiedAt ?? null,
    verifiedBy: overrides?.verifiedBy ?? null,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
  }
}

/**
 * Sample knowledge entries for testing.
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

/**
 * Mock MCP request for testing tool handlers.
 */
export interface MockMcpRequest {
  params: {
    name: string
    arguments?: unknown
  }
}

/**
 * Create a mock MCP request for tool invocation.
 */
export function createMockMcpRequest(
  toolName: string,
  args?: Record<string, unknown>,
): MockMcpRequest {
  return {
    params: {
      name: toolName,
      arguments: args,
    },
  }
}

/**
 * Database error for testing error sanitization.
 */
export class MockDatabaseError extends Error {
  code: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'DatabaseError'
    this.code = code ?? 'ECONNREFUSED'
  }
}

/**
 * OpenAI API error for testing error sanitization.
 */
export class MockOpenAIError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OpenAIError'
  }
}

/**
 * Create sample errors for testing.
 */
export const sampleErrors = {
  databaseConnection: new MockDatabaseError(
    'Connection refused: postgresql://user:secretpassword@localhost:5432/db',
    'ECONNREFUSED',
  ),
  databaseQuery: new MockDatabaseError('column "nonexistent" does not exist', 'PGQUERY'),
  openAIRateLimit: new MockOpenAIError(
    'OpenAI rate_limit exceeded. Retry after 60 seconds.',
  ),
  openAIQuota: new MockOpenAIError('OpenAI insufficient_quota. Please check your plan.'),
  openAIGeneric: new MockOpenAIError('OpenAI embedding generation failed'),
  generic: new Error('Something went wrong'),
}
