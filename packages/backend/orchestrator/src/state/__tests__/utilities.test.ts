import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'

import {
  diffGraphState,
  serializeState,
  deserializeState,
  safeDeserializeState,
  cloneState,
} from '../utilities.js'
import { createInitialState } from '../validators.js'
import type { GraphState } from '../graph-state.js'

describe('diffGraphState', () => {
  const baseState = (): GraphState =>
    createInitialState({
      epicPrefix: 'wrkf',
      storyId: 'wrkf-1010',
    })

  it('returns no changes for identical states', () => {
    const state = baseState()
    const diff = diffGraphState(state, state)

    expect(diff.hasChanges).toBe(false)
    expect(diff.totalDiffs).toBe(0)
    expect(diff.changed).toHaveLength(0)
    expect(diff.added).toHaveLength(0)
    expect(diff.removed).toHaveLength(0)
  })

  it('detects changed top-level string field', () => {
    const before = baseState()
    const after = { ...before, epicPrefix: 'glry' }
    // Note: This will fail validation due to prefix mismatch, but we're testing diff logic
    // Let's use a valid change instead

    const beforeValid = baseState()
    const afterValid = {
      ...beforeValid,
      schemaVersion: '2.0.0',
    } as GraphState

    const diff = diffGraphState(beforeValid, afterValid)

    expect(diff.hasChanges).toBe(true)
    expect(diff.changed.some(c => c.path === 'schemaVersion')).toBe(true)
  })

  it('detects added nested property', () => {
    const before = baseState()
    const after = {
      ...before,
      artifactPaths: { storyDoc: '/path/to/story.md' },
    } as GraphState

    const diff = diffGraphState(before, after)

    expect(diff.hasChanges).toBe(true)
    expect(diff.added.some(c => c.path === 'artifactPaths.storyDoc')).toBe(true)
  })

  it('detects removed nested property', () => {
    const before = {
      ...baseState(),
      artifactPaths: { storyDoc: '/path/to/story.md' },
    } as GraphState
    const after = {
      ...baseState(),
      artifactPaths: {},
    } as GraphState

    const diff = diffGraphState(before, after)

    expect(diff.hasChanges).toBe(true)
    expect(diff.removed.some(c => c.path === 'artifactPaths.storyDoc')).toBe(true)
  })

  it('detects changed array (evidenceRefs)', () => {
    const before = baseState()
    const after = {
      ...before,
      evidenceRefs: [
        {
          type: 'test' as const,
          path: '/test.log',
          timestamp: '2024-01-15T10:00:00Z',
        },
      ],
    } as GraphState

    const diff = diffGraphState(before, after)

    expect(diff.hasChanges).toBe(true)
    expect(diff.changed.some(c => c.path === 'evidenceRefs')).toBe(true)
  })

  it('detects changed boolean in nested object', () => {
    const before = {
      ...baseState(),
      routingFlags: { proceed: false },
    } as GraphState
    const after = {
      ...baseState(),
      routingFlags: { proceed: true },
    } as GraphState

    const diff = diffGraphState(before, after)

    expect(diff.hasChanges).toBe(true)
    expect(diff.changed.some(c => c.path === 'routingFlags.proceed')).toBe(true)
  })

  it('tracks old and new values', () => {
    const before = {
      ...baseState(),
      routingFlags: { proceed: false },
    } as GraphState
    const after = {
      ...baseState(),
      routingFlags: { proceed: true },
    } as GraphState

    const diff = diffGraphState(before, after)
    const proceedDiff = diff.changed.find(c => c.path === 'routingFlags.proceed')

    expect(proceedDiff?.oldValue).toBe(false)
    expect(proceedDiff?.newValue).toBe(true)
  })

  it('totalDiffs equals sum of all diff types', () => {
    const before = {
      ...baseState(),
      routingFlags: { proceed: false },
      artifactPaths: { storyDoc: '/old.md' },
    } as GraphState
    const after = {
      ...baseState(),
      routingFlags: { proceed: true, skip: true },
      artifactPaths: {},
    } as GraphState

    const diff = diffGraphState(before, after)

    expect(diff.totalDiffs).toBe(diff.changed.length + diff.added.length + diff.removed.length)
  })
})

describe('serializeState', () => {
  it('returns valid JSON string', () => {
    const state = createInitialState({
      epicPrefix: 'wrkf',
      storyId: 'wrkf-1010',
    })

    const json = serializeState(state)

    expect(typeof json).toBe('string')
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('preserves all state properties', () => {
    const state = createInitialState({
      epicPrefix: 'wrkf',
      storyId: 'wrkf-1010',
    })

    const json = serializeState(state)
    const parsed = JSON.parse(json)

    expect(parsed.epicPrefix).toBe('wrkf')
    expect(parsed.storyId).toBe('wrkf-1010')
    expect(parsed.schemaVersion).toBe('1.0.0')
  })

  it('handles complex nested state', () => {
    const state = {
      ...createInitialState({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
      }),
      artifactPaths: { storyDoc: '/story.md' },
      evidenceRefs: [
        {
          type: 'test' as const,
          path: '/test.log',
          timestamp: '2024-01-15T10:00:00Z',
        },
      ],
    } as GraphState

    const json = serializeState(state)
    const parsed = JSON.parse(json)

    expect(parsed.artifactPaths.storyDoc).toBe('/story.md')
    expect(parsed.evidenceRefs[0].type).toBe('test')
  })
})

describe('deserializeState', () => {
  it('parses valid JSON and returns GraphState', () => {
    const original = createInitialState({
      epicPrefix: 'wrkf',
      storyId: 'wrkf-1010',
    })
    const json = serializeState(original)

    const result = deserializeState(json)

    expect(result.epicPrefix).toBe('wrkf')
    expect(result.storyId).toBe('wrkf-1010')
  })

  it('throws ZodError on invalid GraphState structure', () => {
    const invalidJson = JSON.stringify({
      epicPrefix: '',
      storyId: 'wrkf-1010',
    })

    expect(() => deserializeState(invalidJson)).toThrow(ZodError)
  })

  it('throws SyntaxError on malformed JSON', () => {
    const malformedJson = '{ invalid json'

    expect(() => deserializeState(malformedJson)).toThrow(SyntaxError)
  })

  it('applies defaults to minimal input', () => {
    const minimalJson = JSON.stringify({
      epicPrefix: 'wrkf',
      storyId: 'wrkf-1010',
    })

    const result = deserializeState(minimalJson)

    expect(result.schemaVersion).toBe('1.0.0')
    expect(result.artifactPaths).toEqual({})
    expect(result.routingFlags).toEqual({})
  })
})

describe('safeDeserializeState', () => {
  it('returns success:true for valid JSON', () => {
    const original = createInitialState({
      epicPrefix: 'wrkf',
      storyId: 'wrkf-1010',
    })
    const json = serializeState(original)

    const result = safeDeserializeState(json)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.storyId).toBe('wrkf-1010')
    }
  })

  it('returns success:false for invalid GraphState', () => {
    const invalidJson = JSON.stringify({
      epicPrefix: '',
      storyId: 'wrkf-1010',
    })

    const result = safeDeserializeState(invalidJson)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Error)
    }
  })

  it('returns success:false for malformed JSON', () => {
    const malformedJson = '{ invalid json'

    const result = safeDeserializeState(malformedJson)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Error)
    }
  })

  it('does not throw on any input', () => {
    expect(() => safeDeserializeState('')).not.toThrow()
    expect(() => safeDeserializeState('null')).not.toThrow()
    expect(() => safeDeserializeState('[]')).not.toThrow()
    expect(() => safeDeserializeState('{}')).not.toThrow()
  })
})

describe('cloneState', () => {
  it('creates a deep copy of state', () => {
    const original = createInitialState({
      epicPrefix: 'wrkf',
      storyId: 'wrkf-1010',
    })

    const clone = cloneState(original)

    expect(clone).toEqual(original)
    expect(clone).not.toBe(original)
  })

  it('modifications to clone do not affect original', () => {
    const original = {
      ...createInitialState({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
      }),
      artifactPaths: { storyDoc: '/story.md' },
    } as GraphState

    const clone = cloneState(original)
    // TypeScript would complain about this in strict mode, but for testing:
    ;(clone.artifactPaths as Record<string, string>).storyDoc = '/new-story.md'

    expect(original.artifactPaths.storyDoc).toBe('/story.md')
    expect(clone.artifactPaths.storyDoc).toBe('/new-story.md')
  })

  it('preserves complex nested structures', () => {
    const original = {
      ...createInitialState({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
      }),
      evidenceRefs: [
        {
          type: 'test' as const,
          path: '/test.log',
          timestamp: '2024-01-15T10:00:00Z',
          description: 'Test output',
        },
      ],
      errors: [
        {
          nodeId: 'test-node',
          message: 'Test error',
          timestamp: '2024-01-15T10:00:00Z',
          recoverable: false,
        },
      ],
    } as GraphState

    const clone = cloneState(original)

    expect(clone.evidenceRefs).toHaveLength(1)
    expect(clone.evidenceRefs[0].description).toBe('Test output')
    expect(clone.errors).toHaveLength(1)
    expect(clone.errors[0].message).toBe('Test error')
  })
})

describe('Round-trip serialization', () => {
  it('serialize -> deserialize produces equivalent state', () => {
    const original = {
      ...createInitialState({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
      }),
      artifactPaths: {
        storyDoc: '/story.md',
        elaboration: '/elaboration.md',
      },
      routingFlags: {
        proceed: true,
        skip: false,
      },
      gateDecisions: {
        codeReview: 'PASS' as const,
        qaVerify: 'PENDING' as const,
      },
    } as GraphState

    const json = serializeState(original)
    const restored = deserializeState(json)

    expect(restored).toEqual(original)
  })

  it('multiple round trips are stable', () => {
    const original = createInitialState({
      epicPrefix: 'wrkf',
      storyId: 'wrkf-1010',
    })

    let current = original
    for (let i = 0; i < 5; i++) {
      current = deserializeState(serializeState(current))
    }

    expect(current).toEqual(original)
  })
})
