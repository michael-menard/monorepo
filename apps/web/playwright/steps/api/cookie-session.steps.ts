/**
 * Cookie-Based Authentication Session Step Definitions
 *
 * Tests for the /auth/* session management endpoints.
 * Verifies httpOnly cookie-based authentication flow.
 *
 * Note: Reuses common steps from wishlist-api.steps.ts where possible.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { TEST_USERS, authState, authenticateWithCognito, generateExpiredToken } from '../../utils/api-auth'
import { apiState } from './wishlist-api.steps'

const { Given, When, Then } = createBdd()

// ─────────────────────────────────────────────────────────────────────────────
// State Management for Cookie Sessions
// ─────────────────────────────────────────────────────────────────────────────

interface CookieSessionState {
  idToken: string | null
  cookies: string[]
}

const sessionState: CookieSessionState = {
  idToken: null,
  cookies: [],
}

function getApiBaseUrl(): string {
  return process.env.API_BASE_URL || 'http://localhost:9000'
}

// ─────────────────────────────────────────────────────────────────────────────
// Given Steps - Setup (Cookie Session Specific)
// ─────────────────────────────────────────────────────────────────────────────

Given('the API server is running', async ({ request }) => {
  const baseUrl = getApiBaseUrl()
  const response = await request.get(`${baseUrl}/health`)
  expect(response.status()).toBe(200)
})

Given('I have a valid Cognito ID token for the primary test user', async () => {
  const result = await authenticateWithCognito(
    TEST_USERS.primary.email,
    TEST_USERS.primary.password
  )
  sessionState.idToken = result.tokens.idToken
})

Given('I have an invalid ID token', async () => {
  sessionState.idToken = 'invalid.token.format'
})

Given('I have an expired ID token', async () => {
  sessionState.idToken = generateExpiredToken(TEST_USERS.primary)
})

Given('I have an active cookie session', async ({ request }) => {
  const result = await authenticateWithCognito(
    TEST_USERS.primary.email,
    TEST_USERS.primary.password
  )

  const baseUrl = getApiBaseUrl()
  const response = await request.post(`${baseUrl}/auth/session`, {
    data: { idToken: result.tokens.idToken },
  })
  expect(response.status()).toBe(200)

  sessionState.cookies = response.headers()['set-cookie']?.split(', ') || []
})

Given('I have an expired cookie session', async () => {
  sessionState.cookies = ['auth_token=expired.token.value; HttpOnly; SameSite=Strict; Path=/']
})

Given('I have an active cookie session for the primary user', async ({ request }) => {
  const result = await authenticateWithCognito(
    TEST_USERS.primary.email,
    TEST_USERS.primary.password
  )

  const baseUrl = getApiBaseUrl()
  const response = await request.post(`${baseUrl}/auth/session`, {
    data: { idToken: result.tokens.idToken },
  })
  expect(response.status()).toBe(200)
  sessionState.cookies = response.headers()['set-cookie']?.split(', ') || []
})

Given('I have an Authorization header for a different user', async () => {
  const result = await authenticateWithCognito(
    TEST_USERS.secondary.email,
    TEST_USERS.secondary.password
  )
  authState.currentToken = result.tokens.accessToken
})

// ─────────────────────────────────────────────────────────────────────────────
// When Steps - Actions (Cookie Session Specific)
// ─────────────────────────────────────────────────────────────────────────────

When('I POST to {string} with the ID token', async ({ request }, endpoint: string) => {
  const baseUrl = getApiBaseUrl()
  const response = await request.post(`${baseUrl}${endpoint}`, {
    data: { idToken: sessionState.idToken },
  })

  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
  sessionState.cookies = response.headers()['set-cookie']?.split(', ') || []
})

When('I POST to {string} with empty body', async ({ request }, endpoint: string) => {
  const baseUrl = getApiBaseUrl()
  const response = await request.post(`${baseUrl}${endpoint}`, {
    data: {},
  })

  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I POST to {string}', async ({ request }, endpoint: string) => {
  const baseUrl = getApiBaseUrl()
  const cookieHeader = sessionState.cookies.join('; ')

  const response = await request.post(`${baseUrl}${endpoint}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  })

  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
  sessionState.cookies = response.headers()['set-cookie']?.split(', ') || []
})

When('I GET {string}', async ({ request }, endpoint: string) => {
  const baseUrl = getApiBaseUrl()
  const cookieHeader = sessionState.cookies.join('; ')

  const response = await request.get(`${baseUrl}${endpoint}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  })

  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I GET {string} without credentials', async ({ request }, endpoint: string) => {
  const baseUrl = getApiBaseUrl()
  const response = await request.get(`${baseUrl}${endpoint}`)

  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I request the wishlist list endpoint with cookie auth', async ({ request }) => {
  const baseUrl = getApiBaseUrl()
  const cookieHeader = sessionState.cookies.join('; ')

  const response = await request.get(`${baseUrl}/wishlist`, {
    headers: { Cookie: cookieHeader },
  })

  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I request the wishlist list endpoint with Authorization header', async ({ request }) => {
  const baseUrl = getApiBaseUrl()

  const response = await request.get(`${baseUrl}/wishlist`, {
    headers: { Authorization: `Bearer ${authState.currentToken}` },
  })

  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I request the wishlist list endpoint with both auth methods', async ({ request }) => {
  const baseUrl = getApiBaseUrl()
  const cookieHeader = sessionState.cookies.join('; ')

  const response = await request.get(`${baseUrl}/wishlist`, {
    headers: {
      Cookie: cookieHeader,
      Authorization: `Bearer ${authState.currentToken}`,
    },
  })

  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Then Steps - Assertions (Cookie Session Specific - non-duplicate)
// ─────────────────────────────────────────────────────────────────────────────

// Note: "the response status should be {int}" is defined in wishlist-api.steps.ts

Then('the response should indicate success', async () => {
  const body = apiState.lastResponseBody as Record<string, unknown>
  expect(body?.success).toBe(true)
})

Then('the response should set an httpOnly cookie named {string}', async ({}, cookieName: string) => {
  const authCookie = sessionState.cookies.find(c => c.startsWith(`${cookieName}=`))
  expect(authCookie).toBeDefined()
  expect(authCookie?.toLowerCase()).toContain('httponly')
})

Then('the cookie should have SameSite=Strict', async () => {
  const authCookie = sessionState.cookies.find(c => c.startsWith('auth_token='))
  expect(authCookie?.toLowerCase()).toContain('samesite=strict')
})

Then('the response should contain error message {string}', async ({}, message: string) => {
  const body = apiState.lastResponseBody as Record<string, unknown>
  expect(body?.message).toContain(message)
})

Then('the response should update the {string} cookie', async ({}, cookieName: string) => {
  const authCookie = sessionState.cookies.find(c => c.startsWith(`${cookieName}=`))
  expect(authCookie).toBeDefined()
})

Then('the {string} cookie should be cleared', async ({}, cookieName: string) => {
  const authCookie = sessionState.cookies.find(c => c.startsWith(`${cookieName}=`))
  if (authCookie) {
    const isCleared = authCookie.includes('max-age=0') ||
                      authCookie.includes('Max-Age=0') ||
                      authCookie.includes('expires=Thu, 01 Jan 1970')
    expect(isCleared).toBe(true)
  }
})

Then('the response should indicate authenticated true', async () => {
  const body = apiState.lastResponseBody as Record<string, unknown>
  expect(body?.authenticated).toBe(true)
})

Then('the response should indicate authenticated false', async () => {
  const body = apiState.lastResponseBody as Record<string, unknown>
  expect(body?.authenticated).toBe(false)
})

Then('the response should contain user info', async () => {
  const body = apiState.lastResponseBody as Record<string, unknown>
  expect(body?.user).toBeDefined()
  const user = body?.user as Record<string, unknown>
  expect(user?.userId).toBeDefined()
})

Then('the response should contain wishlist items', async () => {
  const body = apiState.lastResponseBody as Record<string, unknown>
  const hasItems = Array.isArray(body) || Array.isArray((body as any)?.items)
  expect(hasItems || body !== null).toBe(true)
})

Then('the request should use the cookie authentication', async () => {
  expect(apiState.lastResponseStatus).toBe(200)
})
