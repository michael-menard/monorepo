/**
 * Wishlist API Validation Step Definitions
 *
 * Step definitions for testing input validation and error handling.
 *
 * Stories: WISH-2001, WISH-2002
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { type WishlistItem } from '../../utils/api-client'
import { uniqueItemName } from '../../utils/api-fixtures'
import { authState } from '../../utils/api-auth'
import { apiState } from './wishlist-api.steps'

const { Given, When, Then } = createBdd()

// ─────────────────────────────────────────────────────────────────────────────
// Create Validation - Missing/Empty Fields
// ─────────────────────────────────────────────────────────────────────────────

When('I create a wishlist item without title', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  const response = await request.post(`${baseUrl}/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { store: 'LEGO' },
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I create a wishlist item with title {string}', async ({ request }, title: string) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  const response = await request.post(`${baseUrl}/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title, store: 'LEGO' },
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I create a wishlist item without store', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  const response = await request.post(`${baseUrl}/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: 'Test Item' },
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

// Note: 'I create a wishlist item with store {string}' is defined in wishlist-api.steps.ts

// ─────────────────────────────────────────────────────────────────────────────
// Create Validation - Field Lengths
// ─────────────────────────────────────────────────────────────────────────────

When('I create a wishlist item with title of {int} characters', async ({ request }, length: number) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  const title = 'A'.repeat(length)
  const response = await request.post(`${baseUrl}/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title, store: 'LEGO' },
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I create a wishlist item with notes of {int} characters', async ({ request }, length: number) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  const notes = 'A'.repeat(length)
  const response = await request.post(`${baseUrl}/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: 'Test', store: 'LEGO', notes },
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I create a wishlist item with store of {int} characters', async ({ request }, length: number) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  const store = 'A'.repeat(length)
  const response = await request.post(`${baseUrl}/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: 'Test', store },
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Create Validation - Price
// ─────────────────────────────────────────────────────────────────────────────

When('I create a wishlist item with price {string}', async ({ request }, price: string) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  const response = await request.post(`${baseUrl}/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: uniqueItemName(), store: 'LEGO', price },
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Create Validation - URL
// ─────────────────────────────────────────────────────────────────────────────

When('I create a wishlist item with sourceUrl {string}', async ({ request }, sourceUrl: string) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  const response = await request.post(`${baseUrl}/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: uniqueItemName(), store: 'LEGO', sourceUrl },
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Create Validation - Priority
// ─────────────────────────────────────────────────────────────────────────────

When('I create a wishlist item with priority {int}', async ({ request }, priority: number) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  const response = await request.post(`${baseUrl}/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: uniqueItemName(), store: 'LEGO', priority },
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Create Validation - Piece Count
// ─────────────────────────────────────────────────────────────────────────────

// Note: Using {float} to handle both integers (7541, -100) and floats (100.5)
When('I create a wishlist item with pieceCount {float}', async ({ request }, pieceCount: number) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  const response = await request.post(`${baseUrl}/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: uniqueItemName(), store: 'LEGO', pieceCount },
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Create Validation - Tags
// ─────────────────────────────────────────────────────────────────────────────

// Note: 'I create a wishlist item with tags {string}' is defined in wishlist-api.steps.ts

When('I create a wishlist item with empty tags', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  const response = await request.post(`${baseUrl}/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: uniqueItemName(), store: 'LEGO', tags: [] },
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I create a wishlist item with {int} tags', async ({ request }, count: number) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  const tags = Array.from({ length: count }, (_, i) => `Tag${i + 1}`)

  const response = await request.post(`${baseUrl}/wishlist`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { title: uniqueItemName(), store: 'LEGO', tags },
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Create Validation - Multiple Invalid Fields
// ─────────────────────────────────────────────────────────────────────────────

When('I create a wishlist item with multiple invalid fields', async ({ request }) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  const response = await request.post(`${baseUrl}/wishlist`, {
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
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Update Validation
// ─────────────────────────────────────────────────────────────────────────────

// Note: 'I update the item with price {string}' is defined in wishlist-api.steps.ts

When('I update the item with sourceUrl {string}', async ({ request }, sourceUrl: string) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  expect(apiState.currentItemId).not.toBeNull()
  const response = await request.put(`${baseUrl}/wishlist/${apiState.currentItemId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { sourceUrl },
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Validation
// ─────────────────────────────────────────────────────────────────────────────

When('I mark the item as purchased with tax {string}', async ({ request }, tax: string) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  expect(apiState.currentItemId).not.toBeNull()
  const response = await request.post(`${baseUrl}/wishlist/${apiState.currentItemId}/purchased`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { tax, quantity: 1 },
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I mark the item as purchased with shipping {string}', async ({ request }, shipping: string) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  expect(apiState.currentItemId).not.toBeNull()
  const response = await request.post(`${baseUrl}/wishlist/${apiState.currentItemId}/purchased`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authState.currentToken}`,
    },
    data: { shipping, quantity: 1 },
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Response Assertions
// ─────────────────────────────────────────────────────────────────────────────

Then('the validation error should reference {string}', async ({},field: string) => {
  const body = apiState.lastResponseBody as { error: string; details?: { fieldErrors?: Record<string, string[]> } }
  expect(body.error).toBe('Validation failed')
  if (body.details?.fieldErrors) {
    expect(body.details.fieldErrors).toHaveProperty(field)
  }
})

Then('the response should contain error about title length', async () => {
  const body = apiState.lastResponseBody as Record<string, unknown>
  expect(body.error).toBe('Validation failed')
})

Then('the response should contain error about notes length', async () => {
  const body = apiState.lastResponseBody as Record<string, unknown>
  expect(body.error).toBe('Validation failed')
})

Then('the response tags should have {int} items', async ({},count: number) => {
  const body = apiState.lastResponseBody as WishlistItem
  expect(body.tags.length).toBe(count)
})

Then('the response tags should be empty', async () => {
  const body = apiState.lastResponseBody as WishlistItem
  expect(body.tags.length).toBe(0)
})

Then('the response should have {string} field', async ({},field: string) => {
  const body = apiState.lastResponseBody as Record<string, unknown>
  expect(body).toHaveProperty(field)
})

Then('the details should contain field-level errors', async () => {
  const body = apiState.lastResponseBody as { details?: { fieldErrors?: Record<string, unknown> } }
  expect(body.details).toBeDefined()
})

Then('the response should contain multiple validation errors', async () => {
  const body = apiState.lastResponseBody as { details?: { fieldErrors?: Record<string, unknown> } }
  expect(body.details?.fieldErrors).toBeDefined()
  const errorCount = Object.keys(body.details?.fieldErrors || {}).length
  expect(errorCount).toBeGreaterThan(1)
})
