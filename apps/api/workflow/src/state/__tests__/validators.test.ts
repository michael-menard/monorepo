import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'

import {
  validateGraphState,
  safeValidateGraphState,
  createInitialState,
  isValidGraphState,
} from '../validators.js'
import { GRAPH_STATE_SCHEMA_VERSION } from '../graph-state.js'

describe('validateGraphState', () => {
  describe('Happy Path', () => {
    it('HP-11: returns valid state when given valid input', () => {
      const input = {
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
      }

      const result = validateGraphState(input)

      expect(result.epicPrefix).toBe('wrkf')
      expect(result.storyId).toBe('wrkf-1010')
      expect(result.schemaVersion).toBe(GRAPH_STATE_SCHEMA_VERSION)
    })

    it('returns state with all defaults applied', () => {
      const result = validateGraphState({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
      })

      expect(result.artifactPaths).toEqual({})
      expect(result.routingFlags).toEqual({})
      expect(result.evidenceRefs).toEqual([])
      expect(result.gateDecisions).toEqual({})
      expect(result.errors).toEqual([])
      expect(result.stateHistory).toEqual([])
    })
  })

  describe('Error Cases', () => {
    it('EC-7: throws ZodError with validation details on invalid state', () => {
      expect(() =>
        validateGraphState({
          epicPrefix: '',
          storyId: 'wrkf-1010',
        }),
      ).toThrow(ZodError)
    })

    it('throws on missing required fields', () => {
      expect(() => validateGraphState({})).toThrow(ZodError)
    })

    it('throws on null input', () => {
      expect(() => validateGraphState(null)).toThrow(ZodError)
    })

    it('throws on undefined input', () => {
      expect(() => validateGraphState(undefined)).toThrow(ZodError)
    })
  })
})

describe('safeValidateGraphState', () => {
  it('returns success:true with data for valid input', () => {
    const result = safeValidateGraphState({
      epicPrefix: 'wrkf',
      storyId: 'wrkf-1010',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.storyId).toBe('wrkf-1010')
    }
  })

  it('returns success:false with error for invalid input', () => {
    const result = safeValidateGraphState({
      epicPrefix: '',
      storyId: 'wrkf-1010',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError)
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })

  it('does not throw on invalid input', () => {
    expect(() => safeValidateGraphState(null)).not.toThrow()
    expect(() => safeValidateGraphState(undefined)).not.toThrow()
    expect(() => safeValidateGraphState({})).not.toThrow()
  })
})

describe('createInitialState', () => {
  describe('Happy Path', () => {
    it('HP-12: creates valid state with required parameters', () => {
      const state = createInitialState({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
      })

      expect(state.epicPrefix).toBe('wrkf')
      expect(state.storyId).toBe('wrkf-1010')
    })

    it('applies all defaults', () => {
      const state = createInitialState({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
      })

      expect(state.schemaVersion).toBe(GRAPH_STATE_SCHEMA_VERSION)
      expect(state.artifactPaths).toEqual({})
      expect(state.routingFlags).toEqual({})
      expect(state.evidenceRefs).toEqual([])
      expect(state.gateDecisions).toEqual({})
      expect(state.errors).toEqual([])
      expect(state.stateHistory).toEqual([])
    })

    it('allows custom schemaVersion', () => {
      const state = createInitialState({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
        schemaVersion: '2.0.0',
      })

      expect(state.schemaVersion).toBe('2.0.0')
    })
  })

  describe('Error Cases', () => {
    it('throws on invalid epicPrefix', () => {
      expect(() =>
        createInitialState({
          epicPrefix: '',
          storyId: 'wrkf-1010',
        }),
      ).toThrow(ZodError)
    })

    it('throws on invalid storyId', () => {
      expect(() =>
        createInitialState({
          epicPrefix: 'wrkf',
          storyId: 'invalid',
        }),
      ).toThrow(ZodError)
    })

    it('throws on mismatched prefix', () => {
      expect(() =>
        createInitialState({
          epicPrefix: 'wrkf',
          storyId: 'glry-1010',
        }),
      ).toThrow(ZodError)
    })
  })
})

describe('isValidGraphState', () => {
  it('returns true for valid state', () => {
    const input = {
      epicPrefix: 'wrkf',
      storyId: 'wrkf-1010',
      schemaVersion: '1.0.0',
      artifactPaths: {},
      routingFlags: {},
      evidenceRefs: [],
      gateDecisions: {},
      errors: [],
      stateHistory: [],
    }

    expect(isValidGraphState(input)).toBe(true)
  })

  it('returns true for minimal valid input (defaults applied)', () => {
    // Note: this might return false because isValidGraphState uses safeParse
    // which validates but doesn't apply defaults
    const input = {
      epicPrefix: 'wrkf',
      storyId: 'wrkf-1010',
    }

    // safeParse with defaults should work
    expect(isValidGraphState(input)).toBe(true)
  })

  it('returns false for invalid state', () => {
    expect(isValidGraphState(null)).toBe(false)
    expect(isValidGraphState(undefined)).toBe(false)
    expect(isValidGraphState({})).toBe(false)
    expect(
      isValidGraphState({
        epicPrefix: '',
        storyId: 'wrkf-1010',
      }),
    ).toBe(false)
  })

  it('acts as type guard', () => {
    const input: unknown = {
      epicPrefix: 'wrkf',
      storyId: 'wrkf-1010',
      schemaVersion: '1.0.0',
      artifactPaths: {},
      routingFlags: {},
      evidenceRefs: [],
      gateDecisions: {},
      errors: [],
      stateHistory: [],
    }

    if (isValidGraphState(input)) {
      // TypeScript should allow accessing GraphState properties here
      expect(input.storyId).toBe('wrkf-1010')
    }
  })
})
