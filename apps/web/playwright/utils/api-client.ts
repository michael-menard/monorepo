/**
 * Wishlist API Client
 *
 * Typed API client for Playwright API tests.
 * Uses Playwright's request API for direct HTTP calls.
 *
 * @module utils/api-client
 */

import { z } from 'zod'
import type { APIRequestContext, APIResponse } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas (mirrored from @repo/api-client for test isolation)
// ─────────────────────────────────────────────────────────────────────────────

export const WishlistStoreSchema = z.enum(['LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other'])
export type WishlistStore = z.infer<typeof WishlistStoreSchema>

export const CurrencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])
export type Currency = z.infer<typeof CurrencySchema>

export const WishlistItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  store: z.string(),
  setNumber: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  imageVariants: z.any().nullable().optional(),
  price: z.string().nullable(),
  currency: z.string(),
  pieceCount: z.number().nullable(),
  releaseDate: z.string().nullable(),
  tags: z.array(z.string()),
  priority: z.number(),
  notes: z.string().nullable(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
})

export type WishlistItem = z.infer<typeof WishlistItemSchema>

export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
})

export type Pagination = z.infer<typeof PaginationSchema>

export const WishlistListResponseSchema = z.object({
  items: z.array(WishlistItemSchema),
  pagination: PaginationSchema,
  counts: z
    .object({
      total: z.number(),
      byStore: z.record(z.string(), z.number()),
    })
    .optional(),
  filters: z
    .object({
      availableTags: z.array(z.string()),
      availableStores: z.array(z.string()),
    })
    .optional(),
})

export type WishlistListResponse = z.infer<typeof WishlistListResponseSchema>

export const ReorderResponseSchema = z.object({
  updated: z.number(),
})

export type ReorderResponse = z.infer<typeof ReorderResponseSchema>

export const PresignResponseSchema = z.object({
  presignedUrl: z.string(),
  key: z.string(),
  expiresIn: z.number(),
})

export type PresignResponse = z.infer<typeof PresignResponseSchema>

export const SetItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  setNumber: z.string().nullable(),
  store: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  pieceCount: z.number().nullable(),
  releaseDate: z.string().nullable(),
  theme: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  notes: z.string().nullable(),
  isBuilt: z.boolean(),
  quantity: z.number(),
  purchasePrice: z.string().nullable(),
  tax: z.string().nullable(),
  shipping: z.string().nullable(),
  purchaseDate: z.string().nullable(),
  wishlistItemId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type SetItem = z.infer<typeof SetItemSchema>

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.any().optional(),
})

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Input Types
// ─────────────────────────────────────────────────────────────────────────────

export const CreateWishlistItemInputSchema = z.object({
  title: z.string().min(1),
  store: z.string().min(1),
  setNumber: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  price: z.string().optional(),
  currency: z.string().optional(),
  pieceCount: z.number().optional(),
  releaseDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.number().optional(),
  notes: z.string().optional(),
})

export type CreateWishlistItemInput = z.infer<typeof CreateWishlistItemInputSchema>

export const UpdateWishlistItemInputSchema = CreateWishlistItemInputSchema.partial()
export type UpdateWishlistItemInput = z.infer<typeof UpdateWishlistItemInputSchema>

export const ReorderInputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().min(0),
    }),
  ),
})

export type ReorderInput = z.infer<typeof ReorderInputSchema>

export const MarkAsPurchasedInputSchema = z.object({
  pricePaid: z.string().optional(),
  tax: z.string().optional(),
  shipping: z.string().optional(),
  quantity: z.number().optional(),
  purchaseDate: z.string().optional(),
  keepOnWishlist: z.boolean().optional(),
})

export type MarkAsPurchasedInput = z.infer<typeof MarkAsPurchasedInputSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Query Parameters
// ─────────────────────────────────────────────────────────────────────────────

export const WishlistSortFieldSchema = z.enum([
  'createdAt',
  'title',
  'price',
  'pieceCount',
  'sortOrder',
  'priority',
  'bestValue',
  'expiringSoon',
  'hiddenGems',
])

export type WishlistSortField = z.infer<typeof WishlistSortFieldSchema>

export type WishlistQueryParams = {
  page?: number
  limit?: number
  search?: string
  store?: string
  tags?: string
  priority?: number
  sort?: WishlistSortField
  order?: 'asc' | 'desc'
}

export type PresignQueryParams = {
  fileName: string
  mimeType: string
  fileSize?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// API Client Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wishlist API Client
 *
 * Provides typed methods for all wishlist API endpoints.
 * Supports schema validation on responses.
 */
export class WishlistApiClient {
  private request: APIRequestContext
  private baseUrl: string
  private authToken: string | null = null

  constructor(request: APIRequestContext, baseUrl: string = 'http://localhost:4000') {
    this.request = request
    this.baseUrl = baseUrl
  }

  /**
   * Set the authentication token for subsequent requests
   */
  setAuthToken(token: string | null): void {
    this.authToken = token
  }

  /**
   * Get common headers including auth if set
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }
    return headers
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, unknown>): string {
    const url = new URL(`${this.baseUrl}${path}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value))
        }
      })
    }
    return url.toString()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // List & Query
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/wishlist - List wishlist items
   */
  async list(params?: WishlistQueryParams): Promise<APIResponse> {
    return this.request.get(this.buildUrl('/api/wishlist', params), {
      headers: this.getHeaders(),
    })
  }

  /**
   * List with parsed response
   */
  async listParsed(params?: WishlistQueryParams): Promise<WishlistListResponse> {
    const response = await this.list(params)
    const json = await response.json()
    return WishlistListResponseSchema.parse(json)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/wishlist/:id - Get single item
   */
  async get(id: string): Promise<APIResponse> {
    return this.request.get(`${this.baseUrl}/api/wishlist/${id}`, {
      headers: this.getHeaders(),
    })
  }

  /**
   * Get with parsed response
   */
  async getParsed(id: string): Promise<WishlistItem> {
    const response = await this.get(id)
    const json = await response.json()
    return WishlistItemSchema.parse(json)
  }

  /**
   * POST /api/wishlist - Create item
   */
  async create(data: CreateWishlistItemInput): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/api/wishlist`, {
      headers: this.getHeaders(),
      data,
    })
  }

  /**
   * Create with parsed response
   */
  async createParsed(data: CreateWishlistItemInput): Promise<WishlistItem> {
    const response = await this.create(data)
    const json = await response.json()
    return WishlistItemSchema.parse(json)
  }

  /**
   * PUT /api/wishlist/:id - Update item
   */
  async update(id: string, data: UpdateWishlistItemInput): Promise<APIResponse> {
    return this.request.put(`${this.baseUrl}/api/wishlist/${id}`, {
      headers: this.getHeaders(),
      data,
    })
  }

  /**
   * Update with parsed response
   */
  async updateParsed(id: string, data: UpdateWishlistItemInput): Promise<WishlistItem> {
    const response = await this.update(id, data)
    const json = await response.json()
    return WishlistItemSchema.parse(json)
  }

  /**
   * DELETE /api/wishlist/:id - Delete item
   */
  async delete(id: string): Promise<APIResponse> {
    return this.request.delete(`${this.baseUrl}/api/wishlist/${id}`, {
      headers: this.getHeaders(),
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Reorder
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * PUT /api/wishlist/reorder - Batch reorder items
   */
  async reorder(data: ReorderInput): Promise<APIResponse> {
    return this.request.put(`${this.baseUrl}/api/wishlist/reorder`, {
      headers: this.getHeaders(),
      data,
    })
  }

  /**
   * Reorder with parsed response
   */
  async reorderParsed(data: ReorderInput): Promise<ReorderResponse> {
    const response = await this.reorder(data)
    const json = await response.json()
    return ReorderResponseSchema.parse(json)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Image Upload
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/wishlist/images/presign - Get presigned URL
   */
  async presign(params: PresignQueryParams): Promise<APIResponse> {
    return this.request.get(this.buildUrl('/api/wishlist/images/presign', params), {
      headers: this.getHeaders(),
    })
  }

  /**
   * Presign with parsed response
   */
  async presignParsed(params: PresignQueryParams): Promise<PresignResponse> {
    const response = await this.presign(params)
    const json = await response.json()
    return PresignResponseSchema.parse(json)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Purchase
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/wishlist/:id/purchased - Mark item as purchased
   */
  async markAsPurchased(id: string, data: MarkAsPurchasedInput): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/api/wishlist/${id}/purchased`, {
      headers: this.getHeaders(),
      data,
    })
  }

  /**
   * Mark as purchased with parsed response
   */
  async markAsPurchasedParsed(id: string, data: MarkAsPurchasedInput): Promise<SetItem> {
    const response = await this.markAsPurchased(id, data)
    const json = await response.json()
    return SetItemSchema.parse(json)
  }
}

/**
 * Create a new WishlistApiClient instance
 */
export function createWishlistApiClient(
  request: APIRequestContext,
  baseUrl?: string,
): WishlistApiClient {
  return new WishlistApiClient(request, baseUrl)
}
