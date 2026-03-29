import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../state/index.js'
import {
  addErrors,
  addEvidenceRefs,
  createBlockedUpdate,
  createCompleteUpdate,
  createErrorUpdate,
  createNodeError,
  mergeStateUpdates,
  updateArtifactPaths,
  updateGateDecisions,
  updateRoutingFlags,
  updateState,
} from '../state-helpers.js'

describe('updateState', () => {
  it('returns a partial state update', () => {
    const update = updateState({ routingFlags: { blocked: true } })
    expect(update).toEqual({ routingFlags: { blocked: true } })
  })

  it('preserves original update object', () => {
    const original = { routingFlags: { blocked: true } }
    const update = updateState(original)

    // Should be a copy, not the same reference
    expect(update).not.toBe(original)
    expect(update).toEqual(original)
  })

  it('handles empty updates', () => {
    const update = updateState({})
    expect(update).toEqual({})
  })
})

describe('updateArtifactPaths', () => {
  it('merges new paths with existing', () => {
    const current = { story: '/path/to/story.md' } as Record<string, string>
    const result = updateArtifactPaths(current, { implementation: '/path/to/impl.md' })

    expect(result.story).toBe('/path/to/story.md')
    expect(result.implementation).toBe('/path/to/impl.md')
  })

  it('overwrites existing paths', () => {
    const current = { story: '/old/path.md' } as Record<string, string>
    const result = updateArtifactPaths(current, { story: '/new/path.md' })

    expect(result.story).toBe('/new/path.md')
  })

  it('does not mutate original', () => {
    const current = { story: '/path/to/story.md' } as Record<string, string>
    updateArtifactPaths(current, { implementation: '/path/to/impl.md' })

    expect(current).toEqual({ story: '/path/to/story.md' })
  })
})

describe('updateRoutingFlags', () => {
  it('merges new flags with existing', () => {
    const current = { proceed: true } as Record<string, boolean>
    const result = updateRoutingFlags(current, { blocked: true })

    expect(result.proceed).toBe(true)
    expect(result.blocked).toBe(true)
  })

  it('overwrites existing flags', () => {
    const current = { blocked: true } as Record<string, boolean>
    const result = updateRoutingFlags(current, { blocked: false })

    expect(result.blocked).toBe(false)
  })

  it('does not mutate original', () => {
    const current = { proceed: true } as Record<string, boolean>
    updateRoutingFlags(current, { blocked: true })

    expect(current).toEqual({ proceed: true })
  })
})

describe('addEvidenceRefs', () => {
  it('appends single ref', () => {
    const current = [{ type: 'test', path: '/path1', description: 'desc1' }] as const
    const newRef = { type: 'test' as const, path: '/path2', description: 'desc2' }
    const result = addEvidenceRefs(current, newRef)

    expect(result).toHaveLength(2)
    expect(result[1]).toEqual(newRef)
  })

  it('appends multiple refs', () => {
    const current = [{ type: 'test', path: '/path1', description: 'desc1' }] as const
    const newRefs = [
      { type: 'test' as const, path: '/path2', description: 'desc2' },
      { type: 'test' as const, path: '/path3', description: 'desc3' },
    ]
    const result = addEvidenceRefs(current, newRefs)

    expect(result).toHaveLength(3)
  })

  it('does not mutate original', () => {
    const current = [{ type: 'test', path: '/path1', description: 'desc1' }] as const
    addEvidenceRefs(current, { type: 'test' as const, path: '/path2', description: 'desc2' })

    expect(current).toHaveLength(1)
  })
})

describe('updateGateDecisions', () => {
  it('merges new decisions with existing', () => {
    const current = { qa: 'pass' } as Record<string, string>
    const result = updateGateDecisions(current, { implementation: 'pending' })

    expect(result.qa).toBe('pass')
    expect(result.implementation).toBe('pending')
  })

  it('overwrites existing decisions', () => {
    const current = { qa: 'pending' } as Record<string, string>
    const result = updateGateDecisions(current, { qa: 'pass' })

    expect(result.qa).toBe('pass')
  })
})

describe('addErrors', () => {
  it('appends single error', () => {
    const current = [
      {
        nodeId: 'node1',
        message: 'Error 1',
        timestamp: new Date().toISOString(),
        recoverable: false,
      },
    ]
    const newError = {
      nodeId: 'node2',
      message: 'Error 2',
      timestamp: new Date().toISOString(),
      recoverable: false,
    }
    const result = addErrors(current, newError)

    expect(result).toHaveLength(2)
    expect(result[1].nodeId).toBe('node2')
  })

  it('appends multiple errors', () => {
    const current = [] as const
    const newErrors = [
      {
        nodeId: 'node1',
        message: 'Error 1',
        timestamp: new Date().toISOString(),
        recoverable: false,
      },
      {
        nodeId: 'node2',
        message: 'Error 2',
        timestamp: new Date().toISOString(),
        recoverable: false,
      },
    ]
    const result = addErrors(current, newErrors)

    expect(result).toHaveLength(2)
  })

  it('preserves existing errors', () => {
    const current = [
      {
        nodeId: 'node1',
        message: 'Error 1',
        timestamp: new Date().toISOString(),
        recoverable: false,
      },
    ]
    const result = addErrors(current, {
      nodeId: 'node2',
      message: 'Error 2',
      timestamp: new Date().toISOString(),
      recoverable: false,
    })

    expect(result[0].nodeId).toBe('node1')
  })
})

describe('createNodeError', () => {
  it('creates error from Error object', () => {
    const error = createNodeError({
      nodeId: 'test-node',
      error: new Error('Test error'),
    })

    expect(error.nodeId).toBe('test-node')
    expect(error.message).toBe('Test error')
    expect(error.code).toBe('Error')
    expect(error.timestamp).toBeDefined()
    expect(error.recoverable).toBe(false)
  })

  it('creates error from string', () => {
    const error = createNodeError({
      nodeId: 'test-node',
      error: 'String error',
    })

    expect(error.message).toBe('String error')
  })

  it('respects custom code', () => {
    const error = createNodeError({
      nodeId: 'test-node',
      error: new Error('Test'),
      code: 'CUSTOM_CODE',
    })

    expect(error.code).toBe('CUSTOM_CODE')
  })

  it('respects recoverable flag', () => {
    const error = createNodeError({
      nodeId: 'test-node',
      error: new Error('Test'),
      recoverable: true,
    })

    expect(error.recoverable).toBe(true)
  })

  it('sanitizes stack trace', () => {
    const originalError = new Error('Test')
    const error = createNodeError({
      nodeId: 'test-node',
      error: originalError,
      stackConfig: { filterNodeModules: true },
    })

    // Stack should be defined but potentially filtered
    expect(error.stack).toBeDefined()
    if (error.stack) {
      expect(error.stack).not.toContain('node_modules')
    }
  })
})

describe('createErrorUpdate', () => {
  it('creates state update with error', () => {
    const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
    const update = createErrorUpdate(state, {
      nodeId: 'test-node',
      error: new Error('Test error'),
    })

    expect(update.errors).toBeDefined()
    expect(update.errors).toHaveLength(1)
    expect(update.errors?.[0].nodeId).toBe('test-node')
  })

  it('preserves existing errors', () => {
    const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
    // Add an existing error
    state.errors = [
      {
        nodeId: 'existing',
        message: 'Existing error',
        timestamp: new Date().toISOString(),
        recoverable: false,
      },
    ]

    const update = createErrorUpdate(state, {
      nodeId: 'new-node',
      error: new Error('New error'),
    })

    expect(update.errors).toHaveLength(2)
  })
})

describe('createBlockedUpdate', () => {
  it('creates state update with error and blocked flag', () => {
    const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
    const update = createBlockedUpdate(state, {
      nodeId: 'test-node',
      error: new Error('Blocking error'),
    })

    expect(update.errors).toBeDefined()
    expect(update.errors?.[0].recoverable).toBe(false)
    expect(update.routingFlags?.blocked).toBe(true)
  })
})

describe('createCompleteUpdate', () => {
  it('creates state update with complete flag', () => {
    const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
    const update = createCompleteUpdate(state)

    expect(update.routingFlags?.complete).toBe(true)
  })
})

describe('mergeStateUpdates', () => {
  it('merges multiple updates', () => {
    const update1 = { routingFlags: { proceed: true } }
    const update2 = { routingFlags: { blocked: false } }
    const result = mergeStateUpdates(update1, update2)

    expect(result.routingFlags).toEqual({ proceed: true, blocked: false })
  })

  it('later updates override earlier ones', () => {
    const update1 = { routingFlags: { blocked: true } }
    const update2 = { routingFlags: { blocked: false } }
    const result = mergeStateUpdates(update1, update2)

    expect(result.routingFlags?.blocked).toBe(false)
  })

  it('concatenates arrays', () => {
    const update1 = {
      errors: [
        {
          nodeId: 'node1',
          message: 'Error 1',
          timestamp: new Date().toISOString(),
          recoverable: false,
        },
      ],
    }
    const update2 = {
      errors: [
        {
          nodeId: 'node2',
          message: 'Error 2',
          timestamp: new Date().toISOString(),
          recoverable: false,
        },
      ],
    }
    const result = mergeStateUpdates(update1, update2)

    expect(result.errors).toHaveLength(2)
  })

  it('handles empty updates', () => {
    const update1 = { routingFlags: { proceed: true } }
    const result = mergeStateUpdates(update1, {})

    expect(result.routingFlags).toEqual({ proceed: true })
  })
})
