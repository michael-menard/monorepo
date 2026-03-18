/**
 * SSE endpoint tests
 *
 * Tests the PG LISTEN fan-out and SSE streaming behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'

// ── pg.Client mock ──────────────────────────────────────────────────────────

class MockPgClient extends EventEmitter {
  connect = vi.fn().mockResolvedValue(undefined)
  query = vi.fn().mockResolvedValue(undefined)
  end = vi.fn().mockResolvedValue(undefined)
}

let mockClientInstance: MockPgClient

vi.mock('pg', () => ({
  Client: vi.fn(() => {
    mockClientInstance = new MockPgClient()
    return mockClientInstance
  }),
}))

// Import AFTER mocks are in place
const { sseRoutes, _resetForTests } = await import('../sse')

// ── Helpers ─────────────────────────────────────────────────────────────────

function readSSELines(
  response: Response,
  opts: { maxLines?: number; timeoutMs?: number } = {},
): Promise<string[]> {
  const { maxLines = 20, timeoutMs = 2000 } = opts
  return new Promise(resolve => {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    const lines: string[] = []
    const timer = setTimeout(() => {
      reader.cancel()
      resolve(lines)
    }, timeoutMs)

    const pump = async () => {
      try {
        const { done, value } = await reader.read()
        if (done) {
          clearTimeout(timer)
          resolve(lines)
          return
        }
        const text = decoder.decode(value, { stream: true })
        lines.push(...text.split('\n').filter(l => l.length > 0))
        if (lines.length >= maxLines) {
          clearTimeout(timer)
          reader.cancel()
          resolve(lines)
          return
        }
        await pump()
      } catch {
        clearTimeout(timer)
        resolve(lines)
      }
    }

    pump()
  })
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('SSE endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetForTests()
  })

  it('returns correct SSE headers', async () => {
    const request = new Request('http://localhost/api/v1/events/stories')
    const response = await sseRoutes.fetch(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/event-stream')
    expect(response.headers.get('cache-control')).toContain('no-cache')

    response.body?.cancel()
  })

  it('issues LISTEN on the pg client', async () => {
    const request = new Request('http://localhost/api/v1/events/stories')
    const response = await sseRoutes.fetch(request)

    // Give the stream callback time to run ensurePgListener
    await new Promise(r => setTimeout(r, 100))

    expect(mockClientInstance.connect).toHaveBeenCalled()
    expect(mockClientInstance.query).toHaveBeenCalledWith('LISTEN story_state_changed')

    response.body?.cancel()
  })

  it('forwards pg notification as SSE event data', async () => {
    const request = new Request('http://localhost/api/v1/events/stories')
    const response = await sseRoutes.fetch(request)

    // Wait for listener to be set up
    await new Promise(r => setTimeout(r, 100))

    const payload = JSON.stringify({
      storyId: 'TEST-001',
      fromState: 'ready',
      toState: 'in_progress',
    })

    mockClientInstance.emit('notification', {
      channel: 'story_state_changed',
      payload,
    })

    const lines = await readSSELines(response, { maxLines: 5, timeoutMs: 500 })
    const combined = lines.join('\n')

    expect(combined).toContain('event: story_state_changed')
    expect(combined).toContain(`data: ${payload}`)
  })

  it('ignores notifications on other channels', async () => {
    const request = new Request('http://localhost/api/v1/events/stories')
    const response = await sseRoutes.fetch(request)

    await new Promise(r => setTimeout(r, 100))

    mockClientInstance.emit('notification', {
      channel: 'other_channel',
      payload: '{"irrelevant": true}',
    })

    const lines = await readSSELines(response, { maxLines: 5, timeoutMs: 300 })
    const combined = lines.join('\n')

    expect(combined).not.toContain('story_state_changed')
    expect(combined).not.toContain('irrelevant')
  })
})
