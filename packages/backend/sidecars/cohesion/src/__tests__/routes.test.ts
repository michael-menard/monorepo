/**
 * Unit Tests for Route Handlers
 * WINT-4010: Create Cohesion Sidecar
 *
 * AC-10: ≥80% branch coverage
 * AC-3: POST /cohesion/audit returns {ok: true, data: CohesionAuditResult}
 * AC-4: POST /cohesion/check returns {ok: true, data: CohesionCheckResult}
 * AC-5: Both handlers return {ok: false, error: string} on invalid input or error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  handleCohesionAuditRequest,
  handleCohesionCheckRequest,
  type CohesionRouteDeps,
} from '../routes/cohesion.js'
import type { CohesionAuditResult, CohesionCheckResult } from '../__types__/index.js'

// ============================================================================
// Test helpers
// ============================================================================

function makeReq(body: string, method = 'POST'): IncomingMessage {
  const EventEmitter = require('events')
  const req = new EventEmitter() as IncomingMessage
  req.method = method
  req.url = '/cohesion/audit'
  req.headers = {}

  // Emit data after next tick to simulate async body
  setTimeout(() => {
    req.emit('data', Buffer.from(body))
    req.emit('end')
  }, 0)

  return req
}

function makeRes(): { res: ServerResponse; statusCode: number; body: string } {
  const result = { statusCode: 0, body: '' }
  const res = {
    writeHead: (code: number) => {
      result.statusCode = code
    },
    end: (data: string) => {
      result.body = data
    },
    headersSent: false,
  } as unknown as ServerResponse

  return { res, ...result }
}

function captureRes(): { res: ServerResponse; getStatus: () => number; getBody: () => unknown } {
  let statusCode = 0
  let bodyStr = ''

  const res = {
    writeHead: (code: number) => {
      statusCode = code
    },
    end: (data: string) => {
      bodyStr = data
    },
    headersSent: false,
  } as unknown as ServerResponse

  return {
    res,
    getStatus: () => statusCode,
    getBody: () => {
      try {
        return JSON.parse(bodyStr)
      } catch {
        return bodyStr
      }
    },
  }
}

// Mock computeAudit and computeCheck functions
const mockComputeAudit = vi.fn()
const mockComputeCheck = vi.fn()
const mockDb = {} as any

const testDeps: CohesionRouteDeps = {
  computeAuditFn: mockComputeAudit,
  computeCheckFn: mockComputeCheck,
  db: mockDb,
}

// ============================================================================
// POST /cohesion/audit tests
// ============================================================================

describe('handleCohesionAuditRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AC-3: returns 200 with data on valid empty body', async () => {
    const mockResult: CohesionAuditResult = {
      frankenFeatures: [],
      coverageSummary: { totalFeatures: 0, completeCount: 0, incompleteCount: 0 },
    }
    mockComputeAudit.mockResolvedValueOnce(mockResult)

    const req = makeReq('{}')
    const { res, getStatus, getBody } = captureRes()

    await handleCohesionAuditRequest(req, res, testDeps)

    expect(getStatus()).toBe(200)
    const body = getBody() as any
    expect(body.ok).toBe(true)
    expect(body.data.frankenFeatures).toHaveLength(0)
    expect(body.data.coverageSummary.totalFeatures).toBe(0)
  })

  it('AC-3: returns 200 with franken-features on populated graph', async () => {
    const mockResult: CohesionAuditResult = {
      frankenFeatures: [
        { featureId: 'uuid-wint', featureName: 'wint', missingCapabilities: ['update', 'delete'] },
      ],
      coverageSummary: { totalFeatures: 2, completeCount: 1, incompleteCount: 1 },
    }
    mockComputeAudit.mockResolvedValueOnce(mockResult)

    const req = makeReq('{"packageName": "@repo/wint"}')
    const { res, getStatus, getBody } = captureRes()

    await handleCohesionAuditRequest(req, res, testDeps)

    expect(getStatus()).toBe(200)
    const body = getBody() as any
    expect(body.ok).toBe(true)
    expect(body.data.frankenFeatures).toHaveLength(1)
  })

  it('AC-5: returns 400 on invalid JSON body', async () => {
    const req = makeReq('not-valid-json')
    const { res, getStatus, getBody } = captureRes()

    await handleCohesionAuditRequest(req, res, testDeps)

    expect(getStatus()).toBe(400)
    const body = getBody() as any
    expect(body.ok).toBe(false)
    expect(body.error).toContain('Invalid JSON')
  })

  it('AC-5: returns 500 on compute error', async () => {
    mockComputeAudit.mockRejectedValueOnce(new Error('DB down'))

    const req = makeReq('{}')
    const { res, getStatus, getBody } = captureRes()

    await handleCohesionAuditRequest(req, res, testDeps)

    expect(getStatus()).toBe(500)
    const body = getBody() as any
    expect(body.ok).toBe(false)
    expect(body.error).toBe('Internal error')
  })

  it('returns 200 on empty body (no JSON at all)', async () => {
    const mockResult: CohesionAuditResult = {
      frankenFeatures: [],
      coverageSummary: { totalFeatures: 0, completeCount: 0, incompleteCount: 0 },
    }
    mockComputeAudit.mockResolvedValueOnce(mockResult)

    const req = makeReq('')
    const { res, getStatus, getBody } = captureRes()

    await handleCohesionAuditRequest(req, res, testDeps)

    expect(getStatus()).toBe(200)
    const body = getBody() as any
    expect(body.ok).toBe(true)
  })

  it('returns 400 when body read fails', async () => {
    // Simulate a request that errors on the data event
    const EventEmitter = require('events')
    const req = new EventEmitter() as IncomingMessage
    req.method = 'POST'
    req.url = '/cohesion/audit'
    req.headers = {}

    setTimeout(() => {
      req.emit('error', new Error('Network error'))
    }, 0)

    const { res, getStatus, getBody } = captureRes()

    await handleCohesionAuditRequest(req, res, testDeps)

    expect(getStatus()).toBe(400)
    const body = getBody() as any
    expect(body.ok).toBe(false)
  })
})

// ============================================================================
// POST /cohesion/check tests
// ============================================================================

describe('handleCohesionCheckRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AC-4: returns 200 with data on valid featureId', async () => {
    const mockResult: CohesionCheckResult = {
      featureId: 'uuid-wish',
      status: 'complete',
      violations: [],
      capabilityCoverage: { create: true, read: true, update: true, delete: true },
    }
    mockComputeCheck.mockResolvedValueOnce(mockResult)

    const req = makeReq('{"featureId": "uuid-wish"}')
    const { res, getStatus, getBody } = captureRes()

    await handleCohesionCheckRequest(req, res, testDeps)

    expect(getStatus()).toBe(200)
    const body = getBody() as any
    expect(body.ok).toBe(true)
    expect(body.data.status).toBe('complete')
    expect(body.data.featureId).toBe('uuid-wish')
  })

  it('EC-1: returns 400 when featureId is missing', async () => {
    const req = makeReq('{}')
    const { res, getStatus, getBody } = captureRes()

    await handleCohesionCheckRequest(req, res, testDeps)

    expect(getStatus()).toBe(400)
    const body = getBody() as any
    expect(body.ok).toBe(false)
    // Zod reports "Required" for missing required field; error string contains "Invalid input"
    expect(body.error).toContain('Invalid input')
  })

  it('EC-2: returns 400 on invalid JSON body', async () => {
    const req = makeReq('{invalid}')
    const { res, getStatus, getBody } = captureRes()

    await handleCohesionCheckRequest(req, res, testDeps)

    expect(getStatus()).toBe(400)
    const body = getBody() as any
    expect(body.ok).toBe(false)
  })

  it('AC-5: returns 500 on compute error', async () => {
    mockComputeCheck.mockRejectedValueOnce(new Error('DB down'))

    const req = makeReq('{"featureId": "uuid-wish"}')
    const { res, getStatus, getBody } = captureRes()

    await handleCohesionCheckRequest(req, res, testDeps)

    expect(getStatus()).toBe(500)
    const body = getBody() as any
    expect(body.ok).toBe(false)
    expect(body.error).toBe('Internal error')
  })

  it('AC-4: returns 200 with incomplete status', async () => {
    const mockResult: CohesionCheckResult = {
      featureId: 'uuid-wint',
      status: 'incomplete',
      violations: ['missing update capability', 'missing delete capability'],
      capabilityCoverage: { create: true, read: true, update: false, delete: false },
    }
    mockComputeCheck.mockResolvedValueOnce(mockResult)

    const req = makeReq('{"featureId": "uuid-wint"}')
    const { res, getStatus, getBody } = captureRes()

    await handleCohesionCheckRequest(req, res, testDeps)

    expect(getStatus()).toBe(200)
    const body = getBody() as any
    expect(body.ok).toBe(true)
    expect(body.data.status).toBe('incomplete')
    expect(body.data.violations).toHaveLength(2)
  })

  it('ED-2: returns 200 with unknown status for not-found feature', async () => {
    const mockResult: CohesionCheckResult = {
      featureId: 'nonexistent',
      status: 'unknown',
      violations: [],
      capabilityCoverage: {},
    }
    mockComputeCheck.mockResolvedValueOnce(mockResult)

    const req = makeReq('{"featureId": "nonexistent"}')
    const { res, getStatus, getBody } = captureRes()

    await handleCohesionCheckRequest(req, res, testDeps)

    expect(getStatus()).toBe(200)
    const body = getBody() as any
    expect(body.ok).toBe(true)
    expect(body.data.status).toBe('unknown')
  })

  it('returns 400 when check body read fails', async () => {
    // Simulate a request that errors on the data event
    const EventEmitter = require('events')
    const req = new EventEmitter() as IncomingMessage
    req.method = 'POST'
    req.url = '/cohesion/check'
    req.headers = {}

    setTimeout(() => {
      req.emit('error', new Error('Network error'))
    }, 0)

    const { res, getStatus, getBody } = captureRes()

    await handleCohesionCheckRequest(req, res, testDeps)

    expect(getStatus()).toBe(400)
    const body = getBody() as any
    expect(body.ok).toBe(false)
  })
})
