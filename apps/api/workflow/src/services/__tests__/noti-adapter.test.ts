/**
 * NOTI Adapter tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { logger } from '@repo/logger'
import {
  createNotiAdapter,
  createNoopNotiAdapter,
  createCapturingNotiAdapter,
  NotiAdapterConfigSchema,
  NotiEventPayloadSchema,
  type NotiEventPayload,
} from '../noti-adapter.js'

// ============================================================================
// Helpers
// ============================================================================

function makeEvent(overrides: Partial<NotiEventPayload> = {}): NotiEventPayload {
  return {
    channel: 'pipeline-orchestrator',
    type: 'pipeline_started',
    severity: 'info',
    title: 'Pipeline started (3 stories)',
    message: 'Processing 3 stories in story mode',
    data: { storyCount: 3 },
    ...overrides,
  }
}

// ============================================================================
// Config Schema Tests
// ============================================================================

describe('NotiAdapterConfigSchema', () => {
  it('applies defaults', () => {
    const config = NotiAdapterConfigSchema.parse({})
    expect(config.baseUrl).toBe('http://localhost:3098')
    expect(config.hmacSecret).toBeUndefined()
    expect(config.timeoutMs).toBe(5_000)
  })

  it('accepts custom values', () => {
    const config = NotiAdapterConfigSchema.parse({
      baseUrl: 'http://noti:4000',
      hmacSecret: 'secret123',
      timeoutMs: 10_000,
    })
    expect(config.baseUrl).toBe('http://noti:4000')
    expect(config.hmacSecret).toBe('secret123')
    expect(config.timeoutMs).toBe(10_000)
  })

  it('rejects invalid URL', () => {
    expect(() => NotiAdapterConfigSchema.parse({ baseUrl: 'not-a-url' })).toThrow()
  })
})

// ============================================================================
// NotiEventPayloadSchema Tests
// ============================================================================

describe('NotiEventPayloadSchema', () => {
  it('validates a valid event', () => {
    const result = NotiEventPayloadSchema.safeParse(makeEvent())
    expect(result.success).toBe(true)
  })

  it('rejects missing channel', () => {
    const result = NotiEventPayloadSchema.safeParse({ ...makeEvent(), channel: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing type', () => {
    const result = NotiEventPayloadSchema.safeParse({ ...makeEvent(), type: '' })
    expect(result.success).toBe(false)
  })

  it('defaults severity to info', () => {
    const { severity: _severity, ...noSeverity } = makeEvent()
    const result = NotiEventPayloadSchema.parse(noSeverity)
    expect(result.severity).toBe('info')
  })
})

// ============================================================================
// Production Adapter Tests
// ============================================================================

describe('createNotiAdapter (production)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'test-id' }), { status: 201 }),
    )
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('POSTs event to NOTI server', async () => {
    const adapter = createNotiAdapter({ baseUrl: 'http://localhost:3098' })
    const event = makeEvent()

    await adapter.emit(event)

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, opts] = fetchSpy.mock.calls[0]
    expect(url).toBe('http://localhost:3098/events')
    expect(opts?.method).toBe('POST')
    expect(opts?.headers).toHaveProperty('Content-Type', 'application/json')
    expect(JSON.parse(opts?.body as string)).toEqual(event)
  })

  it('includes X-Signature header when hmacSecret is set', async () => {
    const adapter = createNotiAdapter({
      baseUrl: 'http://localhost:3098',
      hmacSecret: 'test-secret',
    })
    const event = makeEvent()

    await adapter.emit(event)

    const [_url, opts] = fetchSpy.mock.calls[0]
    const headers = opts?.headers as Record<string, string>
    expect(headers['X-Signature']).toBeDefined()
    expect(headers['X-Signature']).toMatch(/^[a-f0-9]{64}$/)
  })

  it('does not include X-Signature header when hmacSecret is unset', async () => {
    const adapter = createNotiAdapter({ baseUrl: 'http://localhost:3098' })
    await adapter.emit(makeEvent())

    const [_url, opts] = fetchSpy.mock.calls[0]
    const headers = opts?.headers as Record<string, string>
    expect(headers['X-Signature']).toBeUndefined()
  })

  it('logs warning on non-OK response but does not throw', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('error', { status: 500 }))
    const adapter = createNotiAdapter({ baseUrl: 'http://localhost:3098' })

    // Should not throw
    await adapter.emit(makeEvent())

    expect(logger.warn).toHaveBeenCalledWith(
      'noti-adapter: NOTI server returned non-OK status',
      expect.objectContaining({ status: 500 }),
    )
  })

  it('logs warning on network error but does not throw', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const adapter = createNotiAdapter({ baseUrl: 'http://localhost:3098' })

    // Should not throw
    await adapter.emit(makeEvent())

    expect(logger.warn).toHaveBeenCalledWith(
      'noti-adapter: failed to emit event to NOTI server',
      expect.objectContaining({ error: 'ECONNREFUSED' }),
    )
  })
})

// ============================================================================
// Noop Adapter Tests
// ============================================================================

describe('createNoopNotiAdapter', () => {
  it('does not throw on emit', async () => {
    const adapter = createNoopNotiAdapter()
    await expect(adapter.emit(makeEvent())).resolves.toBeUndefined()
  })
})

// ============================================================================
// Capturing Adapter Tests
// ============================================================================

describe('createCapturingNotiAdapter', () => {
  it('captures emitted events', async () => {
    const adapter = createCapturingNotiAdapter()

    const event1 = makeEvent({ type: 'pipeline_started' })
    const event2 = makeEvent({ type: 'story_started' })

    await adapter.emit(event1)
    await adapter.emit(event2)

    expect(adapter.events).toHaveLength(2)
    expect(adapter.events[0].type).toBe('pipeline_started')
    expect(adapter.events[1].type).toBe('story_started')
  })

  it('clears captured events', async () => {
    const adapter = createCapturingNotiAdapter()

    await adapter.emit(makeEvent())
    expect(adapter.events).toHaveLength(1)

    adapter.clear()
    expect(adapter.events).toHaveLength(0)
  })
})
