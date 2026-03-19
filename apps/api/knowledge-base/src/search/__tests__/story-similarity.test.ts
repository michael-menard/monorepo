/**
 * Tests for story-similarity.ts
 *
 * Verifies:
 * - findSimilarStories() queries workflow.story_embeddings (not public.stories)
 * - findSimilarStories() JOINs workflow.stories for metadata
 * - deleted_at filter is removed (no such column on workflow.stories)
 * - featureFilter references s.feature (workflow.stories.feature)
 * - SimilarStoryResultSchema is a Zod schema (not a TypeScript interface)
 * - buildStoryEmbeddingText() produces expected text
 *
 * @see CDBE-4010 AC-10, AC-11
 */

import { describe, expect, it, vi } from 'vitest'
import {
  findSimilarStories,
  buildStoryEmbeddingText,
  SimilarStoryResultSchema,
} from '../story-similarity.js'

// Mock the logger to avoid noise in test output
vi.mock('@repo/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('SimilarStoryResultSchema (AC-11)', () => {
  it('is a Zod schema that validates correct data', () => {
    const valid = {
      story_id: 'CDBE-4010',
      title: 'pgvector Foundation',
      feature: 'cdbe',
      state: 'ready',
      similarity_score: 0.95,
    }
    const result = SimilarStoryResultSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects invalid data', () => {
    const invalid = {
      story_id: 123, // should be string
      title: 'test',
      feature: null,
      state: null,
      similarity_score: 'not-a-number', // should be number
    }
    const result = SimilarStoryResultSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('accepts nullable feature and state', () => {
    const valid = {
      story_id: 'TEST-001',
      title: 'test',
      feature: null,
      state: null,
      similarity_score: 0.5,
    }
    const result = SimilarStoryResultSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })
})

describe('findSimilarStories (AC-10)', () => {
  it('queries workflow.story_embeddings JOIN workflow.stories', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue({ rows: [] }),
    }

    const embedding = new Array(1536).fill(0.01)
    await findSimilarStories(mockDb as any, embedding, 5)

    expect(mockDb.execute).toHaveBeenCalledTimes(1)

    // Extract the SQL template strings from the tagged template
    const sqlArg = mockDb.execute.mock.calls[0][0]
    // drizzle sql`` stores template strings; stringify to inspect
    const sqlText = JSON.stringify(sqlArg)

    // Must reference workflow.story_embeddings and workflow.stories
    expect(sqlText).toContain('workflow.story_embeddings')
    expect(sqlText).toContain('workflow.stories')
    // Must NOT reference public.stories or deleted_at
    expect(sqlText).not.toContain('public.stories')
    expect(sqlText).not.toContain('deleted_at')
  })

  it('uses s.feature for featureFilter (not se.feature)', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue({ rows: [] }),
    }

    const embedding = new Array(1536).fill(0.01)
    await findSimilarStories(mockDb as any, embedding, 5, 'cdbe')

    const sqlArg = mockDb.execute.mock.calls[0][0]
    const sqlText = JSON.stringify(sqlArg)

    // featureFilter should reference s.feature (workflow.stories.feature)
    expect(sqlText).toContain('s.feature')
  })

  it('returns correctly shaped results', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue({
        rows: [
          {
            story_id: 'TEST-001',
            title: 'Test Story',
            feature: 'test',
            state: 'ready',
            similarity_score: '0.95',
          },
        ],
      }),
    }

    const embedding = new Array(1536).fill(0.01)
    const results = await findSimilarStories(mockDb as any, embedding, 5)

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      story_id: 'TEST-001',
      title: 'Test Story',
      feature: 'test',
      state: 'ready',
      similarity_score: 0.95,
    })
  })

  it('returns empty array when no embeddings exist', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue({ rows: [] }),
    }

    const embedding = new Array(1536).fill(0.01)
    const results = await findSimilarStories(mockDb as any, embedding, 5)

    expect(results).toHaveLength(0)
  })
})

describe('buildStoryEmbeddingText', () => {
  it('builds text from title only', () => {
    const text = buildStoryEmbeddingText('My Story')
    expect(text).toBe('My Story')
  })

  it('includes feature when provided', () => {
    const text = buildStoryEmbeddingText('My Story', 'cdbe')
    expect(text).toBe('My Story\nFeature: cdbe')
  })

  it('includes acceptance criteria array of strings', () => {
    const text = buildStoryEmbeddingText('My Story', null, ['AC-1: Do X', 'AC-2: Do Y'])
    expect(text).toContain('Acceptance Criteria: AC-1: Do X AC-2: Do Y')
  })

  it('skips null feature', () => {
    const text = buildStoryEmbeddingText('My Story', null)
    expect(text).toBe('My Story')
  })
})
