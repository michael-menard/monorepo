/**
 * Pipeline Queue Factory Unit Tests (AC-3, AC-4, AC-5, AC-7, AC-9)
 *
 * Uses vi.mock to avoid real Redis/BullMQ connections.
 * Tests run without network access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ZodError } from 'zod'

// ─────────────────────────────────────────────────────────────────────────
// Hoist mock factories (required by vi.mock hoisting)
// ─────────────────────────────────────────────────────────────────────────

const { mockRedisOn, MockRedis, mockQueueAdd, MockQueue } = vi.hoisted(() => {
  const mockRedisOn = vi.fn()
  mockRedisOn.mockReturnThis()

  const MockRedis = vi.fn().mockImplementation(() => ({
    on: mockRedisOn,
  }))

  const mockQueueAdd = vi.fn().mockResolvedValue({ id: 'job-1' })
  const MockQueue = vi.fn().mockImplementation((name: string) => ({
    name,
    add: mockQueueAdd,
  }))

  return { mockRedisOn, MockRedis, mockQueueAdd, MockQueue }
})

vi.mock('ioredis', () => ({
  Redis: MockRedis,
}))

vi.mock('bullmq', () => ({
  Queue: MockQueue,
}))

// ─────────────────────────────────────────────────────────────────────────
// Import after mocks
// ─────────────────────────────────────────────────────────────────────────

import {
  PIPELINE_QUEUE_NAME,
  createPipelineConnection,
  createPipelineQueue,
} from '../index.js'

describe('PIPELINE_QUEUE_NAME', () => {
  it('equals the stable contract value "apip-pipeline"', () => {
    expect(PIPELINE_QUEUE_NAME).toBe('apip-pipeline')
  })
})

describe('createPipelineConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedisOn.mockReturnThis()
  })

  it('creates an IORedis instance with the provided URL', () => {
    createPipelineConnection('redis://localhost:6379')
    expect(MockRedis).toHaveBeenCalledWith(
      'redis://localhost:6379',
      expect.objectContaining({
        enableOfflineQueue: false,
        maxRetriesPerRequest: null,
      }),
    )
  })

  it('sets enableOfflineQueue to false (AC-4)', () => {
    createPipelineConnection('redis://localhost:6379')
    const [, opts] = MockRedis.mock.calls[0] as [string, Record<string, unknown>]
    expect(opts['enableOfflineQueue']).toBe(false)
  })

  it('sets maxRetriesPerRequest to null (required by BullMQ)', () => {
    createPipelineConnection('redis://localhost:6379')
    const [, opts] = MockRedis.mock.calls[0] as [string, Record<string, unknown>]
    expect(opts['maxRetriesPerRequest']).toBeNull()
  })

  it('does NOT use lazyConnect (AC-4)', () => {
    createPipelineConnection('redis://localhost:6379')
    const [, opts] = MockRedis.mock.calls[0] as [string, Record<string, unknown>]
    expect(opts['lazyConnect']).toBeUndefined()
  })

  it('registers event listeners for observability', () => {
    createPipelineConnection('redis://localhost:6379')
    expect(mockRedisOn).toHaveBeenCalledWith('connect', expect.any(Function))
    expect(mockRedisOn).toHaveBeenCalledWith('ready', expect.any(Function))
    expect(mockRedisOn).toHaveBeenCalledWith('error', expect.any(Function))
    expect(mockRedisOn).toHaveBeenCalledWith('close', expect.any(Function))
    expect(mockRedisOn).toHaveBeenCalledWith('reconnecting', expect.any(Function))
  })

  it('returns a new connection each call (no singleton, AC-4)', () => {
    createPipelineConnection('redis://localhost:6379')
    createPipelineConnection('redis://localhost:6379')
    expect(MockRedis).toHaveBeenCalledTimes(2)
  })
})

describe('createPipelineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedisOn.mockReturnThis()
    mockQueueAdd.mockResolvedValue({ id: 'job-1' })
  })

  it('creates a BullMQ Queue with the default queue name (AC-5)', () => {
    const mockConn = createPipelineConnection('redis://localhost:6379')
    vi.clearAllMocks()
    mockQueueAdd.mockResolvedValue({ id: 'job-1' })
    createPipelineQueue(mockConn)
    expect(MockQueue).toHaveBeenCalledWith(PIPELINE_QUEUE_NAME, expect.any(Object))
  })

  it('creates a BullMQ Queue with custom name when provided', () => {
    const mockConn = createPipelineConnection('redis://localhost:6379')
    vi.clearAllMocks()
    mockQueueAdd.mockResolvedValue({ id: 'job-1' })
    createPipelineQueue(mockConn, 'custom-queue')
    expect(MockQueue).toHaveBeenCalledWith('custom-queue', expect.any(Object))
  })

  it('configures defaultJobOptions with 3 attempts (AC-3)', () => {
    const mockConn = createPipelineConnection('redis://localhost:6379')
    vi.clearAllMocks()
    mockQueueAdd.mockResolvedValue({ id: 'job-1' })
    createPipelineQueue(mockConn)
    const [, opts] = MockQueue.mock.calls[0] as [
      string,
      { defaultJobOptions: { attempts: number } },
    ]
    expect(opts.defaultJobOptions.attempts).toBe(3)
  })

  it('configures exponential backoff with 1000ms delay (AC-3)', () => {
    const mockConn = createPipelineConnection('redis://localhost:6379')
    vi.clearAllMocks()
    mockQueueAdd.mockResolvedValue({ id: 'job-1' })
    createPipelineQueue(mockConn)
    const [, opts] = MockQueue.mock.calls[0] as [
      string,
      { defaultJobOptions: { backoff: { type: string; delay: number } } },
    ]
    expect(opts.defaultJobOptions.backoff.type).toBe('exponential')
    expect(opts.defaultJobOptions.backoff.delay).toBe(1000)
  })

  it('exposes the underlying bullQueue', () => {
    const mockConn = createPipelineConnection('redis://localhost:6379')
    vi.clearAllMocks()
    mockQueueAdd.mockResolvedValue({ id: 'job-1' })
    const pq = createPipelineQueue(mockConn)
    expect(pq.bullQueue).toBeDefined()
    expect(pq.bullQueue.name).toBe(PIPELINE_QUEUE_NAME)
  })

  describe('add() — Zod validation at enqueue time (AC-3)', () => {
    it('calls bullQueue.add with valid job data', async () => {
      const mockConn = createPipelineConnection('redis://localhost:6379')
      vi.clearAllMocks()
      mockQueueAdd.mockResolvedValue({ id: 'job-1' })
      const pq = createPipelineQueue(mockConn)
      await pq.add('process', { storyId: 'APIP-0010', phase: 'elaboration' })
      expect(mockQueueAdd).toHaveBeenCalledWith(
        'process',
        { storyId: 'APIP-0010', phase: 'elaboration' },
        undefined,
      )
    })

    it('throws ZodError for invalid job data before calling bullQueue.add', async () => {
      const mockConn = createPipelineConnection('redis://localhost:6379')
      vi.clearAllMocks()
      mockQueueAdd.mockResolvedValue({ id: 'job-1' })
      const pq = createPipelineQueue(mockConn)
      let thrown: unknown
      try {
        await pq.add('process', { storyId: '', phase: 'elaboration' })
      } catch (err) {
        thrown = err
      }
      expect(thrown).toBeInstanceOf(ZodError)
      expect(mockQueueAdd).not.toHaveBeenCalled()
    })

    it('throws ZodError for invalid phase without calling bullQueue.add', async () => {
      const mockConn = createPipelineConnection('redis://localhost:6379')
      vi.clearAllMocks()
      mockQueueAdd.mockResolvedValue({ id: 'job-1' })
      const pq = createPipelineQueue(mockConn)
      let thrown: unknown
      try {
        // @ts-expect-error — intentionally passing invalid phase to test runtime validation
        await pq.add('process', { storyId: 'APIP-0010', phase: 'deploy' })
      } catch (err) {
        thrown = err
      }
      expect(thrown).toBeInstanceOf(ZodError)
      expect(mockQueueAdd).not.toHaveBeenCalled()
    })

    it('forwards opts to bullQueue.add', async () => {
      const mockConn = createPipelineConnection('redis://localhost:6379')
      vi.clearAllMocks()
      mockQueueAdd.mockResolvedValue({ id: 'job-1' })
      const pq = createPipelineQueue(mockConn)
      const opts = { delay: 5000 }
      await pq.add('process', { storyId: 'APIP-0010', phase: 'merge' }, opts)
      expect(mockQueueAdd).toHaveBeenCalledWith('process', expect.any(Object), opts)
    })
  })
})
