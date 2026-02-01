/**
 * Wishlist API Authorization Step Definitions
 *
 * Step definitions for testing authentication and authorization.
 * Implements security testing scenarios from WISH-2008.
 *
 * Story: WISH-2008 (Authorization & Security)
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import {
  createWishlistApiClient,
  WishlistApiClient,
  type WishlistItem,
} from '../../utils/api-client'
import { createMinimalWishlistItem, uniqueItemName } from '../../utils/api-fixtures'
import {
  TEST_USERS,
  authState,
  authenticateWithCognito,
  generateMockToken,
  generateExpiredToken,
  createInvalidToken,
  createTamperedToken,
} from '../../utils/api-auth'

const { Given, When, Then } = createBdd()

// ─────────────────────────────────────────────────────────────────────────────
// Shared State
// ─────────────────────────────────────────────────────────────────────────────

interface AuthTestState {
  client: WishlistApiClient | null
  secondaryClient: WishlistApiClient | null
  lastResponseStatus: number
  lastResponseBody: unknown
  secondaryUserItemId: string | null
  primaryUserItemId: string | null
}

const authTestState: AuthTestState = {
  client: null,
  secondaryClient: null,
  lastResponseStatus: 0,
  lastResponseBody: null,
  secondaryUserItemId: null,
  primaryUserItemId: null,
}

// ─────────────────────────────────────────────────────────────────────────────
// Authentication Setup Steps
// ─────────────────────────────────────────────────────────────────────────────

Given('I send a request without Authorization header', async () => {
  authState.clear()
  authTestState.client?.setAuthToken(null)
})

Given('I send a request with empty Authorization header', async () => {
  authState.currentToken = ''
  authTestState.client?.setAuthToken('')
})

Given('I am authenticated with a malformed token', async () => {
  authState.currentToken = createInvalidToken()
  authTestState.client?.setAuthToken(authState.currentToken)
})

Given('I am authenticated with an expired token', async () => {
  authState.currentToken = generateExpiredToken(TEST_USERS.primary)
  authTestState.client?.setAuthToken(authState.currentToken)
})

Given('I am authenticated with a tampered token', async () => {
  authState.currentToken = createTamperedToken(TEST_USERS.primary)
  authTestState.client?.setAuthToken(authState.currentToken)
})

// ─────────────────────────────────────────────────────────────────────────────
// Cross-User Access Steps
// ─────────────────────────────────────────────────────────────────────────────

Given('the secondary user has created a wishlist item', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  // Authenticate as secondary user with Cognito
  const { tokens } = await authenticateWithCognito(
    TEST_USERS.secondary.email,
    TEST_USERS.secondary.password,
  )

  // Create secondary user client
  authTestState.secondaryClient = createWishlistApiClient(request, baseUrl)
  authTestState.secondaryClient.setAuthToken(tokens.accessToken)

  // Create item as secondary user
  const data = createMinimalWishlistItem({ title: `Secondary User ${uniqueItemName()}` })
  const response = await authTestState.secondaryClient.create(data)
  expect(response.status()).toBe(201)
  const item = await response.json()
  authTestState.secondaryUserItemId = item.id
})

Given('the secondary user has created a wishlist item with title {string}', async ({ request }, title: string) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  // Authenticate as secondary user with Cognito
  const { tokens } = await authenticateWithCognito(
    TEST_USERS.secondary.email,
    TEST_USERS.secondary.password,
  )

  authTestState.secondaryClient = createWishlistApiClient(request, baseUrl)
  authTestState.secondaryClient.setAuthToken(tokens.accessToken)

  const data = createMinimalWishlistItem({ title })
  const response = await authTestState.secondaryClient.create(data)
  expect(response.status()).toBe(201)
  const item = await response.json()
  authTestState.secondaryUserItemId = item.id
})

When('I request the secondary user\'s item', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
  authTestState.client = createWishlistApiClient(request, baseUrl)
  authTestState.client.setAuthToken(authState.currentToken)

  expect(authTestState.secondaryUserItemId).not.toBeNull()
  const response = await authTestState.client.get(authTestState.secondaryUserItemId!)
  authTestState.lastResponseStatus = response.status()
  authTestState.lastResponseBody = await response.json().catch(() => null)
})

When('I try to update the secondary user\'s item', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
  authTestState.client = createWishlistApiClient(request, baseUrl)
  authTestState.client.setAuthToken(authState.currentToken)

  expect(authTestState.secondaryUserItemId).not.toBeNull()
  const response = await authTestState.client.update(authTestState.secondaryUserItemId!, {
    title: 'Attempted Update',
  })
  authTestState.lastResponseStatus = response.status()
  authTestState.lastResponseBody = await response.json().catch(() => null)
})

When('I try to delete the secondary user\'s item', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
  authTestState.client = createWishlistApiClient(request, baseUrl)
  authTestState.client.setAuthToken(authState.currentToken)

  expect(authTestState.secondaryUserItemId).not.toBeNull()
  const response = await authTestState.client.delete(authTestState.secondaryUserItemId!)
  authTestState.lastResponseStatus = response.status()
  if (response.status() !== 204) {
    authTestState.lastResponseBody = await response.json().catch(() => null)
  }
})

When('I try to mark the secondary user\'s item as purchased', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
  authTestState.client = createWishlistApiClient(request, baseUrl)
  authTestState.client.setAuthToken(authState.currentToken)

  expect(authTestState.secondaryUserItemId).not.toBeNull()
  const response = await authTestState.client.markAsPurchased(authTestState.secondaryUserItemId!, {
    quantity: 1,
  })
  authTestState.lastResponseStatus = response.status()
  authTestState.lastResponseBody = await response.json().catch(() => null)
})

When('I try to reorder the secondary user\'s item', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
  authTestState.client = createWishlistApiClient(request, baseUrl)
  authTestState.client.setAuthToken(authState.currentToken)

  expect(authTestState.secondaryUserItemId).not.toBeNull()
  const response = await authTestState.client.reorder({
    items: [{ id: authTestState.secondaryUserItemId!, sortOrder: 0 }],
  })
  authTestState.lastResponseStatus = response.status()
  authTestState.lastResponseBody = await response.json().catch(() => null)
})

When('I try to purchase the secondary user\'s item', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
  authTestState.client = createWishlistApiClient(request, baseUrl)
  authTestState.client.setAuthToken(authState.currentToken)

  expect(authTestState.secondaryUserItemId).not.toBeNull()
  const response = await authTestState.client.markAsPurchased(authTestState.secondaryUserItemId!, {
    quantity: 1,
  })
  authTestState.lastResponseStatus = response.status()
  authTestState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Generic HTTP Method Steps
// ─────────────────────────────────────────────────────────────────────────────

When('I make a {word} request to {string}', async ({ request }, method: string, endpoint: string) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
  const url = `${baseUrl}${endpoint}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (authState.currentToken) {
    headers['Authorization'] = `Bearer ${authState.currentToken}`
  }

  let response
  switch (method.toUpperCase()) {
    case 'GET':
      response = await request.get(url, { headers })
      break
    case 'POST':
      response = await request.post(url, { headers, data: {} })
      break
    case 'PUT':
      response = await request.put(url, { headers, data: {} })
      break
    case 'DELETE':
      response = await request.delete(url, { headers })
      break
    default:
      throw new Error(`Unsupported HTTP method: ${method}`)
  }

  authTestState.lastResponseStatus = response.status()
  if (response.status() !== 204) {
    authTestState.lastResponseBody = await response.json().catch(() => null)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// List Content Assertions
// ─────────────────────────────────────────────────────────────────────────────

Then('the items should contain {string}', async ({},title: string) => {
  const body = authTestState.lastResponseBody as { items: WishlistItem[] }
  const found = body.items.some(item => item.title.includes(title))
  expect(found).toBe(true)
})

Then('the items should not contain {string}', async ({},title: string) => {
  const body = authTestState.lastResponseBody as { items: WishlistItem[] }
  const found = body.items.some(item => item.title.includes(title))
  expect(found).toBe(false)
})

// ─────────────────────────────────────────────────────────────────────────────
// Response Status Assertions (override for auth context)
// ─────────────────────────────────────────────────────────────────────────────

Then('the response status should be {int} or {int}', async ({},status1: number, status2: number) => {
  expect([status1, status2]).toContain(authTestState.lastResponseStatus)
})
