/**
 * Set Instances API Route Integration Tests
 *
 * Requires:
 * - PostgreSQL running with lego-api schema
 * - lego-api running at localhost:9100 (or LEGO_API_URL env)
 *
 * Tests the full request/response cycle for set instance endpoints.
 * Auth bypass must be enabled (AUTH_BYPASS=true) for dev mode.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const API_BASE = process.env.LEGO_API_URL || 'http://localhost:9100'

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  const body = res.status === 204 ? null : await res.json().catch(() => null)
  return { status: res.status, body }
}

// Track IDs for cleanup
let testSetId: string
const createdInstanceIds: string[] = []

beforeAll(async () => {
  // Create a test set to hold instances
  const { status, body } = await api('/sets', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Integration Test Set - Instances',
      status: 'wanted',
    }),
  })

  if (status !== 201 || !body?.id) {
    throw new Error(`Failed to create test set: status=${status} body=${JSON.stringify(body)}`)
  }

  testSetId = body.id
})

afterAll(async () => {
  // Clean up instances
  for (const id of createdInstanceIds) {
    await api(`/sets/instances/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  // Clean up test set
  if (testSetId) {
    await api(`/sets/${testSetId}`, { method: 'DELETE' }).catch(() => {})
  }
})

// ─────────────────────────────────────────────────────────────────────────
// POST /:setId/instances
// ─────────────────────────────────────────────────────────────────────────

describe('POST /:setId/instances', () => {
  it('creates and returns instance with 201', async () => {
    const { status, body } = await api(`/sets/${testSetId}/instances`, {
      method: 'POST',
      body: JSON.stringify({
        condition: 'new',
        completeness: 'sealed',
        buildStatus: 'not_started',
        notes: 'Test instance',
      }),
    })

    expect(status).toBe(201)
    expect(body.id).toBeTruthy()
    expect(body.setId).toBe(testSetId)
    expect(body.condition).toBe('new')
    expect(body.completeness).toBe('sealed')
    expect(body.buildStatus).toBe('not_started')
    expect(body.notes).toBe('Test instance')

    createdInstanceIds.push(body.id)
  })

  it('creates instance with minimal input (empty body)', async () => {
    const { status, body } = await api(`/sets/${testSetId}/instances`, {
      method: 'POST',
      body: JSON.stringify({}),
    })

    expect(status).toBe(201)
    expect(body.id).toBeTruthy()
    expect(body.setId).toBe(testSetId)

    createdInstanceIds.push(body.id)
  })

  it('returns 404 for non-existent set', async () => {
    const fakeSetId = '00000000-0000-0000-0000-000000000000'
    const { status, body } = await api(`/sets/${fakeSetId}/instances`, {
      method: 'POST',
      body: JSON.stringify({}),
    })

    expect(status).toBe(404)
    expect(body.error).toBe('NOT_FOUND')
  })
})

// ─────────────────────────────────────────────────────────────────────────
// GET /:setId/instances
// ─────────────────────────────────────────────────────────────────────────

describe('GET /:setId/instances', () => {
  it('returns instance array', async () => {
    const { status, body } = await api(`/sets/${testSetId}/instances`)

    expect(status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)

    // Verify shape of first instance
    const inst = body[0]
    expect(inst.id).toBeTruthy()
    expect(inst.setId).toBe(testSetId)
  })

  it('returns empty array when none exist', async () => {
    // Create a fresh set with no instances
    const { body: freshSet } = await api('/sets', {
      method: 'POST',
      body: JSON.stringify({ title: 'Empty Set - No Instances', status: 'owned' }),
    })

    const { status, body } = await api(`/sets/${freshSet.id}/instances`)

    expect(status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(0)

    // Clean up
    await api(`/sets/${freshSet.id}`, { method: 'DELETE' })
  })
})

// ─────────────────────────────────────────────────────────────────────────
// PATCH /instances/:instanceId
// ─────────────────────────────────────────────────────────────────────────

describe('PATCH /instances/:instanceId', () => {
  let patchInstanceId: string

  beforeAll(async () => {
    const { body } = await api(`/sets/${testSetId}/instances`, {
      method: 'POST',
      body: JSON.stringify({ condition: 'new', buildStatus: 'not_started' }),
    })
    patchInstanceId = body.id
    createdInstanceIds.push(patchInstanceId)
  })

  it('updates fields and returns updated instance', async () => {
    const { status, body } = await api(`/sets/instances/${patchInstanceId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        condition: 'used',
        completeness: 'incomplete',
        notes: 'Updated via integration test',
      }),
    })

    expect(status).toBe(200)
    expect(body.id).toBe(patchInstanceId)
    expect(body.condition).toBe('used')
    expect(body.completeness).toBe('incomplete')
    expect(body.notes).toBe('Updated via integration test')
  })

  it('validates condition enum', async () => {
    const { status, body } = await api(`/sets/instances/${patchInstanceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ condition: 'mint' }),
    })

    expect(status).toBe(400)
    expect(body.error).toBe('Validation failed')
  })

  it('validates completeness enum', async () => {
    const { status, body } = await api(`/sets/instances/${patchInstanceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ completeness: 'partial' }),
    })

    expect(status).toBe(400)
    expect(body.error).toBe('Validation failed')
  })

  it('validates buildStatus enum', async () => {
    const { status, body } = await api(`/sets/instances/${patchInstanceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ buildStatus: 'destroyed' }),
    })

    expect(status).toBe(400)
    expect(body.error).toBe('Validation failed')
  })

  it('returns 404 for non-existent instance', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const { status, body } = await api(`/sets/instances/${fakeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes: 'ghost' }),
    })

    expect(status).toBe(404)
    expect(body.error).toBe('NOT_FOUND')
  })
})

// ─────────────────────────────────────────────────────────────────────────
// DELETE /instances/:instanceId
// ─────────────────────────────────────────────────────────────────────────

describe('DELETE /instances/:instanceId', () => {
  it('returns 204', async () => {
    // Create an instance to delete
    const { body: created } = await api(`/sets/${testSetId}/instances`, {
      method: 'POST',
      body: JSON.stringify({ notes: 'To be deleted' }),
    })

    const { status, body } = await api(`/sets/instances/${created.id}`, {
      method: 'DELETE',
    })

    expect(status).toBe(204)
    expect(body).toBeNull()
  })

  it('returns 404 for non-existent', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const { status, body } = await api(`/sets/instances/${fakeId}`, {
      method: 'DELETE',
    })

    expect(status).toBe(404)
    expect(body.error).toBe('NOT_FOUND')
  })
})

// ─────────────────────────────────────────────────────────────────────────
// GET /:id — detail endpoint includes instances[]
// ─────────────────────────────────────────────────────────────────────────

describe('GET /:id (set detail with instances)', () => {
  it('includes instances[] in response', async () => {
    const { status, body } = await api(`/sets/${testSetId}`)

    expect(status).toBe(200)
    expect(body.id).toBe(testSetId)
    expect(Array.isArray(body.instances)).toBe(true)
    // We created instances earlier in this suite, so there should be some
    expect(body.instances.length).toBeGreaterThan(0)
  })
})
