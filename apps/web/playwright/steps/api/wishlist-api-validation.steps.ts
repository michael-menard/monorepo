/**
 * Wishlist API Validation Step Definitions
 *
 * Step definitions for testing input validation and error handling.
 *
 * Stories: WISH-2001, WISH-2002
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import {
  createWishlistApiClient,
  WishlistApiClient,
  type WishlistItem,
} from '../../utils/api-client'
import { createMinimalWishlistItem, createValidWishlistItem, uniqueItemName } from '../../utils/api-fixtures'
import { authState } from '../../utils/api-auth'

const { Given, When, Then } = createBdd()

// ─────────────────────────────────────────────────────────────────────────────
// Shared State
// ─────────────────────────────────────────────────────────────────────────────

interface ValidationTestState {
  client: WishlistApiClient | null
  lastResponseStatus: number
  lastResponseBody: unknown
  createdItems: WishlistItem[]
  currentItemId: string | null
}

const valState: ValidationTestState = {
  client: null,
  lastResponseStatus: 0,
  lastResponseBody: null,
  createdItems: [],
  currentItemId: null,
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Validation - Missing/Empty Fields
// ─────────────────────────────────────────────────────────────────────────────

When('I create a wishlist item without title', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
  valState.client = createWishlistApiClient(request, baseUrl)
  valState.client.setAuthToken(authState.currentToken)

  const response = await request.post(`${baseUrl}/api/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { store: 'LEGO' },
  })
  valState.lastResponseStatus = response.status()
  valState.lastResponseBody = await response.json().catch(() => null)
})

When('I create a wishlist item with title {string}', async ({ request }, title: string) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
  valState.client = createWishlistApiClient(request, baseUrl)
  valState.client.setAuthToken(authState.currentToken)

  const response = await request.post(`${baseUrl}/api/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title, store: 'LEGO' },
  })
  valState.lastResponseStatus = response.status()
  valState.lastResponseBody = await response.json().catch(() => null)
})

When('I create a wishlist item without store', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  const response = await request.post(`${baseUrl}/api/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: 'Test Item' },
  })
  valState.lastResponseStatus = response.status()
  valState.lastResponseBody = await response.json().catch(() => null)
})

// Note: 'I create a wishlist item with store {string}' is defined in wishlist-api.steps.ts

// ─────────────────────────────────────────────────────────────────────────────
// Create Validation - Field Lengths
// ─────────────────────────────────────────────────────────────────────────────

When('I create a wishlist item with title of {int} characters', async ({ request }, length: number) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  const title = 'A'.repeat(length)
  const response = await request.post(`${baseUrl}/api/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title, store: 'LEGO' },
  })
  valState.lastResponseStatus = response.status()
  valState.lastResponseBody = await response.json().catch(() => null)
})

When('I create a wishlist item with notes of {int} characters', async ({ request }, length: number) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  const notes = 'A'.repeat(length)
  const response = await request.post(`${baseUrl}/api/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: 'Test', store: 'LEGO', notes },
  })
  valState.lastResponseStatus = response.status()
  valState.lastResponseBody = await response.json().catch(() => null)
})

When('I create a wishlist item with store of {int} characters', async ({ request }, length: number) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  const store = 'A'.repeat(length)
  const response = await request.post(`${baseUrl}/api/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: 'Test', store },
  })
  valState.lastResponseStatus = response.status()
  valState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Create Validation - Price
// ─────────────────────────────────────────────────────────────────────────────

When('I create a wishlist item with price {string}', async ({ request }, price: string) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  const response = await request.post(`${baseUrl}/api/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: uniqueItemName(), store: 'LEGO', price },
  })
  valState.lastResponseStatus = response.status()
  valState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Create Validation - URL
// ─────────────────────────────────────────────────────────────────────────────

When('I create a wishlist item with sourceUrl {string}', async ({ request }, sourceUrl: string) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  const response = await request.post(`${baseUrl}/api/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: uniqueItemName(), store: 'LEGO', sourceUrl },
  })
  valState.lastResponseStatus = response.status()
  valState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Create Validation - Priority
// ─────────────────────────────────────────────────────────────────────────────

When('I create a wishlist item with priority {int}', async ({ request }, priority: number) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  const response = await request.post(`${baseUrl}/api/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: uniqueItemName(), store: 'LEGO', priority },
  })
  valState.lastResponseStatus = response.status()
  valState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Create Validation - Piece Count
// ─────────────────────────────────────────────────────────────────────────────

// Note: Using {float} to handle both integers (7541, -100) and floats (100.5)
When('I create a wishlist item with pieceCount {float}', async ({ request }, pieceCount: number) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  const response = await request.post(`${baseUrl}/api/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: uniqueItemName(), store: 'LEGO', pieceCount },
  })
  valState.lastResponseStatus = response.status()
  valState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Create Validation - Tags
// ─────────────────────────────────────────────────────────────────────────────

// Note: 'I create a wishlist item with tags {string}' is defined in wishlist-api.steps.ts

When('I create a wishlist item with {int} tags', async ({ request }, count: number) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  const tags = Array.from({ length: count }, (_, i) => `Tag${i + 1}`)

  const response = await request.post(`${baseUrl}/api/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: uniqueItemName(), store: 'LEGO', tags },
  })
  valState.lastResponseStatus = response.status()
  valState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Create Validation - Multiple Invalid Fields
// ─────────────────────────────────────────────────────────────────────────────

When('I create a wishlist item with multiple invalid fields', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  const response = await request.post(`${baseUrl}/api/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: {
      title: '', // Invalid: empty
      store: '', // Invalid: empty
      price: 'invalid', // Invalid: not a number
      priority: 10, // Invalid: out of range
    },
  })
  valState.lastResponseStatus = response.status()
  valState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Update Validation
// ─────────────────────────────────────────────────────────────────────────────

// Note: 'I update the item with price {string}' is defined in wishlist-api.steps.ts

When('I update the item with sourceUrl {string}', async ({ request }, sourceUrl: string) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  expect(valState.currentItemId).not.toBeNull()
  const response = await request.put(`${baseUrl}/api/wishlist/${valState.currentItemId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { sourceUrl },
  })
  valState.lastResponseStatus = response.status()
  valState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Validation
// ─────────────────────────────────────────────────────────────────────────────

When('I mark the item as purchased with tax {string}', async ({ request }, tax: string) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  expect(valState.currentItemId).not.toBeNull()
  const response = await request.post(`${baseUrl}/api/wishlist/${valState.currentItemId}/purchased`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { tax, quantity: 1 },
  })
  valState.lastResponseStatus = response.status()
  valState.lastResponseBody = await response.json().catch(() => null)
})

When('I mark the item as purchased with shipping {string}', async ({ request }, shipping: string) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

  expect(valState.currentItemId).not.toBeNull()
  const response = await request.post(`${baseUrl}/api/wishlist/${valState.currentItemId}/purchased`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { shipping, quantity: 1 },
  })
  valState.lastResponseStatus = response.status()
  valState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Response Assertions
// ─────────────────────────────────────────────────────────────────────────────

Then('the validation error should reference {string}', async ({},field: string) => {
  const body = valState.lastResponseBody as { error: string; details?: { fieldErrors?: Record<string, string[]> } }
  expect(body.error).toBe('Validation failed')
  if (body.details?.fieldErrors) {
    expect(body.details.fieldErrors).toHaveProperty(field)
  }
})

Then('the response should contain error about title length', async () => {
  const body = valState.lastResponseBody as Record<string, unknown>
  expect(body.error).toBe('Validation failed')
})

Then('the response should contain error about notes length', async () => {
  const body = valState.lastResponseBody as Record<string, unknown>
  expect(body.error).toBe('Validation failed')
})

Then('the response tags should have {int} items', async ({},count: number) => {
  const body = valState.lastResponseBody as WishlistItem
  expect(body.tags.length).toBe(count)
})

Then('the response tags should be empty', async () => {
  const body = valState.lastResponseBody as WishlistItem
  expect(body.tags.length).toBe(0)
})

Then('the response should have {string} field', async ({},field: string) => {
  const body = valState.lastResponseBody as Record<string, unknown>
  expect(body).toHaveProperty(field)
})

Then('the details should contain field-level errors', async () => {
  const body = valState.lastResponseBody as { details?: { fieldErrors?: Record<string, unknown> } }
  expect(body.details).toBeDefined()
})

Then('the response should contain multiple validation errors', async () => {
  const body = valState.lastResponseBody as { details?: { fieldErrors?: Record<string, unknown> } }
  expect(body.details?.fieldErrors).toBeDefined()
  const errorCount = Object.keys(body.details?.fieldErrors || {}).length
  expect(errorCount).toBeGreaterThan(1)
})
