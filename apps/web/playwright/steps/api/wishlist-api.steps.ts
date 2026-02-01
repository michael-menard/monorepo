/**
 * Wishlist API Step Definitions
 *
 * Core step definitions for wishlist API testing.
 * Implements CRUD operations, sorting, and general API interactions.
 *
 * Stories: WISH-2001, WISH-2002, WISH-2004, WISH-2005a, WISH-2014
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import {
  createWishlistApiClient,
  WishlistApiClient,
  type WishlistItem,
  type WishlistListResponse,
  type WishlistSortField,
} from '../../utils/api-client'
import {
  createValidWishlistItem,
  createMinimalWishlistItem,
  createFromSample,
  createValidReorderInput,
  uniqueItemName,
  randomUUID,
} from '../../utils/api-fixtures'
import { TEST_USERS, authState, generateMockToken } from '../../utils/api-auth'

const { Given, When, Then } = createBdd()

// ─────────────────────────────────────────────────────────────────────────────
// Shared State
// ─────────────────────────────────────────────────────────────────────────────

interface ApiTestState {
  client: WishlistApiClient | null
  lastResponse: Response | null
  lastResponseBody: unknown
  lastResponseStatus: number
  createdItems: WishlistItem[]
  currentItemId: string | null
  listResponse: WishlistListResponse | null
  storedValues: Record<string, unknown>
}

const apiState: ApiTestState = {
  client: null,
  lastResponse: null,
  lastResponseBody: null,
  lastResponseStatus: 0,
  createdItems: [],
  currentItemId: null,
  listResponse: null,
  storedValues: {},
}

// Reset state before each scenario
function resetState(): void {
  apiState.lastResponse = null
  apiState.lastResponseBody = null
  apiState.lastResponseStatus = 0
  apiState.createdItems = []
  apiState.currentItemId = null
  apiState.listResponse = null
  apiState.storedValues = {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Background / Setup Steps
// ─────────────────────────────────────────────────────────────────────────────

Given('the API is available', async ({ request }) => {
  resetState()
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
  apiState.client = createWishlistApiClient(request, baseUrl)
})

Given('I am authenticated as the primary test user', async () => {
  authState.setUser(TEST_USERS.primary)
  apiState.client?.setAuthToken(authState.currentToken)
})

Given('I am authenticated as the secondary test user', async () => {
  authState.setUser(TEST_USERS.secondary)
  apiState.client?.setAuthToken(authState.currentToken)
})

Given('I am not authenticated', async () => {
  authState.clear()
  apiState.client?.setAuthToken(null)
})

// ─────────────────────────────────────────────────────────────────────────────
// List Operations
// ─────────────────────────────────────────────────────────────────────────────

When('I request the wishlist list endpoint', async () => {
  const response = await apiState.client!.list()
  apiState.lastResponseStatus = response.status()
  if (response.ok()) {
    apiState.lastResponseBody = await response.json()
    apiState.listResponse = apiState.lastResponseBody as WishlistListResponse
  } else {
    apiState.lastResponseBody = await response.json().catch(() => null)
  }
})

When('I request the wishlist list with page {int} and limit {int}', async ({},page: number, limit: number) => {
  const response = await apiState.client!.list({ page, limit })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
  if (response.ok()) {
    apiState.listResponse = apiState.lastResponseBody as WishlistListResponse
  }
})

When('I request the wishlist list with search {string}', async ({},search: string) => {
  const response = await apiState.client!.list({ search })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
  if (response.ok()) {
    apiState.listResponse = apiState.lastResponseBody as WishlistListResponse
  }
})

When('I request the wishlist list filtered by store {string}', async ({},store: string) => {
  const response = await apiState.client!.list({ store })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
  if (response.ok()) {
    apiState.listResponse = apiState.lastResponseBody as WishlistListResponse
  }
})

When('I request the wishlist list filtered by priority {int}', async ({},priority: number) => {
  const response = await apiState.client!.list({ priority })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
  if (response.ok()) {
    apiState.listResponse = apiState.lastResponseBody as WishlistListResponse
  }
})

When('I request the wishlist list filtered by tags {string}', async ({},tags: string) => {
  const response = await apiState.client!.list({ tags })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
  if (response.ok()) {
    apiState.listResponse = apiState.lastResponseBody as WishlistListResponse
  }
})

When('I request the wishlist list sorted by {string} {string}', async ({},sort: string, order: string) => {
  const response = await apiState.client!.list({
    sort: sort as WishlistSortField,
    order: order as 'asc' | 'desc',
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
  if (response.ok()) {
    apiState.listResponse = apiState.lastResponseBody as WishlistListResponse
  }
})

When('I request the wishlist list sorted by {string} {string} with page {int} and limit {int}', async ({},sort: string, order: string, page: number, limit: number) => {
  const response = await apiState.client!.list({
    sort: sort as WishlistSortField,
    order: order as 'asc' | 'desc',
    page,
    limit,
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
  if (response.ok()) {
    apiState.listResponse = apiState.lastResponseBody as WishlistListResponse
  }
})

When('I request the wishlist list filtered by store {string} sorted by {string} {string}', async ({},store: string, sort: string, order: string) => {
  const response = await apiState.client!.list({
    store,
    sort: sort as WishlistSortField,
    order: order as 'asc' | 'desc',
  })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
  if (response.ok()) {
    apiState.listResponse = apiState.lastResponseBody as WishlistListResponse
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Single Item Operations
// ─────────────────────────────────────────────────────────────────────────────

When('I request the single item endpoint', async () => {
  expect(apiState.currentItemId).not.toBeNull()
  const response = await apiState.client!.get(apiState.currentItemId!)
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I request the item with ID {string}', async ({},id: string) => {
  const response = await apiState.client!.get(id)
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I request the deleted item', async () => {
  expect(apiState.currentItemId).not.toBeNull()
  const response = await apiState.client!.get(apiState.currentItemId!)
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I request the original wishlist item', async () => {
  expect(apiState.currentItemId).not.toBeNull()
  const response = await apiState.client!.get(apiState.currentItemId!)
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Create Operations
// ─────────────────────────────────────────────────────────────────────────────

Given('I have created a wishlist item', async () => {
  const data = createMinimalWishlistItem({ title: uniqueItemName() })
  const response = await apiState.client!.create(data)
  expect(response.status()).toBe(201)
  const item = await response.json()
  apiState.createdItems.push(item)
  apiState.currentItemId = item.id
})

Given('I have created a wishlist item with title {string}', async ({},title: string) => {
  const data = createMinimalWishlistItem({ title })
  const response = await apiState.client!.create(data)
  expect(response.status()).toBe(201)
  const item = await response.json()
  apiState.createdItems.push(item)
  apiState.currentItemId = item.id
})

Given('I have created a wishlist item with tags {string}', async ({},tagsStr: string) => {
  const tags = tagsStr.split(',').map(t => t.trim())
  const data = createValidWishlistItem({ title: uniqueItemName(), tags })
  const response = await apiState.client!.create(data)
  expect(response.status()).toBe(201)
  const item = await response.json()
  apiState.createdItems.push(item)
  apiState.currentItemId = item.id
})

Given('I have created a wishlist item with priority {int}', async ({},priority: number) => {
  const data = createValidWishlistItem({ title: uniqueItemName(), priority })
  const response = await apiState.client!.create(data)
  expect(response.status()).toBe(201)
  const item = await response.json()
  apiState.createdItems.push(item)
  apiState.currentItemId = item.id
})

Given('I have created a wishlist item with title {string} and price {string}', async ({},title: string, price: string) => {
  const data = createValidWishlistItem({ title, price })
  const response = await apiState.client!.create(data)
  expect(response.status()).toBe(201)
  const item = await response.json()
  apiState.createdItems.push(item)
  apiState.currentItemId = item.id
})

Given('I have created a wishlist item with all fields', async () => {
  const data = createValidWishlistItem({ title: uniqueItemName() })
  const response = await apiState.client!.create(data)
  expect(response.status()).toBe(201)
  const item = await response.json()
  apiState.createdItems.push(item)
  apiState.currentItemId = item.id
})

Given('I have created {int} wishlist items', async ({},count: number) => {
  for (let i = 0; i < count; i++) {
    const data = createMinimalWishlistItem({ title: `Test Item ${i + 1}` })
    const response = await apiState.client!.create(data)
    expect(response.status()).toBe(201)
    const item = await response.json()
    apiState.createdItems.push(item)
  }
  if (apiState.createdItems.length > 0) {
    apiState.currentItemId = apiState.createdItems[0].id
  }
})

Given('I have created items with titles {string}, {string}, {string}', async ({},t1: string, t2: string, t3: string) => {
  for (const title of [t1, t2, t3]) {
    const data = createMinimalWishlistItem({ title })
    const response = await apiState.client!.create(data)
    expect(response.status()).toBe(201)
    const item = await response.json()
    apiState.createdItems.push(item)
  }
})

Given('I have created items with prices {string}, {string}, {string}', async ({},p1: string, p2: string, p3: string) => {
  for (const price of [p1, p2, p3]) {
    const data = createValidWishlistItem({ title: uniqueItemName(), price })
    const response = await apiState.client!.create(data)
    expect(response.status()).toBe(201)
    const item = await response.json()
    apiState.createdItems.push(item)
  }
})

Given('I have created items with priorities {int}, {int}, {int}', async ({},p1: number, p2: number, p3: number) => {
  for (const priority of [p1, p2, p3]) {
    const data = createValidWishlistItem({ title: uniqueItemName(), priority })
    const response = await apiState.client!.create(data)
    expect(response.status()).toBe(201)
    const item = await response.json()
    apiState.createdItems.push(item)
  }
})

When('I create a wishlist item with all fields', async () => {
  const data = createValidWishlistItem({ title: uniqueItemName() })
  const response = await apiState.client!.create(data)
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
  if (response.ok()) {
    apiState.createdItems.push(apiState.lastResponseBody as WishlistItem)
    apiState.currentItemId = (apiState.lastResponseBody as WishlistItem).id
  }
})

When('I create a wishlist item with only required fields', async () => {
  const data = createMinimalWishlistItem({ title: uniqueItemName() })
  const response = await apiState.client!.create(data)
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
  if (response.ok()) {
    apiState.createdItems.push(apiState.lastResponseBody as WishlistItem)
    apiState.currentItemId = (apiState.lastResponseBody as WishlistItem).id
  }
})

When('I create a wishlist item with store {string}', async ({},store: string) => {
  const data = createMinimalWishlistItem({ title: uniqueItemName(), store })
  const response = await apiState.client!.create(data)
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I create a wishlist item with currency {string}', async ({},currency: string) => {
  const data = createValidWishlistItem({ title: uniqueItemName(), currency })
  const response = await apiState.client!.create(data)
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I create a wishlist item with tags {string}', async ({},tagsStr: string) => {
  const tags = tagsStr.split(',').map(t => t.trim())
  const data = createValidWishlistItem({ title: uniqueItemName(), tags })
  const response = await apiState.client!.create(data)
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Update Operations
// ─────────────────────────────────────────────────────────────────────────────

When('I update the item with title {string}', async ({},title: string) => {
  expect(apiState.currentItemId).not.toBeNull()
  const response = await apiState.client!.update(apiState.currentItemId!, { title })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I update the item with price {string}', async ({},price: string) => {
  expect(apiState.currentItemId).not.toBeNull()
  const response = await apiState.client!.update(apiState.currentItemId!, { price })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I update the item with priority {int}', async ({},priority: number) => {
  expect(apiState.currentItemId).not.toBeNull()
  const response = await apiState.client!.update(apiState.currentItemId!, { priority })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

When('I update the item with ID {string} with title {string}', async ({},id: string, title: string) => {
  const response = await apiState.client!.update(id, { title })
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json().catch(() => null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Delete Operations
// ─────────────────────────────────────────────────────────────────────────────

When('I delete the item', async () => {
  expect(apiState.currentItemId).not.toBeNull()
  const response = await apiState.client!.delete(apiState.currentItemId!)
  apiState.lastResponseStatus = response.status()
  // 204 has no body
  if (response.status() !== 204) {
    apiState.lastResponseBody = await response.json().catch(() => null)
  } else {
    apiState.lastResponseBody = null
  }
})

When('I delete the item with ID {string}', async ({},id: string) => {
  const response = await apiState.client!.delete(id)
  apiState.lastResponseStatus = response.status()
  if (response.status() !== 204) {
    apiState.lastResponseBody = await response.json().catch(() => null)
  } else {
    apiState.lastResponseBody = null
  }
})

When('I delete the same item again', async () => {
  expect(apiState.currentItemId).not.toBeNull()
  const response = await apiState.client!.delete(apiState.currentItemId!)
  apiState.lastResponseStatus = response.status()
  if (response.status() !== 204) {
    apiState.lastResponseBody = await response.json().catch(() => null)
  } else {
    apiState.lastResponseBody = null
  }
})

Given('I have deleted the item', async () => {
  expect(apiState.currentItemId).not.toBeNull()
  const response = await apiState.client!.delete(apiState.currentItemId!)
  expect(response.status()).toBe(204)
})

Given('I have deleted the second item', async () => {
  expect(apiState.createdItems.length).toBeGreaterThan(1)
  const response = await apiState.client!.delete(apiState.createdItems[1].id)
  expect(response.status()).toBe(204)
  apiState.createdItems.splice(1, 1)
})

// ─────────────────────────────────────────────────────────────────────────────
// Response Assertions
// ─────────────────────────────────────────────────────────────────────────────

Then('the response status should be {int}', async ({},status: number) => {
  expect(apiState.lastResponseStatus).toBe(status)
})

Then('the response should contain an {string} array', async ({},field: string) => {
  expect(apiState.lastResponseBody).toHaveProperty(field)
  expect(Array.isArray((apiState.lastResponseBody as Record<string, unknown>)[field])).toBe(true)
})

Then('the response should contain {string} metadata', async ({},field: string) => {
  expect(apiState.lastResponseBody).toHaveProperty(field)
})

Then('the pagination should have {string}, {string}, {string}, and {string} fields', async ({},f1: string, f2: string, f3: string, f4: string) => {
  const body = apiState.lastResponseBody as WishlistListResponse
  expect(body.pagination).toHaveProperty(f1)
  expect(body.pagination).toHaveProperty(f2)
  expect(body.pagination).toHaveProperty(f3)
  expect(body.pagination).toHaveProperty(f4)
})

Then('the pagination limit should be {int}', async ({},limit: number) => {
  const body = apiState.lastResponseBody as WishlistListResponse
  expect(body.pagination.limit).toBe(limit)
})

Then('the items array should have at most {int} items', async ({},max: number) => {
  const body = apiState.lastResponseBody as WishlistListResponse
  expect(body.items.length).toBeLessThanOrEqual(max)
})

Then('the items array should have {int} items', async ({},count: number) => {
  const body = apiState.lastResponseBody as WishlistListResponse
  expect(body.items.length).toBe(count)
})

Then('the pagination total should be {int}', async ({},total: number) => {
  const body = apiState.lastResponseBody as WishlistListResponse
  expect(body.pagination.total).toBe(total)
})

Then('all returned items should contain {string} in the title', async ({},searchTerm: string) => {
  const body = apiState.lastResponseBody as WishlistListResponse
  for (const item of body.items) {
    expect(item.title.toLowerCase()).toContain(searchTerm.toLowerCase())
  }
})

Then('all returned items should have store {string}', async ({},store: string) => {
  const body = apiState.lastResponseBody as WishlistListResponse
  for (const item of body.items) {
    expect(item.store).toBe(store)
  }
})

Then('all returned items should have priority {int}', async ({},priority: number) => {
  const body = apiState.lastResponseBody as WishlistListResponse
  for (const item of body.items) {
    expect(item.priority).toBe(priority)
  }
})

Then('all returned items should contain tag {string}', async ({},tag: string) => {
  const body = apiState.lastResponseBody as WishlistListResponse
  for (const item of body.items) {
    expect(item.tags).toContain(tag)
  }
})

Then('the items should be sorted by sortOrder ascending', async () => {
  const body = apiState.lastResponseBody as WishlistListResponse
  for (let i = 1; i < body.items.length; i++) {
    expect(body.items[i].sortOrder).toBeGreaterThanOrEqual(body.items[i - 1].sortOrder)
  }
})

Then('the counts should include {string} and {string}', async ({},f1: string, f2: string) => {
  const body = apiState.lastResponseBody as WishlistListResponse
  expect(body.counts).toHaveProperty(f1)
  expect(body.counts).toHaveProperty(f2)
})

Then('the filters should include {string} and {string}', async ({},f1: string, f2: string) => {
  const body = apiState.lastResponseBody as WishlistListResponse
  expect(body.filters).toHaveProperty(f1)
  expect(body.filters).toHaveProperty(f2)
})

Then('the response should match the wishlist item schema', async () => {
  const body = apiState.lastResponseBody as WishlistItem
  expect(body).toHaveProperty('id')
  expect(body).toHaveProperty('userId')
  expect(body).toHaveProperty('title')
  expect(body).toHaveProperty('store')
  expect(body).toHaveProperty('sortOrder')
  expect(body).toHaveProperty('createdAt')
  expect(body).toHaveProperty('updatedAt')
})

Then('the response should contain a valid UUID id', async () => {
  const body = apiState.lastResponseBody as WishlistItem
  expect(body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
})

Then('the response should have the correct userId', async () => {
  const body = apiState.lastResponseBody as WishlistItem
  expect(body.userId).toBe(authState.currentUser?.id)
})

Then('the response should have default values for optional fields', async () => {
  const body = apiState.lastResponseBody as WishlistItem
  expect(body.priority).toBe(0)
  expect(body.tags).toEqual([])
})

Then('the response should have a sortOrder value', async () => {
  const body = apiState.lastResponseBody as WishlistItem
  expect(typeof body.sortOrder).toBe('number')
})

Then('the response store should be {string}', async ({},store: string) => {
  const body = apiState.lastResponseBody as WishlistItem
  expect(body.store).toBe(store)
})

Then('the response tags should contain {string}', async ({},tag: string) => {
  const body = apiState.lastResponseBody as WishlistItem
  expect(body.tags).toContain(tag)
})

Then('the response title should be {string}', async ({},title: string) => {
  const body = apiState.lastResponseBody as WishlistItem
  expect(body.title).toBe(title)
})

Then('the response price should be {string}', async ({},price: string) => {
  const body = apiState.lastResponseBody as WishlistItem
  expect(body.price).toBe(price)
})

Then('the response priority should be {int}', async ({},priority: number) => {
  const body = apiState.lastResponseBody as WishlistItem
  expect(body.priority).toBe(priority)
})

Then('the response body should be empty', async () => {
  expect(apiState.lastResponseBody).toBeNull()
})

Then('the response should contain error {string}', async ({},error: string) => {
  const body = apiState.lastResponseBody as Record<string, unknown>
  expect(body.error).toBe(error)
})

Then('the response should contain a validation error', async () => {
  const body = apiState.lastResponseBody as Record<string, unknown>
  expect(body.error).toBe('Validation failed')
  expect(body).toHaveProperty('details')
})
