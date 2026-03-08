/**
 * HTTP Server Integration Tests for Cohesion Sidecar
 * WINT-4010: Create Cohesion Sidecar
 *
 * Tests the HTTP server with real route dispatching but injectable mock compute functions.
 * Starts server on port 3092 using --config /dev/null pattern.
 *
 * Per AC-11:
 * - POST /cohesion/audit → 200 valid JSON
 * - POST /cohesion/check with valid featureId → 200
 * - POST /cohesion/check missing featureId → 400
 * - POST unknown route → 404
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import { handleCohesionRequest } from '../routes/cohesion.js'
import type { CohesionAuditDeps, CohesionCheckDeps } from '../routes/cohesion.js'
import type { DrizzleDb } from '../compute-audit.js'
import type { CohesionAuditResult, CohesionCheckResult } from '../__types__/index.js'

// ============================================================================
// Mock compute functions — no real DB needed
// ============================================================================

const MOCK_AUDIT_RESULT: CohesionAuditResult = {
  frankenFeatures: [
    {
      featureId: 'feat-test',
      featureName: 'test-feature',
      missingCapabilities: ['create'],
    },
  ],
  coverageSummary: {
    totalFeatures: 2,
    completeCount: 1,
    incompleteCount: 1,
  },
}

const MOCK_CHECK_RESULT: CohesionCheckResult = {
  featureId: 'test-feature-id',
  status: 'incomplete',
  violations: ['Missing create capability'],
  capabilityCoverage: {
    create: false,
    read: true,
    update: true,
    delete: true,
  },
}

const mockDb = {} as DrizzleDb

const deps: CohesionAuditDeps & CohesionCheckDeps = {
  db: mockDb,
  computeAudit: async () => MOCK_AUDIT_RESULT,
  computeCheck: async () => MOCK_CHECK_RESULT,
}

// ============================================================================
// Test server setup
// ============================================================================

const TEST_PORT = 3093 // Use 3093 to avoid conflict with production sidecar on 3092

let server: Server

beforeAll(async () => {
  server = createServer((req, res) => {
    handleCohesionRequest(req, res, deps).catch(err => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'Internal server error' }))
      }
    })
  })

  await new Promise<void>(resolve => {
    server.listen(TEST_PORT, () => resolve())
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

async function post(path: string, body: unknown): Promise<{ status: number; json: any }> {
  const url = `http://localhost:${TEST_PORT}${path}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await response.json()
  return { status: response.status, json }
}

// ============================================================================
// Tests
// ============================================================================

describe('Cohesion Sidecar HTTP Integration Tests (AC-11)', () => {
  it('POST /cohesion/audit → 200 valid JSON', async () => {
    const { status, json } = await post('/cohesion/audit', {})

    expect(status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.data).toBeDefined()
    expect(json.data.frankenFeatures).toBeDefined()
    expect(Array.isArray(json.data.frankenFeatures)).toBe(true)
    expect(json.data.coverageSummary).toBeDefined()
    expect(typeof json.data.coverageSummary.totalFeatures).toBe('number')
  })

  it('POST /cohesion/audit with packageName → 200 valid JSON', async () => {
    const { status, json } = await post('/cohesion/audit', { packageName: '@repo/ui' })

    expect(status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.data.frankenFeatures).toBeDefined()
  })

  it('POST /cohesion/check with valid featureId → 200 valid JSON', async () => {
    const { status, json } = await post('/cohesion/check', { featureId: 'test-feature-id' })

    expect(status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.data).toBeDefined()
    expect(json.data.featureId).toBeDefined()
    expect(json.data.status).toMatch(/complete|incomplete|unknown/)
    expect(Array.isArray(json.data.violations)).toBe(true)
    expect(json.data.capabilityCoverage).toBeDefined()
  })

  it('POST /cohesion/check missing featureId → 400', async () => {
    const { status, json } = await post('/cohesion/check', {})

    expect(status).toBe(400)
    expect(json.ok).toBe(false)
    expect(json.error).toBeDefined()
  })

  it('POST unknown route → 404', async () => {
    const { status, json } = await post('/cohesion/unknown-route', {})

    expect(status).toBe(404)
    expect(json.ok).toBe(false)
    expect(json.error).toBe('Not found')
  })

  it('POST /cohesion/audit response matches CohesionAuditResult shape', async () => {
    const { status, json } = await post('/cohesion/audit', {})

    expect(status).toBe(200)
    const data = json.data
    // Validate shape (AC-3)
    expect(Array.isArray(data.frankenFeatures)).toBe(true)
    expect(typeof data.coverageSummary.totalFeatures).toBe('number')
    expect(typeof data.coverageSummary.completeCount).toBe('number')
    expect(typeof data.coverageSummary.incompleteCount).toBe('number')
  })
})
