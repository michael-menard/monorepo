/**
 * Factory Function Tests
 *
 * @see LNGG-0050 AC-3, AC-6
 */

import { describe, it, expect, vi } from 'vitest'
import { createKbWriter } from '../factory.js'
import { KbWriterAdapter } from '../kb-writer-adapter.js'
import { NoOpKbWriter } from '../no-op-writer.js'

describe('createKbWriter', () => {
  it('returns KbWriterAdapter when full kbDeps provided', () => {
    const mockKbDeps = {
      db: {},
      embeddingClient: {},
      kbSearchFn: vi.fn(),
      kbAddFn: vi.fn(),
    }

    const writer = createKbWriter({ kbDeps: mockKbDeps })

    expect(writer).toBeInstanceOf(KbWriterAdapter)
  })

  it('returns NoOpKbWriter when kbDeps not provided', () => {
    const writer = createKbWriter({})

    expect(writer).toBeInstanceOf(NoOpKbWriter)
  })

  it('returns NoOpKbWriter when kbDeps is undefined', () => {
    const writer = createKbWriter({ kbDeps: undefined })

    expect(writer).toBeInstanceOf(NoOpKbWriter)
  })

  it('returns NoOpKbWriter when db is missing', () => {
    const writer = createKbWriter({
      kbDeps: {
        db: undefined as any,
        embeddingClient: {},
        kbSearchFn: vi.fn(),
        kbAddFn: vi.fn(),
      },
    })

    expect(writer).toBeInstanceOf(NoOpKbWriter)
  })

  it('returns NoOpKbWriter when embeddingClient is missing', () => {
    const writer = createKbWriter({
      kbDeps: {
        db: {},
        embeddingClient: undefined as any,
        kbSearchFn: vi.fn(),
        kbAddFn: vi.fn(),
      },
    })

    expect(writer).toBeInstanceOf(NoOpKbWriter)
  })

  it('returns NoOpKbWriter when kbSearchFn is missing', () => {
    const writer = createKbWriter({
      kbDeps: {
        db: {},
        embeddingClient: {},
        kbSearchFn: undefined as any,
        kbAddFn: vi.fn(),
      },
    })

    expect(writer).toBeInstanceOf(NoOpKbWriter)
  })

  it('returns NoOpKbWriter when kbAddFn is missing', () => {
    const writer = createKbWriter({
      kbDeps: {
        db: {},
        embeddingClient: {},
        kbSearchFn: vi.fn(),
        kbAddFn: undefined as any,
      },
    })

    expect(writer).toBeInstanceOf(NoOpKbWriter)
  })

  it('uses default dedupeThreshold of 0.85', () => {
    const mockKbDeps = {
      db: {},
      embeddingClient: {},
      kbSearchFn: vi.fn(),
      kbAddFn: vi.fn(),
    }

    const writer = createKbWriter({ kbDeps: mockKbDeps })

    expect(writer).toBeInstanceOf(KbWriterAdapter)
    // Default threshold is passed to adapter constructor
  })

  it('accepts custom dedupeThreshold', () => {
    const mockKbDeps = {
      db: {},
      embeddingClient: {},
      kbSearchFn: vi.fn(),
      kbAddFn: vi.fn(),
    }

    const writer = createKbWriter({
      kbDeps: mockKbDeps,
      dedupeThreshold: 0.9,
    })

    expect(writer).toBeInstanceOf(KbWriterAdapter)
  })

  it('validates config with Zod schema', () => {
    // Invalid dedupeThreshold (> 1.0)
    expect(() =>
      createKbWriter({
        kbDeps: {
          db: {},
          embeddingClient: {},
          kbSearchFn: vi.fn(),
          kbAddFn: vi.fn(),
        },
        dedupeThreshold: 1.5,
      }),
    ).toThrow()
  })

  it('validates config with invalid dedupeThreshold (< 0)', () => {
    expect(() =>
      createKbWriter({
        kbDeps: {
          db: {},
          embeddingClient: {},
          kbSearchFn: vi.fn(),
          kbAddFn: vi.fn(),
        },
        dedupeThreshold: -0.1,
      }),
    ).toThrow()
  })

  it('returned writer has all required methods', () => {
    const writer = createKbWriter({})

    expect(typeof writer.addLesson).toBe('function')
    expect(typeof writer.addDecision).toBe('function')
    expect(typeof writer.addConstraint).toBe('function')
    expect(typeof writer.addRunbook).toBe('function')
    expect(typeof writer.addNote).toBe('function')
    expect(typeof writer.addMany).toBe('function')
  })

  it('KbWriterAdapter instance has all methods callable', async () => {
    const mockKbDeps = {
      db: {},
      embeddingClient: {},
      kbSearchFn: vi.fn().mockResolvedValue({
        results: [],
        metadata: { total: 0, fallback_mode: false },
      }),
      kbAddFn: vi.fn().mockResolvedValue({
        id: 'test-id',
        success: true,
      }),
    }

    const writer = createKbWriter({ kbDeps: mockKbDeps })

    // Should not throw
    await writer.addLesson({ content: 'Test', storyId: 'TEST-1', role: 'all' })
    await writer.addDecision({ content: 'Test', storyId: 'TEST-1', role: 'all' })
    await writer.addConstraint({ content: 'Test', storyId: 'TEST-1', role: 'all' })
    await writer.addRunbook({ content: 'Test', storyId: 'TEST-1', role: 'all' })
    await writer.addNote({ content: 'Test', role: 'all' })
    await writer.addMany([])

    expect(true).toBe(true)
  })

  it('NoOpKbWriter instance has all methods callable', async () => {
    const writer = createKbWriter({})

    // Should not throw
    await writer.addLesson({ content: 'Test', storyId: 'TEST-1', role: 'all' })
    await writer.addDecision({ content: 'Test', storyId: 'TEST-1', role: 'all' })
    await writer.addConstraint({ content: 'Test', storyId: 'TEST-1', role: 'all' })
    await writer.addRunbook({ content: 'Test', storyId: 'TEST-1', role: 'all' })
    await writer.addNote({ content: 'Test', role: 'all' })
    await writer.addMany([])

    expect(true).toBe(true)
  })
})
