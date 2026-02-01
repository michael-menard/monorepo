/**
 * Wishlist API Upload Step Definitions
 *
 * Step definitions for testing presigned URL generation and upload security.
 *
 * Story: WISH-2013 (Upload Security)
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import {
  createWishlistApiClient,
  WishlistApiClient,
  type PresignResponse,
} from '../../utils/api-client'
import { createValidPresignParams } from '../../utils/api-fixtures'
import { TEST_USERS, authState, generateMockToken } from '../../utils/api-auth'

const { Given, When, Then } = createBdd()

// ─────────────────────────────────────────────────────────────────────────────
// Shared State
// ─────────────────────────────────────────────────────────────────────────────

interface UploadTestState {
  client: WishlistApiClient | null
  lastResponseStatus: number
  lastResponseBody: unknown
  storedKeys: Record<string, string>
}

const uploadState: UploadTestState = {
  client: null,
  lastResponseStatus: 0,
  lastResponseBody: null,
  storedKeys: {},
}

// ─────────────────────────────────────────────────────────────────────────────
// Valid Presign Requests
// ─────────────────────────────────────────────────────────────────────────────

When('I request a presigned URL for {string} with mimeType {string}', async ({ request }, fileName: string, mimeType: string) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
  uploadState.client = createWishlistApiClient(request, baseUrl)
  uploadState.client.setAuthToken(authState.currentToken)

  const response = await uploadState.client.presign({ fileName, mimeType })
  uploadState.lastResponseStatus = response.status()
  uploadState.lastResponseBody = await response.json().catch(() => null)
})

When('I request a presigned URL with fileSize {int}', async ({ request }, fileSize: number) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
  uploadState.client = createWishlistApiClient(request, baseUrl)
  uploadState.client.setAuthToken(authState.currentToken)

  const response = await uploadState.client.presign({
    fileName: 'test.jpg',
    mimeType: 'image/jpeg',
    fileSize,
  })
  uploadState.lastResponseStatus = response.status()
  uploadState.lastResponseBody = await response.json().catch(() => null)
})

When('I request a presigned URL without fileName', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  const response = await request.get(`${baseUrl}/api/wishlist/images/presign`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    params: {
      mimeType: 'image/jpeg',
    },
  })
  uploadState.lastResponseStatus = response.status()
  uploadState.lastResponseBody = await response.json().catch(() => null)
})

When('I request a presigned URL without mimeType', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  const response = await request.get(`${baseUrl}/api/wishlist/images/presign`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    params: {
      fileName: 'test.jpg',
    },
  })
  uploadState.lastResponseStatus = response.status()
  uploadState.lastResponseBody = await response.json().catch(() => null)
})

When('I request a presigned URL with empty fileName', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  const response = await request.get(`${baseUrl}/api/wishlist/images/presign`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    params: {
      fileName: '',
      mimeType: 'image/jpeg',
    },
  })
  uploadState.lastResponseStatus = response.status()
  uploadState.lastResponseBody = await response.json().catch(() => null)
})

When('I request a presigned URL with empty mimeType', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  const response = await request.get(`${baseUrl}/api/wishlist/images/presign`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    params: {
      fileName: 'test.jpg',
      mimeType: '',
    },
  })
  uploadState.lastResponseStatus = response.status()
  uploadState.lastResponseBody = await response.json().catch(() => null)
})

When('I request a presigned URL for a filename with {int} characters', async ({ request }, length: number) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
  uploadState.client = createWishlistApiClient(request, baseUrl)
  uploadState.client.setAuthToken(authState.currentToken)

  const fileName = 'a'.repeat(length - 4) + '.jpg'
  const response = await uploadState.client.presign({
    fileName,
    mimeType: 'image/jpeg',
  })
  uploadState.lastResponseStatus = response.status()
  uploadState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Response Assertions
// ─────────────────────────────────────────────────────────────────────────────

Then('the response should contain a presignedUrl', async () => {
  const body = uploadState.lastResponseBody as PresignResponse
  expect(body.presignedUrl).toBeDefined()
  expect(body.presignedUrl).toContain('http')
})

Then('the response should contain a key', async () => {
  const body = uploadState.lastResponseBody as PresignResponse
  expect(body.key).toBeDefined()
  expect(typeof body.key).toBe('string')
})

Then('the response should contain expiresIn', async () => {
  const body = uploadState.lastResponseBody as PresignResponse
  expect(body.expiresIn).toBeDefined()
  expect(typeof body.expiresIn).toBe('number')
})

Then('the key should contain a user identifier or unique path', async () => {
  const body = uploadState.lastResponseBody as PresignResponse
  // Key should have some structure (user ID or unique identifier)
  expect(body.key.length).toBeGreaterThan(10)
})

Then('the expiresIn should be greater than {int}', async ({},min: number) => {
  const body = uploadState.lastResponseBody as PresignResponse
  expect(body.expiresIn).toBeGreaterThan(min)
})

Then('I store the presign key as {string}', async ({},keyName: string) => {
  const body = uploadState.lastResponseBody as PresignResponse
  uploadState.storedKeys[keyName] = body.key
})

Then('the presign key should be different from {string}', async ({},keyName: string) => {
  const body = uploadState.lastResponseBody as PresignResponse
  expect(body.key).not.toBe(uploadState.storedKeys[keyName])
})

Then('the response should contain allowedTypes', async () => {
  const body = uploadState.lastResponseBody as Record<string, unknown>
  expect(body.allowedTypes).toBeDefined()
  expect(Array.isArray(body.allowedTypes)).toBe(true)
})

Then('the response should contain message about maximum limit', async () => {
  const body = uploadState.lastResponseBody as Record<string, unknown>
  expect(body.message).toBeDefined()
  expect(String(body.message).toLowerCase()).toContain('maximum')
})

Then('the response should contain error {string} or {string}', async ({},error1: string, error2: string) => {
  const body = uploadState.lastResponseBody as Record<string, unknown>
  expect([error1, error2]).toContain(body.error)
})

// Note: 'the response status should be {int} or {int}' is defined in wishlist-api-auth.steps.ts
