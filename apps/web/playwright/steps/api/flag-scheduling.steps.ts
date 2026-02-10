/**
 * Flag Scheduling API Step Definitions
 *
 * Step definitions for testing the flag scheduling admin API endpoints.
 * Implements CRUD operations for scheduled flag updates.
 *
 * Story: WISH-2119 (Flag Scheduling)
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { TEST_USERS, authState } from '../../utils/api-auth'
import { apiState } from './wishlist-api.steps'

const { Given, When, Then } = createBdd()

// ─────────────────────────────────────────────────────────────────────────────
// Shared State
// ─────────────────────────────────────────────────────────────────────────────

interface ScheduleTestState {
  createdScheduleId: string | null
  scheduleList: unknown[] | null
}

const scheduleState: ScheduleTestState = {
  createdScheduleId: null,
  scheduleList: null,
}

function resetScheduleState(): void {
  scheduleState.createdScheduleId = null
  scheduleState.scheduleList = null
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001'

function futureISO(hours: number): string {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000)
  return date.toISOString()
}

function pastISO(): string {
  const date = new Date(Date.now() - 2 * 60 * 60 * 1000)
  return date.toISOString()
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authState.currentToken) {
    headers['Authorization'] = `Bearer ${authState.currentToken}`
  }
  return headers
}

// ─────────────────────────────────────────────────────────────────────────────
// Background / Setup Steps
// ─────────────────────────────────────────────────────────────────────────────

Given('I am authenticated as an admin user', async () => {
  await authState.setUser(TEST_USERS.admin)
  apiState.client?.setAuthToken(authState.currentToken)
  resetScheduleState()
})

Given('the test flag {string} exists', async ({ request }, flagKey: string) => {
  // Ensure the flag exists by attempting to create/update it via admin endpoint
  const response = await request.post(`${BASE_URL}/admin/flags/${flagKey}`, {
    headers: getHeaders(),
    data: { enabled: false, rolloutPercentage: 0 },
  })

  // Accept 200 (updated) or 404 means flag doesn't exist yet
  // For flags that need to exist, we need to check the public endpoint
  const flagCheck = await request.get(`${BASE_URL}/config/flags/${flagKey}`, {
    headers: getHeaders(),
  })

  // If flag doesn't exist, the test environment must have it seeded
  // The admin POST endpoint updates existing flags - it doesn't create new ones
  // For E2E tests, we accept either 200 (flag exists) or rely on test data seeding
  if (flagCheck.status() === 404 && !flagKey.includes('empty') && !flagKey.includes('non-existent')) {
    // Flag doesn't exist - skip silently for empty/non-existent test flags
    // Real test flags should be seeded in the test environment
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Create Schedule Steps
// ─────────────────────────────────────────────────────────────────────────────

When(
  'I create a schedule for flag {string} to enable it in {int} hours',
  async ({ request }, flagKey: string, hours: number) => {
    const response = await request.post(`${BASE_URL}/admin/flags/${flagKey}/schedule`, {
      headers: getHeaders(),
      data: {
        scheduledAt: futureISO(hours),
        updates: { enabled: true },
      },
    })

    apiState.lastResponseStatus = response.status()
    apiState.lastResponseBody = await response.json().catch(() => null)

    if (response.ok()) {
      const body = apiState.lastResponseBody as Record<string, unknown>
      scheduleState.createdScheduleId = body.id as string
    }
  },
)

When(
  'I create a schedule for flag {string} with rolloutPercentage {int} in {int} hours',
  async ({ request }, flagKey: string, percentage: number, hours: number) => {
    const response = await request.post(`${BASE_URL}/admin/flags/${flagKey}/schedule`, {
      headers: getHeaders(),
      data: {
        scheduledAt: futureISO(hours),
        updates: { rolloutPercentage: percentage },
      },
    })

    apiState.lastResponseStatus = response.status()
    apiState.lastResponseBody = await response.json().catch(() => null)

    if (response.ok()) {
      const body = apiState.lastResponseBody as Record<string, unknown>
      scheduleState.createdScheduleId = body.id as string
    }
  },
)

When(
  'I create a schedule for flag {string} with enabled {word} and rolloutPercentage {int} in {int} hours',
  async ({ request }, flagKey: string, enabled: string, percentage: number, hours: number) => {
    const response = await request.post(`${BASE_URL}/admin/flags/${flagKey}/schedule`, {
      headers: getHeaders(),
      data: {
        scheduledAt: futureISO(hours),
        updates: { enabled: enabled === 'true', rolloutPercentage: percentage },
      },
    })

    apiState.lastResponseStatus = response.status()
    apiState.lastResponseBody = await response.json().catch(() => null)

    if (response.ok()) {
      const body = apiState.lastResponseBody as Record<string, unknown>
      scheduleState.createdScheduleId = body.id as string
    }
  },
)

When(
  'I create a schedule for flag {string} with a past date',
  async ({ request }, flagKey: string) => {
    const response = await request.post(`${BASE_URL}/admin/flags/${flagKey}/schedule`, {
      headers: getHeaders(),
      data: {
        scheduledAt: pastISO(),
        updates: { enabled: true },
      },
    })

    apiState.lastResponseStatus = response.status()
    apiState.lastResponseBody = await response.json().catch(() => null)
  },
)

When(
  'I create a schedule for flag {string} with empty updates in {int} hours',
  async ({ request }, flagKey: string, hours: number) => {
    const response = await request.post(`${BASE_URL}/admin/flags/${flagKey}/schedule`, {
      headers: getHeaders(),
      data: {
        scheduledAt: futureISO(hours),
        updates: {},
      },
    })

    apiState.lastResponseStatus = response.status()
    apiState.lastResponseBody = await response.json().catch(() => null)
  },
)

When(
  'I create a schedule for flag {string} with invalid datetime {string}',
  async ({ request }, flagKey: string, datetime: string) => {
    const response = await request.post(`${BASE_URL}/admin/flags/${flagKey}/schedule`, {
      headers: getHeaders(),
      data: {
        scheduledAt: datetime,
        updates: { enabled: true },
      },
    })

    apiState.lastResponseStatus = response.status()
    apiState.lastResponseBody = await response.json().catch(() => null)
  },
)

When(
  'I create a schedule for flag {string} with missing scheduledAt',
  async ({ request }, flagKey: string) => {
    const response = await request.post(`${BASE_URL}/admin/flags/${flagKey}/schedule`, {
      headers: getHeaders(),
      data: {
        updates: { enabled: true },
      },
    })

    apiState.lastResponseStatus = response.status()
    apiState.lastResponseBody = await response.json().catch(() => null)
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// List Schedule Steps
// ─────────────────────────────────────────────────────────────────────────────

Given(
  'I have created a schedule for flag {string}',
  async ({ request }, flagKey: string) => {
    const response = await request.post(`${BASE_URL}/admin/flags/${flagKey}/schedule`, {
      headers: getHeaders(),
      data: {
        scheduledAt: futureISO(24),
        updates: { enabled: true },
      },
    })

    expect(response.status()).toBe(201)
    const body = await response.json()
    scheduleState.createdScheduleId = body.id
  },
)

When(
  'I list schedules for flag {string}',
  async ({ request }, flagKey: string) => {
    const response = await request.get(`${BASE_URL}/admin/flags/${flagKey}/schedule`, {
      headers: getHeaders(),
    })

    apiState.lastResponseStatus = response.status()
    apiState.lastResponseBody = await response.json().catch(() => null)

    if (response.ok() && Array.isArray(apiState.lastResponseBody)) {
      scheduleState.scheduleList = apiState.lastResponseBody as unknown[]
    }
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// Cancel Schedule Steps
// ─────────────────────────────────────────────────────────────────────────────

When(
  'I cancel the created schedule for flag {string}',
  async ({ request }, flagKey: string) => {
    expect(scheduleState.createdScheduleId).not.toBeNull()
    const response = await request.delete(
      `${BASE_URL}/admin/flags/${flagKey}/schedule/${scheduleState.createdScheduleId}`,
      { headers: getHeaders() },
    )

    apiState.lastResponseStatus = response.status()
    apiState.lastResponseBody = await response.json().catch(() => null)
  },
)

When(
  'I cancel schedule {string} for flag {string}',
  async ({ request }, scheduleId: string, flagKey: string) => {
    const response = await request.delete(
      `${BASE_URL}/admin/flags/${flagKey}/schedule/${scheduleId}`,
      { headers: getHeaders() },
    )

    apiState.lastResponseStatus = response.status()
    apiState.lastResponseBody = await response.json().catch(() => null)
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// Schedule Response Assertions
// ─────────────────────────────────────────────────────────────────────────────

Then(
  'the schedule response should have status {string}',
  async ({}, status: string) => {
    const body = apiState.lastResponseBody as Record<string, unknown>
    expect(body.status).toBe(status)
  },
)

Then(
  'the schedule response should have flagKey {string}',
  async ({}, flagKey: string) => {
    const body = apiState.lastResponseBody as Record<string, unknown>
    expect(body.flagKey).toBe(flagKey)
  },
)

Then(
  'the schedule response should include {string} in updates',
  async ({}, field: string) => {
    const body = apiState.lastResponseBody as Record<string, unknown>
    const updates = body.updates as Record<string, unknown>
    expect(updates).toHaveProperty(field)
  },
)

Then('the schedule response should have a valid UUID id', async () => {
  const body = apiState.lastResponseBody as Record<string, unknown>
  expect(body.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  )
})

Then('the schedule response should have a valid scheduledAt datetime', async () => {
  const body = apiState.lastResponseBody as Record<string, unknown>
  expect(typeof body.scheduledAt).toBe('string')
  const date = new Date(body.scheduledAt as string)
  expect(date.getTime()).not.toBeNaN()
})

Then('the schedule response should have a valid createdAt datetime', async () => {
  const body = apiState.lastResponseBody as Record<string, unknown>
  expect(typeof body.createdAt).toBe('string')
  const date = new Date(body.createdAt as string)
  expect(date.getTime()).not.toBeNaN()
})

// ─────────────────────────────────────────────────────────────────────────────
// Schedule List Assertions
// ─────────────────────────────────────────────────────────────────────────────

Then('the schedule list should not be empty', async () => {
  expect(Array.isArray(apiState.lastResponseBody)).toBe(true)
  const list = apiState.lastResponseBody as unknown[]
  expect(list.length).toBeGreaterThan(0)
})

Then('the schedule list should be empty', async () => {
  expect(Array.isArray(apiState.lastResponseBody)).toBe(true)
  const list = apiState.lastResponseBody as unknown[]
  expect(list.length).toBe(0)
})

Then('each schedule in the list should have an id and status', async () => {
  expect(Array.isArray(apiState.lastResponseBody)).toBe(true)
  const list = apiState.lastResponseBody as Record<string, unknown>[]
  for (const schedule of list) {
    expect(schedule).toHaveProperty('id')
    expect(schedule).toHaveProperty('status')
  }
})
