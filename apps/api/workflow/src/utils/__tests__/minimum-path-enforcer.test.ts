/**
 * Tests for minimum-path-enforcer utility
 *
 * APRS-1030: Validates the enforceMinimumPathInBatch and assertMinimumPathInBatch
 * functions, plus the MinimumPathViolationError class.
 */

import { describe, it, expect } from 'vitest'
import {
  enforceMinimumPathInBatch,
  assertMinimumPathInBatch,
  MinimumPathViolationError,
} from '../minimum-path-enforcer.js'

describe('enforceMinimumPathInBatch', () => {
  it('returns valid when batch has exactly one minimum-path story', () => {
    const stories = [
      { storyId: 'APRS-0010', minimumPath: true },
      { storyId: 'APRS-0020', minimumPath: false },
      { storyId: 'APRS-0030', minimumPath: false },
    ]
    const result = enforceMinimumPathInBatch(stories, 'my-plan')
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('returns valid when batch has multiple minimum-path stories', () => {
    const stories = [
      { storyId: 'APRS-0010', minimumPath: true },
      { storyId: 'APRS-0020', minimumPath: true },
      { storyId: 'APRS-0030', minimumPath: false },
    ]
    const result = enforceMinimumPathInBatch(stories, 'my-plan')
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('returns invalid with error message when no story has minimumPath=true', () => {
    const stories = [
      { storyId: 'APRS-0010', minimumPath: false },
      { storyId: 'APRS-0020', minimumPath: false },
    ]
    const result = enforceMinimumPathInBatch(stories, 'my-plan')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('my-plan')
    expect(result.error).toContain('APRS-0010')
    expect(result.error).toContain('APRS-0020')
  })

  it('returns valid for an empty batch (vacuously valid)', () => {
    const result = enforceMinimumPathInBatch([], 'my-plan')
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })
})

describe('assertMinimumPathInBatch', () => {
  it('does not throw when batch has a minimum-path story', () => {
    const stories = [
      { storyId: 'APRS-0010', minimumPath: true },
      { storyId: 'APRS-0020', minimumPath: false },
    ]
    expect(() => assertMinimumPathInBatch(stories, 'my-plan')).not.toThrow()
  })

  it('throws MinimumPathViolationError when no minimum-path story in batch', () => {
    const stories = [
      { storyId: 'APRS-0010', minimumPath: false },
      { storyId: 'APRS-0020', minimumPath: false },
    ]
    expect(() => assertMinimumPathInBatch(stories, 'my-plan')).toThrow(
      MinimumPathViolationError,
    )
  })

  it('error message from MinimumPathViolationError contains planSlug and storyIds', () => {
    const stories = [
      { storyId: 'APRS-0010', minimumPath: false },
      { storyId: 'APRS-0020', minimumPath: false },
    ]
    let caught: MinimumPathViolationError | undefined
    try {
      assertMinimumPathInBatch(stories, 'critical-plan')
    } catch (e) {
      if (e instanceof MinimumPathViolationError) {
        caught = e
      }
    }
    expect(caught).toBeDefined()
    expect(caught!.message).toContain('critical-plan')
    expect(caught!.message).toContain('APRS-0010')
    expect(caught!.message).toContain('APRS-0020')
    expect(caught!.planSlug).toBe('critical-plan')
    expect(caught!.storyIds).toEqual(['APRS-0010', 'APRS-0020'])
  })
})
