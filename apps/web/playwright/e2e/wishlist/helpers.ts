import type { Page } from '@playwright/test'

/**
 * Minimal CreateWishlistItem payload shape matching CreateWishlistItemSchema.
 * We keep this local to tests to avoid importing app types into the Playwright
 * config environment.
 */
export interface CreateWishlistItemPayload {
  title: string
  store: string
  setNumber?: string
  sourceUrl?: string
  imageUrl?: string
  price?: string
  currency?: string
  pieceCount?: number
  releaseDate?: string
  tags?: string[]
  priority?: number
  notes?: string
}

export interface WishlistItemApiModel {
  id: string
  userId: string
  title: string
  store: string
  setNumber: string | null
  sourceUrl: string | null
  imageUrl: string | null
  price: string | null
  currency: string
  pieceCount: number | null
  releaseDate: string | null
  tags: string[]
  priority: number
  notes: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface WishlistListResponseApiModel {
  items: WishlistItemApiModel[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Remove all wishlist items for the currently authenticated test user.
 *
 * This is intended for use in E2E tests that own a dedicated test user and
 * can safely clear their wishlist between scenarios.
 */
export async function clearWishlistForCurrentUser(page: Page): Promise<void> {
  // Fetch up to 100 items at a time and delete them. This is sufficient for
  // test scenarios, which should keep their datasets small.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await page.request.get('/api/wishlist', {
      params: { limit: 100 },
    })

    if (!response.ok()) {
      throw new Error(
        `Failed to list wishlist items for cleanup: ${response.status()} ${await response.text()}`,
      )
    }

    const body = (await response.json()) as
      | { data?: WishlistListResponseApiModel }
      | WishlistListResponseApiModel
    const data = (body as any).data ?? body
    const { items } = data as WishlistListResponseApiModel

    if (!items.length) break

    // Best-effort deletion; if any delete fails we still try the remaining ones.
    for (const item of items) {
      try {
        await deleteWishlistItem(page, item.id)
      } catch {
        // ignore individual failures; a subsequent test run will surface issues
      }
    }
  }
}

/**
 * Create a wishlist item for the current authenticated user via the real API.
 *
 * The request is sent to /api/wishlist using the same cookie-based auth that
 * the frontend uses (Playwright shares cookies between page and request).
 */
export async function createWishlistItem(
  page: Page,
  overrides: CreateWishlistItemPayload,
): Promise<WishlistItemApiModel> {
  const now = Date.now()

  const base: CreateWishlistItemPayload = {
    title: `E2E Wishlist Item ${now}`,
    store: 'LEGO',
    currency: 'USD',
    tags: [],
    priority: 0,
    ...overrides,
  }

  const response = await page.request.post('/api/wishlist', {
    data: {
      title: base.title,
      store: base.store,
      setNumber: base.setNumber,
      sourceUrl: base.sourceUrl ?? '',
      imageUrl: base.imageUrl,
      price: base.price ?? '',
      currency: base.currency ?? 'USD',
      pieceCount: base.pieceCount,
      releaseDate: base.releaseDate,
      tags: base.tags ?? [],
      priority: base.priority ?? 0,
      notes: base.notes,
    },
  })

  if (!response.ok()) {
    throw new Error(`Failed to create wishlist item: ${response.status()} ${await response.text()}`)
  }

  const body = (await response.json()) as { data?: WishlistItemApiModel } | WishlistItemApiModel
  const item = (body as any).data ?? body
  return item as WishlistItemApiModel
}

/**
 * Delete a wishlist item for cleanup. Best-effort: does not throw on 404.
 */
export async function deleteWishlistItem(page: Page, id: string): Promise<void> {
  const response = await page.request.delete(`/api/wishlist/${id}`)
  if (response.status() === 404) return
  if (!response.ok()) {
    throw new Error(`Failed to delete wishlist item ${id}: ${response.status()}`)
  }
}

/**
 * Query wishlist items by search term using the real list endpoint.
 */
export async function findWishlistItemsBySearch(
  page: Page,
  query: string,
): Promise<WishlistItemApiModel[]> {
  const response = await page.request.get('/api/wishlist', {
    params: { q: query },
  })

  if (!response.ok()) {
    throw new Error(`Failed to query wishlist items: ${response.status()} ${await response.text()}`)
  }

  const body = (await response.json()) as { data?: WishlistListResponseApiModel } | WishlistListResponseApiModel
  const data = (body as any).data ?? body
  return (data as WishlistListResponseApiModel).items
}
