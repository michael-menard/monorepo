/**
 * HTTP Server Integration Tests for Cohesion Sidecar
 * WINT-4010: Create Cohesion Sidecar
 *
 * AC-11: Integration test — server starts, POST /cohesion/audit → 200,
 *        POST /cohesion/check valid → 200, missing featureId → 400, unknown route → 404
 *
 * Uses port 3093 (not 3092) to avoid conflict with production sidecar.
 * Tests mock the DB at the route level to avoid real DB dependency.
 *
 * Note: This test must be excluded from unit test coverage — run separately.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import { handleCohesionAuditRequest, handleCohesionCheckRequest } from '../routes/cohesion.js'
import type { CohesionRouteDeps } from '../routes/cohesion.js'
import type { CohesionAuditResult, CohesionCheckResult } from '../__types__/index.js'

// ============================================================================
// Integration test server setup
// Uses port 3093 to avoid conflict with production sidecar on 3092
// ============================================================================

const INTEGRATION_PORT = 3093

// Mock deps for integration testing
const mockAuditResult: CohesionAuditResult = {
  frankenFeatures: [],
  coverageSummary: { totalFeatures: 0, completeCount: 0, incompleteCount: 0 },
}

const mockCheckCompleteResult: CohesionCheckResult = {
  featureId: 'test-feature',
  status: 'complete',
  violations: [],
  capabilityCoverage: { create: true, read: true, update: true, delete: true },
}

const integrationDeps: CohesionRouteDeps = {
  computeAuditFn: async () => mockAuditResult,
  computeCheckFn: async (featureId: string) => ({
    ...mockCheckCompleteResult,
    featureId,
  }),
  db: {} as any,
}

let server: Server

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${INTEGRATION_PORT}`)
    const method = req.method?.toUpperCase() ?? 'GET'
    const path = url.pathname

    if (method === 'POST' && path === '/cohesion/audit') {
      handleCohesionAuditRequest(req, res, integrationDeps).catch(() => {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'Internal server error' }))
        }
      })
      return
    }

    if (method === 'POST' && path === '/cohesion/check') {
      handleCohesionCheckRequest(req, res, integrationDeps).catch(() => {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'Internal server error' }))
        }
      })
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: 'Not found' }))
  })

  await new Promise<void>(resolve => {
    server.listen(INTEGRATION_PORT, resolve)
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()))
  })
})

// ============================================================================
// Helper
// ============================================================================

async function post(
  path: string,
  body: unknown,
): Promise<{ status: number; body: unknown }> {
  const payload = JSON.stringify(body)

  const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const http = require('http')
    const req = http.request(
      {
        hostname: 'localhost',
        port: INTEGRATION_PORT,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res: any) => {
        let data = ''
        res.on('data', (chunk: any) => (data += chunk))
        res.on('end', () => resolve({ status: res.statusCode, body: data }))
      },
    )
    req.on('error', reject)
    req.write(payload)
    req.end()
  })

  return {
    status: response.status,
    body: JSON.parse(response.body),
  }
}

// ============================================================================
// AC-11 Integration Tests
// ============================================================================

describe('HTTP Server Integration (AC-11)', () => {
  it('AC-11: POST /cohesion/audit with empty body → 200 with valid JSON', async () => {
    const result = await post('/cohesion/audit', {})

    expect(result.status).toBe(200)
    const body = result.body as any
    expect(body.ok).toBe(true)
    expect(body.data).toBeDefined()
    expect(Array.isArray(body.data.frankenFeatures)).toBe(true)
    expect(body.data.coverageSummary).toBeDefined()
    expect(typeof body.data.coverageSummary.totalFeatures).toBe('number')
  })

  it('AC-11: POST /cohesion/check with valid featureId → 200', async () => {
    const result = await post('/cohesion/check', { featureId: 'test-feature' })

    expect(result.status).toBe(200)
    const body = result.body as any
    expect(body.ok).toBe(true)
    expect(body.data.featureId).toBe('test-feature')
    expect(['complete', 'incomplete', 'unknown']).toContain(body.data.status)
  })

  it('EC-1: POST /cohesion/check with missing featureId → 400', async () => {
    const result = await post('/cohesion/check', {})

    expect(result.status).toBe(400)
    const body = result.body as any
    expect(body.ok).toBe(false)
    expect(typeof body.error).toBe('string')
  })

  it('EC-5: POST to unknown route → 404', async () => {
    const result = await post('/cohesion/unknown', {})

    expect(result.status).toBe(404)
    const body = result.body as any
    expect(body.ok).toBe(false)
  })

  it('AC-11: POST /cohesion/audit with packageName filter → 200', async () => {
    const result = await post('/cohesion/audit', { packageName: '@repo/wint' })

    expect(result.status).toBe(200)
    const body = result.body as any
    expect(body.ok).toBe(true)
    expect(body.data.frankenFeatures).toBeDefined()
  })

  it('AC-11: POST /cohesion/check with incomplete feature → 200 with violations', async () => {
    // Override deps for this test
    const incompleteResult: CohesionCheckResult = {
      featureId: 'uuid-wint',
      status: 'incomplete',
      violations: ['missing update capability'],
      capabilityCoverage: { create: true, read: true, update: false, delete: false },
    }

    // Use a separate server on 3094 for this overridden test
    const OVERRIDE_PORT = 3094
    const overrideDeps: CohesionRouteDeps = {
      computeAuditFn: async () => mockAuditResult,
      computeCheckFn: async () => incompleteResult,
      db: {} as any,
    }

    const overrideServer = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${OVERRIDE_PORT}`)
      if (req.method === 'POST' && url.pathname === '/cohesion/check') {
        handleCohesionCheckRequest(req, res, overrideDeps).catch(() => {
          if (!res.headersSent) {
            res.writeHead(500)
            res.end(JSON.stringify({ ok: false, error: 'error' }))
          }
        })
      } else {
        res.writeHead(404)
        res.end(JSON.stringify({ ok: false, error: 'Not found' }))
      }
    })

    await new Promise<void>(resolve => overrideServer.listen(OVERRIDE_PORT, resolve))

    try {
      const http = require('http')
      const payload = JSON.stringify({ featureId: 'uuid-wint' })
      const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = http.request(
          {
            hostname: 'localhost',
            port: OVERRIDE_PORT,
            path: '/cohesion/check',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
          },
          (res: any) => {
            let data = ''
            res.on('data', (c: any) => (data += c))
            res.on('end', () => resolve({ status: res.statusCode, body: data }))
          },
        )
        req.on('error', reject)
        req.write(payload)
        req.end()
      })

      expect(response.status).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.ok).toBe(true)
      expect(body.data.status).toBe('incomplete')
      expect(body.data.violations).toContain('missing update capability')
    } finally {
      await new Promise<void>(resolve => overrideServer.close(() => resolve()))
    }
  })
})
