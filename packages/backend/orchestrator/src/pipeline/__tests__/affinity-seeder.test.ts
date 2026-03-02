/**
 * affinity-seeder.test.ts
 *
 * Unit tests for importAffinitySeeds and deriveConfidenceLevel.
 * Tests UT-6, UT-11 from AC-9.
 *
 * @module pipeline/__tests__/affinity-seeder
 */

import { describe, it, expect, vi } from 'vitest'
import {
  importAffinitySeeds,
  deriveConfidenceLevel,
  type ManualAffinitySeedEntry,
  type Db,
} from '../affinity-seeder.js'

// ============================================================================
// Mock DB helper
// ============================================================================

function createMockDb(shouldThrow?: boolean): Db & { execute: ReturnType<typeof vi.fn> } {
  return {
    execute: shouldThrow
      ? vi.fn().mockRejectedValue(new Error('DB error'))
      : vi.fn().mockResolvedValue({ rowCount: 1 }),
  }
}

// ============================================================================
// UT-6: deriveConfidenceLevel from CONFIDENCE_THRESHOLDS
// ============================================================================

describe('UT-6: deriveConfidenceLevel derives correct level from sample_size (AC-6)', () => {
  it("returns 'none' when sample_size < 5", () => {
    expect(deriveConfidenceLevel(0)).toBe('none')
    expect(deriveConfidenceLevel(1)).toBe('none')
    expect(deriveConfidenceLevel(4)).toBe('none')
  })

  it("returns 'low' when sample_size is 5-9", () => {
    expect(deriveConfidenceLevel(5)).toBe('low')
    expect(deriveConfidenceLevel(9)).toBe('low')
  })

  it("returns 'medium' when sample_size is 10-19", () => {
    expect(deriveConfidenceLevel(10)).toBe('medium')
    expect(deriveConfidenceLevel(19)).toBe('medium')
  })

  it("returns 'high' when sample_size >= 20", () => {
    expect(deriveConfidenceLevel(20)).toBe('high')
    expect(deriveConfidenceLevel(100)).toBe('high')
  })
})

// ============================================================================
// UT-11: importAffinitySeeds upserts entries and returns structured result
// ============================================================================

describe('UT-11: importAffinitySeeds upserts entries and returns structured result (AC-5)', () => {
  it('upserts all valid seeds and returns seeded count', async () => {
    const db = createMockDb()

    const seeds: ManualAffinitySeedEntry[] = [
      {
        model: 'ollama/qwen2.5-coder:7b',
        change_type: 'refactor',
        file_type: '.ts',
        success_rate: 0.9,
        sample_size: 25,
      },
      {
        model: 'openrouter/anthropic/claude-3-haiku',
        change_type: 'feat',
        file_type: '.tsx',
        success_rate: 0.85,
        sample_size: 30,
        confidence_level: 'high',
      },
    ]

    const result = await importAffinitySeeds(seeds, db)

    expect(result.seeded).toBe(2)
    expect(result.skipped).toBe(0)
    expect(result.errors).toHaveLength(0)
    expect(db.execute).toHaveBeenCalledTimes(2)
  })

  it('derives confidence_level from sample_size when not explicitly provided (AC-6)', async () => {
    const db = createMockDb()

    const seeds: ManualAffinitySeedEntry[] = [
      {
        model: 'ollama/qwen2.5-coder:7b',
        change_type: 'fix',
        file_type: '.ts',
        success_rate: 0.8,
        sample_size: 12, // should derive 'medium'
      },
    ]

    await importAffinitySeeds(seeds, db)

    const callArgs = db.execute.mock.calls[0][0]
    expect(callArgs.params).toContain('medium')
  })

  it('uses explicitly provided confidence_level when given', async () => {
    const db = createMockDb()

    const seeds: ManualAffinitySeedEntry[] = [
      {
        model: 'ollama/qwen2.5-coder:7b',
        change_type: 'docs',
        file_type: '.md',
        success_rate: 0.7,
        sample_size: 50, // would derive 'high', but explicit 'low' takes precedence
        confidence_level: 'low',
      },
    ]

    await importAffinitySeeds(seeds, db)

    const callArgs = db.execute.mock.calls[0][0]
    expect(callArgs.params).toContain('low')
  })

  it('counts DB errors as skipped and populates errors array', async () => {
    const db = createMockDb(true) // throws on execute

    const seeds: ManualAffinitySeedEntry[] = [
      {
        model: 'ollama/qwen2.5-coder:7b',
        change_type: 'refactor',
        file_type: '.ts',
        success_rate: 0.9,
        sample_size: 25,
      },
    ]

    const result = await importAffinitySeeds(seeds, db)

    expect(result.seeded).toBe(0)
    expect(result.skipped).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].reason).toContain('DB error')
  })

  it('returns empty result for empty seeds array', async () => {
    const db = createMockDb()

    const result = await importAffinitySeeds([], db)

    expect(result.seeded).toBe(0)
    expect(result.skipped).toBe(0)
    expect(result.errors).toHaveLength(0)
    expect(db.execute).not.toHaveBeenCalled()
  })

  it('handles mixed success and failure entries', async () => {
    const db = createMockDb()
    // First call succeeds, second throws
    db.execute
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockRejectedValueOnce(new Error('constraint violation'))

    const seeds: ManualAffinitySeedEntry[] = [
      {
        model: 'ollama/qwen2.5-coder:7b',
        change_type: 'refactor',
        file_type: '.ts',
        success_rate: 0.9,
        sample_size: 25,
      },
      {
        model: 'openrouter/anthropic/claude-3-haiku',
        change_type: 'feat',
        file_type: '.tsx',
        success_rate: 0.85,
        sample_size: 30,
      },
    ]

    const result = await importAffinitySeeds(seeds, db)

    expect(result.seeded).toBe(1)
    expect(result.skipped).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].reason).toContain('constraint violation')
  })
})
