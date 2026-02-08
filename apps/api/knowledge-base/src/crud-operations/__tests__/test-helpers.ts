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

// ============================================================================
// KBMEM Test Fixtures (3-Bucket Architecture)
// ============================================================================

/**
 * Sample task fixtures for testing Bucket C (Task Backlog).
 *
 * @see KBMEM-002 for task schema
 */
export const sampleTasks = {
  bug1: {
    title: 'Fix HEIC detection failure',
    description: 'Browser FileReader cannot detect HEIC magic bytes correctly',
    sourceStoryId: 'WISH-2045',
    sourcePhase: 'implementation',
    sourceAgent: 'dev-implement-backend-coder',
    taskType: 'bug' as const,
    priority: 'p1' as const,
    tags: ['heic', 'file-upload'],
    estimatedEffort: 'm' as const,
  },
  followUp1: {
    title: 'Add HEIC format to test suite',
    description: 'Ensure HEIC test coverage after bug fix',
    sourceStoryId: 'WISH-2045',
    sourcePhase: 'review',
    taskType: 'follow_up' as const,
    priority: 'p2' as const,
    tags: ['testing', 'heic'],
    estimatedEffort: 's' as const,
  },
  techDebt1: {
    title: 'Refactor file validation to shared utility',
    description: 'Consolidate file validation logic into reusable package',
    sourceStoryId: 'WISH-2045',
    sourcePhase: 'review',
    taskType: 'tech_debt' as const,
    priority: 'p3' as const,
    tags: ['refactor', 'shared-utils'],
    estimatedEffort: 'l' as const,
  },
  improvement1: {
    title: 'Add progress indicator for HEIC conversion',
    description: 'Show progress bar during long HEIC conversion operations',
    taskType: 'improvement' as const,
    priority: 'p3' as const,
    tags: ['ux', 'file-upload'],
    estimatedEffort: 'm' as const,
  },
  featureIdea1: {
    title: 'Support batch HEIC conversion',
    description: 'Allow converting multiple HEIC files at once',
    taskType: 'feature_idea' as const,
    tags: ['feature', 'heic'],
  },
}

/**
 * Sample work state fixtures for testing Bucket B (Session State).
 *
 * @see KBMEM-003 for work_state schema
 */
export const sampleWorkStates = {
  implementation1: {
    storyId: 'WISH-2045',
    branch: 'feat/wish-2045-heic-support',
    phase: 'implementation' as const,
    constraints: [
      { constraint: 'Use Zod schemas for all types', source: 'CLAUDE.md', priority: 1 },
      { constraint: 'No barrel files', source: 'CLAUDE.md', priority: 2 },
    ],
    recentActions: [
      { action: 'Created file validation handler', completed: true, timestamp: '2026-02-04T10:00:00Z' },
      { action: 'Added HEIC detection logic', completed: true, timestamp: '2026-02-04T10:30:00Z' },
      { action: 'Writing unit tests', completed: false },
    ],
    nextSteps: ['Complete unit tests', 'Run type checks', 'Submit for code review'],
    blockers: [],
    kbReferences: {},
  },
  review1: {
    storyId: 'KBMEM-001',
    branch: 'feat/kbmem-001-entry-type',
    phase: 'review' as const,
    constraints: [{ constraint: 'Migration must be idempotent', source: 'ADR-001' }],
    recentActions: [
      { action: 'Migration created', completed: true },
      { action: 'Schema updated', completed: true },
    ],
    nextSteps: ['Address review comments'],
    blockers: [],
    kbReferences: {},
  },
  blocked1: {
    storyId: 'WISH-2050',
    branch: 'feat/wish-2050-batch-upload',
    phase: 'implementation' as const,
    constraints: [],
    recentActions: [{ action: 'Started backend implementation', completed: false }],
    nextSteps: ['Wait for dependency resolution'],
    blockers: [
      {
        title: 'Depends on WISH-2045',
        description: 'Cannot implement batch upload until single upload is complete',
        waitingOn: 'WISH-2045 completion',
      },
    ],
    kbReferences: {},
  },
  withKbRefs: {
    storyId: 'KBMEM-004',
    branch: 'feat/kbmem-004-typed-tools',
    phase: 'planning' as const,
    constraints: [{ constraint: 'Follow existing kb_add pattern', source: 'KB Entry' }],
    recentActions: [],
    nextSteps: ['Design tool schemas', 'Implement kb_add_decision'],
    blockers: [],
    kbReferences: {
      'kb_add-pattern': '550e8400-e29b-41d4-a716-446655440000',
      'tool-schema-example': '550e8400-e29b-41d4-a716-446655440001',
    },
  },
}

/**
 * Create a unique task for testing to avoid conflicts.
 */
export function createUniqueTask(base: typeof sampleTasks.bug1) {
  return {
    ...base,
    title: `${base.title} - ${Date.now()}`,
    sourceStoryId: `TEST-${Date.now()}`,
  }
}

/**
 * Create a unique work state for testing to avoid conflicts.
 */
export function createUniqueWorkState(base: typeof sampleWorkStates.implementation1) {
  return {
    ...base,
    storyId: `TEST-${Date.now()}`,
    branch: `test/test-${Date.now()}`,
  }
}
