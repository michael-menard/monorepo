/**
 * Serializer Unit Tests
 *
 * HP-1: State serialization round-trip — serialize then deserialize yields identical object.
 * EC-3: Corrupted checkpoint payload — deserialization fails with clear error.
 */

import { describe, it, expect } from 'vitest'
import { serializeState, deserializeState, parseCheckpointPayload } from '../serializer.js'
import type { CheckpointPayload } from '../__types__/index.js'

describe('serializeState', () => {
  it('HP-1: serializes a plain state object to JSON-safe record', () => {
    const state = {
      storyId: 'WINT-9106',
      currentPhase: 'execute',
      count: 42,
      nested: { key: 'value', arr: [1, 2, 3] },
    }

    const result = serializeState(state)
    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data).toEqual(state)
  })

  it('HP-1: round-trip serialize then deserialize yields identical object', () => {
    const original = {
      storyId: 'WINT-9106',
      currentPhase: 'synthesis',
      warnings: ['warn-1', 'warn-2'],
      errors: [],
      attackIteration: 3,
      config: { requireHiTL: true, autoApprovalThreshold: 95 },
    }

    const serialized = serializeState(original)
    expect(serialized.success).toBe(true)
    if (!serialized.success) return

    const deserialized = deserializeState(serialized.data)
    expect(deserialized.success).toBe(true)
    if (!deserialized.success) return

    expect(deserialized.data).toEqual(original)
  })

  it('HP-1: strips function references during serialization', () => {
    const stateWithFn = {
      storyId: 'WINT-test',
      handler: () => {},
      value: 42,
    }

    const result = serializeState(stateWithFn)
    expect(result.success).toBe(true)
    if (!result.success) return

    // Functions are dropped by JSON.stringify
    expect(result.data['handler']).toBeUndefined()
    expect(result.data['value']).toBe(42)
  })

  it('handles null values correctly', () => {
    const state = { storyId: 'WINT-test', value: null, nested: null }
    const result = serializeState(state)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data['value']).toBeNull()
  })

  it('handles nested arrays correctly', () => {
    const state = { items: [1, 2, 3], nested: { arr: ['a', 'b'] } }
    const result = serializeState(state)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data['items']).toEqual([1, 2, 3])
  })
})

describe('deserializeState', () => {
  it('HP-1: deserializes a valid JSON record successfully', () => {
    const data = { storyId: 'WINT-test', phase: 'execute', count: 5 }
    const result = deserializeState(data)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toEqual(data)
  })

  it('EC-3: returns error for null input', () => {
    const result = deserializeState(null)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toContain('Deserialization failed')
  })

  it('EC-3: returns error for array input (not a record)', () => {
    const result = deserializeState([1, 2, 3])
    expect(result.success).toBe(false)
  })

  it('EC-3: returns error for primitive input', () => {
    const result = deserializeState('malformed json string')
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toContain('Deserialization failed')
  })
})

describe('parseCheckpointPayload', () => {
  it('HP-1: parses a valid checkpoint payload', () => {
    const raw: CheckpointPayload = {
      thread_id: 'test-thread-123',
      current_node: 'seed',
      state_snapshot: { storyId: 'WINT-test', phase: 'execute' },
      node_history: [
        {
          nodeName: 'initialize',
          startedAt: '2026-03-06T10:00:00.000Z',
          completedAt: '2026-03-06T10:00:01.000Z',
          success: true,
          errorMessage: null,
          durationMs: 1000,
        },
      ],
      retry_counts: { initialize: 0 },
      error_context: null,
      rollback_actions: [],
      schema_version: 1,
    }

    const result = parseCheckpointPayload(raw)
    expect(result.error).toBeNull()
    expect(result.payload).not.toBeNull()
    expect(result.payload?.thread_id).toBe('test-thread-123')
    expect(result.payload?.current_node).toBe('seed')
    expect(result.payload?.node_history).toHaveLength(1)
  })

  it('EC-3: returns error for malformed payload (missing required fields)', () => {
    const malformed = { some_field: 'value' } // Missing thread_id, current_node, etc.
    const result = parseCheckpointPayload(malformed)
    expect(result.error).not.toBeNull()
    expect(result.payload).toBeNull()
    expect(result.error).toContain('Invalid checkpoint payload')
  })

  it('EC-3: returns error for null payload', () => {
    const result = parseCheckpointPayload(null)
    expect(result.error).not.toBeNull()
    expect(result.payload).toBeNull()
  })

  it('EC-3: returns error for string payload', () => {
    const result = parseCheckpointPayload('malformed json')
    expect(result.error).not.toBeNull()
    expect(result.payload).toBeNull()
  })

  it('accepts payload with optional rollback_actions', () => {
    const raw = {
      thread_id: 'test-123',
      current_node: 'synthesis',
      state_snapshot: {},
      node_history: [],
      retry_counts: {},
      error_context: null,
      rollback_actions: [
        {
          actionType: 'delete_row',
          target: 'wint.stories',
          resourceId: 'uuid-123',
          params: {},
        },
      ],
      schema_version: 1,
    }

    const result = parseCheckpointPayload(raw)
    expect(result.error).toBeNull()
    expect(result.payload?.rollback_actions).toHaveLength(1)
    expect(result.payload?.rollback_actions[0].actionType).toBe('delete_row')
  })
})
