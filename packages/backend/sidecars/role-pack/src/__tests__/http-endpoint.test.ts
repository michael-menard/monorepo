/**
 * Tests for http-handler.ts
 * WINT-2010: Create Role Pack Sidecar Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IncomingMessage, ServerResponse } from 'http'
import { Socket } from 'net'
import { handleRolePackRequest } from '../http-handler.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock role-pack-reader
vi.mock('../role-pack-reader.js', () => ({
  readRolePack: vi.fn(),
  clearRolePackCache: vi.fn(),
}))

/** Helper to create a mock IncomingMessage for GET requests */
function makeRequest(url: string, method = 'GET'): IncomingMessage {
  const req = new IncomingMessage(new Socket())
  req.url = url
  req.method = method
  return req
}

/** Helper to create a mock ServerResponse that captures writes */
function makeResponse(): { res: ServerResponse; getBody: () => string; getStatus: () => number } {
  let statusCode = 200
  let body = ''
  const headers: Record<string, string> = {}

  const res = {
    writeHead: vi.fn((status: number, hdrs: Record<string, string>) => {
      statusCode = status
      Object.assign(headers, hdrs)
    }),
    end: vi.fn((data: string) => {
      body = data
    }),
    headersSent: false,
  } as unknown as ServerResponse

  return {
    res,
    getBody: () => body,
    getStatus: () => statusCode,
  }
}

describe('handleRolePackRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with content for valid role', async () => {
    const { readRolePack } = await import('../role-pack-reader.js')
    vi.mocked(readRolePack).mockResolvedValueOnce({ content: 'Dev content here.', version: 1 })

    const req = makeRequest('/role-pack?role=dev')
    const { res, getBody, getStatus } = makeResponse()

    await handleRolePackRequest(req, res)

    expect(getStatus()).toBe(200)
    const body = JSON.parse(getBody())
    expect(body).toEqual({ content: 'Dev content here.' })
  })

  it('returns 400 when role param is missing', async () => {
    const req = makeRequest('/role-pack')
    const { res, getBody, getStatus } = makeResponse()

    await handleRolePackRequest(req, res)

    expect(getStatus()).toBe(400)
    const body = JSON.parse(getBody())
    expect(body).toEqual({ error: 'role is required' })
  })

  it('returns 400 for unknown role (pm is not in allowlist)', async () => {
    const req = makeRequest('/role-pack?role=pm')
    const { res, getBody, getStatus } = makeResponse()

    await handleRolePackRequest(req, res)

    expect(getStatus()).toBe(400)
    const body = JSON.parse(getBody())
    expect(body).toEqual({ error: 'Unknown role' })
  })

  it('returns 404 when role pack file is not found', async () => {
    const { readRolePack } = await import('../role-pack-reader.js')
    vi.mocked(readRolePack).mockResolvedValueOnce(null)

    const req = makeRequest('/role-pack?role=qa')
    const { res, getBody, getStatus } = makeResponse()

    await handleRolePackRequest(req, res)

    expect(getStatus()).toBe(404)
    const body = JSON.parse(getBody())
    expect(body).toEqual({ error: 'Role pack not available' })
  })

  it('returns 404 with available version on version mismatch', async () => {
    const { readRolePack } = await import('../role-pack-reader.js')
    vi.mocked(readRolePack).mockResolvedValueOnce({ content: 'Content.', version: 1 })

    const req = makeRequest('/role-pack?role=dev&v=99')
    const { res, getBody, getStatus } = makeResponse()

    await handleRolePackRequest(req, res)

    expect(getStatus()).toBe(404)
    const body = JSON.parse(getBody())
    expect(body).toEqual({ error: 'Version not found', available: 1 })
  })

  it('returns 200 with content when version param matches', async () => {
    const { readRolePack } = await import('../role-pack-reader.js')
    vi.mocked(readRolePack).mockResolvedValueOnce({ content: 'Da content.', version: 1 })

    const req = makeRequest('/role-pack?role=da&v=1')
    const { res, getBody, getStatus } = makeResponse()

    await handleRolePackRequest(req, res)

    expect(getStatus()).toBe(200)
    const body = JSON.parse(getBody())
    expect(body).toEqual({ content: 'Da content.' })
  })

  it('returns 404 for unknown paths', async () => {
    const req = makeRequest('/unknown-path')
    const { res, getBody, getStatus } = makeResponse()

    await handleRolePackRequest(req, res)

    expect(getStatus()).toBe(404)
    const body = JSON.parse(getBody())
    expect(body).toEqual({ error: 'Not found' })
  })

  it('sets Content-Type: application/json on all responses', async () => {
    const req = makeRequest('/role-pack')
    const { res } = makeResponse()

    await handleRolePackRequest(req, res)

    expect(res.writeHead).toHaveBeenCalledWith(
      400,
      expect.objectContaining({ 'Content-Type': 'application/json' }),
    )
  })
})
