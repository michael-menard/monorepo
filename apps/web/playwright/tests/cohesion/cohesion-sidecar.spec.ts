/**
 * E2E Tests: Cohesion Sidecar API
 * WINT-4010: Create Cohesion Sidecar
 *
 * Tests the cohesion sidecar HTTP endpoints with LIVE resources.
 * No UI surface — these are API-level tests against the sidecar service.
 *
 * Prerequisites:
 *   - Cohesion sidecar running on http://localhost:3092
 *     Start with: cd packages/backend/sidecars/cohesion && pnpm start
 *   - Database available (wint schema with features/capabilities tables)
 *
 * Sidecar ports:
 *   - role-pack:    3090
 *   - context-pack: 3091
 *   - cohesion:     3092
 */

import { test, expect } from '@playwright/test'

const COHESION_BASE_URL = process.env.COHESION_BASE_URL || 'http://localhost:3092'

test.describe('Cohesion Sidecar API — E2E (WINT-4010)', () => {
  test('POST /cohesion/audit returns 200 with valid JSON (AC-3)', async ({ request }) => {
    const response = await request.post(`${COHESION_BASE_URL}/cohesion/audit`, {
      data: {},
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.data).toBeDefined()
    expect(Array.isArray(body.data.frankenFeatures)).toBe(true)
    expect(typeof body.data.coverageSummary.totalFeatures).toBe('number')
    expect(typeof body.data.coverageSummary.completeCount).toBe('number')
    expect(typeof body.data.coverageSummary.incompleteCount).toBe('number')
  })

  test('POST /cohesion/audit with packageName filter returns 200 (AC-3)', async ({ request }) => {
    const response = await request.post(`${COHESION_BASE_URL}/cohesion/audit`, {
      data: { packageName: '@repo/ui' },
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(Array.isArray(body.data.frankenFeatures)).toBe(true)
  })

  test('POST /cohesion/check with valid featureId returns 200 (AC-4)', async ({ request }) => {
    // First get a real featureId from audit
    const auditResponse = await request.post(`${COHESION_BASE_URL}/cohesion/audit`, {
      data: {},
    })
    const auditBody = await auditResponse.json()

    // Use first franken feature ID if available, otherwise use a test ID
    const testFeatureId =
      auditBody.data?.frankenFeatures?.[0]?.featureId ?? 'nonexistent-feature-id'

    const response = await request.post(`${COHESION_BASE_URL}/cohesion/check`, {
      data: { featureId: testFeatureId },
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.data.featureId).toBeDefined()
    expect(['complete', 'incomplete', 'unknown']).toContain(body.data.status)
    expect(Array.isArray(body.data.violations)).toBe(true)
    expect(typeof body.data.capabilityCoverage.create).toBe('boolean')
    expect(typeof body.data.capabilityCoverage.read).toBe('boolean')
    expect(typeof body.data.capabilityCoverage.update).toBe('boolean')
    expect(typeof body.data.capabilityCoverage.delete).toBe('boolean')
  })

  test('POST /cohesion/check missing featureId returns 400 (AC-5)', async ({ request }) => {
    const response = await request.post(`${COHESION_BASE_URL}/cohesion/check`, {
      data: {},
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(typeof body.error).toBe('string')
  })

  test('POST unknown route returns 404 (AC-5)', async ({ request }) => {
    const response = await request.post(`${COHESION_BASE_URL}/cohesion/unknown`, {
      data: {},
    })

    expect(response.status()).toBe(404)
    const body = await response.json()
    expect(body.ok).toBe(false)
  })

  test('POST /cohesion/audit with invalid packageName (too long) returns 400 (AC-5)', async ({ request }) => {
    const response = await request.post(`${COHESION_BASE_URL}/cohesion/audit`, {
      data: { packageName: 'x'.repeat(256) },
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.ok).toBe(false)
  })
})
