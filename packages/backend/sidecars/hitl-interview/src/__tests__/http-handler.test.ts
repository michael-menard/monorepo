/**
 * Unit Tests for HTTP Handler
 * WINT-5010: Create HiTL Interview Sidecar
 *
 * AC-9: Uses sendJson and readBody from @repo/sidecar-http-utils
 * AC-10: ≥45% coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { EventEmitter } from 'node:events'
import { handleHitlInterviewRequest } from '../http-handler.js'

// ============================================================================
// HTTP test helpers
// ============================================================================

function createMockRequest(body: unknown, method = 'POST'): IncomingMessage {
  const emitter = new EventEmitter() as any
  emitter.method = method
  emitter.url = '/hitl-interview'
  emitter.headers = { host: 'localhost' }

  // Simulate body chunks
  process.nextTick(() => {
    emitter.emit('data', Buffer.from(JSON.stringify(body)))
    emitter.emit('end')
  })

  return emitter
}

function createMockResponse() {
  const res: Partial<ServerResponse> = {
    headersSent: false,
    writeHead: vi.fn(),
    end: vi.fn(),
  }
  return res as ServerResponse
}

// ============================================================================
// Valid request fixtures
// ============================================================================

const validBody = {
  storyId: 'WINT-5010',
  phase: 'qa',
  decisionType: 'qa_gate',
  answers: {
    rationale: 'All tests pass',
    confidence: 0.9,
    alternativesConsidered: 'Skip QA',
    riskAssessment: 'Low risk',
  },
}

const mockIngestResult = {
  id: 'result-uuid',
  dataType: 'qa_gate_decision',
  storyId: 'WINT-5010',
}

// ============================================================================
// Tests
// ============================================================================

describe('handleHitlInterviewRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('HP-1: returns 200 with data on valid request', async () => {
    const req = createMockRequest(validBody)
    const res = createMockResponse()

    const mockCaptureFn = vi.fn().mockResolvedValue(mockIngestResult)

    await handleHitlInterviewRequest(req, res, { captureInterviewFn: mockCaptureFn })

    expect(res.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ 'Content-Type': 'application/json' }),
    )
    expect(res.end).toHaveBeenCalledWith(
      expect.stringContaining('"ok":true'),
    )
    expect(res.end).toHaveBeenCalledWith(
      expect.stringContaining('"id":"result-uuid"'),
    )
  })

  it('HP-2: calls captureInterview with correct params', async () => {
    const req = createMockRequest(validBody)
    const res = createMockResponse()

    const mockCaptureFn = vi.fn().mockResolvedValue(mockIngestResult)

    await handleHitlInterviewRequest(req, res, { captureInterviewFn: mockCaptureFn })

    expect(mockCaptureFn).toHaveBeenCalledWith(
      expect.objectContaining({
        storyId: 'WINT-5010',
        phase: 'qa',
        decisionType: 'qa_gate',
      }),
      expect.objectContaining({
        rationale: 'All tests pass',
        confidence: 0.9,
      }),
    )
  })

  it('EC-1: returns 400 when decisionType is invalid', async () => {
    const req = createMockRequest({ ...validBody, decisionType: 'invalid' })
    const res = createMockResponse()
    const mockCaptureFn = vi.fn()

    await handleHitlInterviewRequest(req, res, { captureInterviewFn: mockCaptureFn })

    expect(res.writeHead).toHaveBeenCalledWith(
      400,
      expect.objectContaining({ 'Content-Type': 'application/json' }),
    )
    expect(mockCaptureFn).not.toHaveBeenCalled()
  })

  it('EC-2: returns 400 when answers are invalid (empty rationale)', async () => {
    const req = createMockRequest({
      ...validBody,
      answers: { ...validBody.answers, rationale: '' },
    })
    const res = createMockResponse()
    const mockCaptureFn = vi.fn()

    await handleHitlInterviewRequest(req, res, { captureInterviewFn: mockCaptureFn })

    expect(res.writeHead).toHaveBeenCalledWith(
      400,
      expect.objectContaining({ 'Content-Type': 'application/json' }),
    )
    expect(mockCaptureFn).not.toHaveBeenCalled()
  })

  it('EC-3: returns 400 when body is invalid JSON', async () => {
    const emitter = new EventEmitter() as any
    emitter.method = 'POST'
    emitter.url = '/hitl-interview'
    emitter.headers = { host: 'localhost' }

    process.nextTick(() => {
      emitter.emit('data', Buffer.from('{ invalid json }'))
      emitter.emit('end')
    })

    const res = createMockResponse()
    const mockCaptureFn = vi.fn()

    await handleHitlInterviewRequest(emitter as IncomingMessage, res, {
      captureInterviewFn: mockCaptureFn,
    })

    expect(res.writeHead).toHaveBeenCalledWith(
      400,
      expect.objectContaining({ 'Content-Type': 'application/json' }),
    )
  })

  it('EC-4: returns 500 when captureInterview returns null', async () => {
    const req = createMockRequest(validBody)
    const res = createMockResponse()
    const mockCaptureFn = vi.fn().mockResolvedValue(null)

    await handleHitlInterviewRequest(req, res, { captureInterviewFn: mockCaptureFn })

    expect(res.writeHead).toHaveBeenCalledWith(
      500,
      expect.objectContaining({ 'Content-Type': 'application/json' }),
    )
    expect(res.end).toHaveBeenCalledWith(
      expect.stringContaining('"ok":false'),
    )
  })

  it('EC-5: returns 500 on internal error', async () => {
    const req = createMockRequest(validBody)
    const res = createMockResponse()
    const mockCaptureFn = vi.fn().mockRejectedValue(new Error('DB down'))

    await handleHitlInterviewRequest(req, res, { captureInterviewFn: mockCaptureFn })

    expect(res.writeHead).toHaveBeenCalledWith(
      500,
      expect.objectContaining({ 'Content-Type': 'application/json' }),
    )
  })

  it('HP-3: returns 400 when storyId is missing', async () => {
    const bodyWithoutStoryId = { phase: 'qa', decisionType: 'qa_gate', answers: validBody.answers }
    const req = createMockRequest(bodyWithoutStoryId)
    const res = createMockResponse()
    const mockCaptureFn = vi.fn()

    await handleHitlInterviewRequest(req, res, { captureInterviewFn: mockCaptureFn })

    expect(res.writeHead).toHaveBeenCalledWith(
      400,
      expect.objectContaining({ 'Content-Type': 'application/json' }),
    )
    expect(mockCaptureFn).not.toHaveBeenCalled()
  })
})
