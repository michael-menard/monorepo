/**
 * HTTP Route Handler Tests for Gatekeeper Sidecar
 * WINT-3010: Create Gatekeeper Sidecar
 *
 * Tests the handleGateCheckRequest route handler by constructing
 * mock IncomingMessage and ServerResponse objects.
 *
 * AC-3: POST /gate/check handler with Zod validation; 400 on invalid input
 * AC-5: Proof payloads use nested artifact-mirroring structures per spec
 * AC-8: sendJson/readBody from @repo/sidecar-http-utils
 * AC-12: SEC-002 auth-deferral comment present (verified at code level)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { EventEmitter } from 'node:events'
import { handleGateCheckRequest } from '../routes/gate.js'

// ============================================================================
// Mock helpers
// ============================================================================

function createMockRequest(body: string): IncomingMessage {
  const emitter = new EventEmitter() as IncomingMessage
  emitter.method = 'POST'
  emitter.url = '/gate/check'
  emitter.headers = { 'content-type': 'application/json' }

  // Emit data asynchronously to simulate stream
  setImmediate(() => {
    emitter.emit('data', Buffer.from(body))
    emitter.emit('end')
  })

  return emitter
}

function createMockResponse() {
  const chunks: string[] = []
  let statusCode = 0
  let headers: Record<string, string | number> = {}
  let ended = false

  const res = {
    writeHead: vi.fn((status: number, hdrs?: Record<string, string | number>) => {
      statusCode = status
      if (hdrs) headers = { ...headers, ...hdrs }
    }),
    end: vi.fn((data?: string) => {
      if (data) chunks.push(data)
      ended = true
    }),
    headersSent: false,
    getStatus: () => statusCode,
    getBody: () => {
      try {
        return JSON.parse(chunks.join(''))
      } catch {
        return chunks.join('')
      }
    },
    isEnded: () => ended,
  }

  return res as unknown as ServerResponse & {
    getStatus: () => number
    getBody: () => any
    isEnded: () => boolean
  }
}

// ============================================================================
// Route handler tests
// ============================================================================

describe('handleGateCheckRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 ok:true for valid POST_BOOTSTRAP request', async () => {
    const body = JSON.stringify({
      stage: 'POST_BOOTSTRAP',
      story_id: 'WINT-3010',
      proof: {
        checkpoint: {
          phase: 'setup_complete',
        },
      },
    })
    const req = createMockRequest(body)
    const res = createMockResponse()

    await handleGateCheckRequest(req, res as any)

    expect(res.getStatus()).toBe(200)
    const responseBody = res.getBody()
    expect(responseBody.ok).toBe(true)
    expect(responseBody.data.passed).toBe(true)
    expect(responseBody.data.stage).toBe('POST_BOOTSTRAP')
  })

  it('returns 422 ok:false with missing_proofs for invalid POST_BOOTSTRAP proof', async () => {
    const body = JSON.stringify({
      stage: 'POST_BOOTSTRAP',
      story_id: 'WINT-3010',
      proof: {
        checkpoint: {
          phase: 'wrong_phase',
        },
      },
    })
    const req = createMockRequest(body)
    const res = createMockResponse()

    await handleGateCheckRequest(req, res as any)

    expect(res.getStatus()).toBe(422)
    const responseBody = res.getBody()
    expect(responseBody.ok).toBe(false)
    expect(responseBody.error).toBe('Gate check failed')
    expect(Array.isArray(responseBody.missing_proofs)).toBe(true)
  })

  it('returns 400 for empty body', async () => {
    const req = createMockRequest('')
    const res = createMockResponse()

    await handleGateCheckRequest(req, res as any)

    expect(res.getStatus()).toBe(400)
    const responseBody = res.getBody()
    expect(responseBody.ok).toBe(false)
    expect(responseBody.error).toBe('Request body is required')
  })

  it('returns 400 for invalid JSON', async () => {
    const req = createMockRequest('not-valid-json')
    const res = createMockResponse()

    await handleGateCheckRequest(req, res as any)

    expect(res.getStatus()).toBe(400)
    const responseBody = res.getBody()
    expect(responseBody.ok).toBe(false)
    expect(responseBody.error).toBe('Invalid JSON body')
  })

  it('returns 400 for invalid stage value', async () => {
    const body = JSON.stringify({
      stage: 'UNKNOWN_STAGE',
      story_id: 'WINT-3010',
      proof: {},
    })
    const req = createMockRequest(body)
    const res = createMockResponse()

    await handleGateCheckRequest(req, res as any)

    expect(res.getStatus()).toBe(400)
    const responseBody = res.getBody()
    expect(responseBody.ok).toBe(false)
    expect(responseBody.error).toMatch(/Invalid request/)
  })

  it('returns 200 for valid ELAB_COMPLETE with CONDITIONAL_PASS', async () => {
    const body = JSON.stringify({
      stage: 'ELAB_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        elab: {
          verdict: 'CONDITIONAL_PASS',
          findings: ['Minor gap in AC-3, acceptable risk'],
        },
      },
    })
    const req = createMockRequest(body)
    const res = createMockResponse()

    await handleGateCheckRequest(req, res as any)

    expect(res.getStatus()).toBe(200)
    const responseBody = res.getBody()
    expect(responseBody.ok).toBe(true)
  })

  it('returns 200 for valid PATCH_COMPLETE with touched_files > 0', async () => {
    const body = JSON.stringify({
      stage: 'PATCH_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        evidence: {
          touched_files: 5,
        },
      },
    })
    const req = createMockRequest(body)
    const res = createMockResponse()

    await handleGateCheckRequest(req, res as any)

    expect(res.getStatus()).toBe(200)
    expect(res.getBody().ok).toBe(true)
  })

  it('returns 400 for body read failure', async () => {
    const emitter = new EventEmitter() as IncomingMessage
    emitter.method = 'POST'
    emitter.url = '/gate/check'
    emitter.headers = {}

    // Emit an error to simulate body read failure
    setImmediate(() => {
      emitter.emit('error', new Error('Connection reset'))
    })

    const res = createMockResponse()
    await handleGateCheckRequest(emitter, res as any)

    expect(res.getStatus()).toBe(400)
    expect(res.getBody().ok).toBe(false)
  })
})
