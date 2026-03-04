/**
 * Tests for http-handler.ts
 * WINT-2010 AC coverage: AC-2 (HTTP endpoint), AC-7 (200/400/404 responses)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleRolePackRequest } from '../http-handler.js'

vi.mock('../role-pack-reader.js', () => ({
  readRolePack: vi.fn(),
  clearRolePackCache: vi.fn(),
}))

import { readRolePack } from '../role-pack-reader.js'

const mockReadRolePack = vi.mocked(readRolePack)

const MOCK_CONTENT = `---
role: dev
version: 1
---

# Dev Role Pack content
`

function makeReq(url: string): Partial<IncomingMessage> {
  return {
    url,
    headers: { host: 'localhost:3090' },
  }
}

function makeRes() {
  let capturedStatus: number | undefined
  let capturedBody = ''
  const capturedHeaders: Record<string, string | number> = {}

  const res = {
    headersSent: false,
    writeHead(status: number, headers?: Record<string, string | number>) {
      capturedStatus = status
      if (headers) Object.assign(capturedHeaders, headers)
      return this
    },
    end(chunk?: string) {
      if (chunk) capturedBody += chunk
      return this
    },
    getStatus: () => capturedStatus,
    getBody: () => capturedBody,
    getHeaders: () => capturedHeaders,
  }

  return res
}

describe('handleRolePackRequest', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 200 with content on valid role', async () => {
    mockReadRolePack.mockResolvedValueOnce({ content: MOCK_CONTENT, version: 1 })

    const req = makeReq('/role-pack?role=dev')
    const res = makeRes()

    await handleRolePackRequest(req as IncomingMessage, res as unknown as ServerResponse)

    expect(res.getStatus()).toBe(200)
    expect(res.getHeaders()['Content-Type']).toBe('application/json')
    const parsed = JSON.parse(res.getBody())
    expect(parsed.ok).toBe(true)
    expect(parsed.role).toBe('dev')
    expect(parsed.content).toBe(MOCK_CONTENT)
    expect(parsed.version).toBe(1)
  })

  it('returns 400 when role param is missing', async () => {
    const req = makeReq('/role-pack')
    const res = makeRes()

    await handleRolePackRequest(req as IncomingMessage, res as unknown as ServerResponse)

    expect(res.getStatus()).toBe(400)
    expect(res.getHeaders()['Content-Type']).toBe('application/json')
    const parsed = JSON.parse(res.getBody())
    expect(parsed.ok).toBe(false)
    expect(typeof parsed.error).toBe('string')
  })

  it('returns 400 when role param is invalid (pm not allowed)', async () => {
    const req = makeReq('/role-pack?role=pm')
    const res = makeRes()

    await handleRolePackRequest(req as IncomingMessage, res as unknown as ServerResponse)

    expect(res.getStatus()).toBe(400)
    const parsed = JSON.parse(res.getBody())
    expect(parsed.ok).toBe(false)
  })

  it('returns 404 when role pack file not found', async () => {
    mockReadRolePack.mockResolvedValueOnce(null)

    const req = makeReq('/role-pack?role=qa')
    const res = makeRes()

    await handleRolePackRequest(req as IncomingMessage, res as unknown as ServerResponse)

    expect(res.getStatus()).toBe(404)
    const parsed = JSON.parse(res.getBody())
    expect(parsed.ok).toBe(false)
    expect(parsed.error).toContain('qa')
  })

  it('returns 404 for unknown paths', async () => {
    const req = makeReq('/health')
    const res = makeRes()

    await handleRolePackRequest(req as IncomingMessage, res as unknown as ServerResponse)

    expect(res.getStatus()).toBe(404)
  })
})
