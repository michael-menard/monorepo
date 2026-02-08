import { http, HttpResponse } from 'msw'
import type { MockWishlistItem, MockWishlistListResponse } from '../test/mocks/wishlist-types'
import { mockWishlistItems, wishlistListResponse } from '../test/mocks/wishlist-mocks'
import { mockSets, buildSetListResponse } from '../test/mocks/sets-mocks'
import {
  mockMocInstructions,
  buildMocListResponse,
  type MockMocInstruction,
} from '../test/mocks/instructions-mocks'

// NOTE: These handlers are used by MSW when VITE_ENABLE_MSW === 'true'.
// They mock the core wishlist API and related flows used by the main app
// and Playwright E2E tests.

export const handlers = [
  // Health check or basic ping (optional)
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'ok',
      service: 'main-app-mock-backend',
      timestamp: new Date().toISOString(),
    })
  }),

  // V2 Health check
  http.get('/api/v2/health', () => {
    return HttpResponse.json({
      status: 'ok',
      service: 'main-app-mock-backend',
      timestamp: new Date().toISOString(),
    })
  }),

  // ---------------------------------------------------------------------------
  // V2 Wishlist API Endpoints (used by RTK Query)
  // ---------------------------------------------------------------------------

  // GET /api/v2/wishlist/items - v2 list endpoint (RTK Query uses this)
  http.get('/api/v2/wishlist/items', async ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('query') || url.searchParams.get('q') || undefined
    const scenario = url.searchParams.get('__wishlistScenario') || undefined

    // Scenario-specific behavior for E2E tests
    if (scenario === 'error') {
      return HttpResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Failed to load wishlist' },
        { status: 500 },
      )
    }

    if (scenario === 'empty') {
      const emptyResponse: MockWishlistListResponse = wishlistListResponse([])
      return HttpResponse.json(emptyResponse, { status: 200 })
    }

    let items: MockWishlistItem[] = [...mockWishlistItems]

    // Apply filters
    if (q) {
      const lower = q.toLowerCase()
      items = items.filter(item => {
        return (
          item.title.toLowerCase().includes(lower) ||
          item.setNumber?.toLowerCase().includes(lower) ||
          item.tags.some(tag => tag.toLowerCase().includes(lower))
        )
      })
    }

    const response: MockWishlistListResponse = wishlistListResponse(items)
    return HttpResponse.json(response, { status: 200 })
  }),

  // GET /api/v2/wishlist/items/:id - v2 single item endpoint
  http.get('/api/v2/wishlist/items/:id', ({ params }) => {
    const id = String(params.id)
    const item = mockWishlistItems.find(i => i.id === id)

    if (!item) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Item not found' }, { status: 404 })
    }

    return HttpResponse.json({ data: item }, { status: 200 })
  }),

  // POST /api/v2/wishlist/items - v2 create item
  http.post('/api/v2/wishlist/items', async ({ request }) => {
    const body = (await request.json()) as Partial<MockWishlistItem>

    const created: MockWishlistItem = {
      id: `wish-${(mockWishlistItems.length + 1).toString().padStart(3, '0')}`,
      userId: 'test-user-123',
      title: body.title ?? 'New Wishlist Item',
      store: (body.store as any) ?? 'LEGO',
      setNumber: body.setNumber ?? null,
      sourceUrl: body.sourceUrl ?? null,
      imageUrl: body.imageUrl ?? null,
      price: body.price ?? null,
      currency: body.currency ?? 'USD',
      pieceCount: body.pieceCount ?? null,
      releaseDate: body.releaseDate ?? null,
      tags: body.tags ?? [],
      priority: body.priority ?? 0,
      notes: body.notes ?? null,
      sortOrder: mockWishlistItems.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mockWishlistItems.push(created)

    return HttpResponse.json({ data: created }, { status: 201 })
  }),

  // PUT /api/v2/wishlist/items/:id - v2 update item
  http.put('/api/v2/wishlist/items/:id', async ({ params, request }) => {
    const id = String(params.id)
    const index = mockWishlistItems.findIndex(i => i.id === id)
    if (index === -1) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Item not found' }, { status: 404 })
    }

    const body = (await request.json()) as Partial<MockWishlistItem>
    const updated: MockWishlistItem = {
      ...mockWishlistItems[index],
      ...body,
      updatedAt: new Date().toISOString(),
    }
    mockWishlistItems[index] = updated

    return HttpResponse.json({ data: updated }, { status: 200 })
  }),

  // DELETE /api/v2/wishlist/items/:id - v2 delete item
  http.delete('/api/v2/wishlist/items/:id', ({ params }) => {
    const id = String(params.id)
    const index = mockWishlistItems.findIndex(i => i.id === id)
    if (index === -1) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Item not found' }, { status: 404 })
    }

    mockWishlistItems.splice(index, 1)

    return HttpResponse.json({ data: { message: 'Item deleted' } }, { status: 200 })
  }),

  // ---------------------------------------------------------------------------
  // Instructions (MOC) Gallery API Endpoints
  // Story INST-1100: MOC Gallery E2E tests
  // ---------------------------------------------------------------------------

  // GET /api/v2/instructions/mocs - List MOC instructions with pagination
  http.get('*/api/v2/instructions/mocs', async ({ request }) => {
    console.log('[MSW] Intercepted instructions request:', request.url)
    const url = new URL(request.url)
    const search = url.searchParams.get('search') || undefined
    const theme = url.searchParams.get('theme') || undefined
    const type = url.searchParams.get('type') || undefined
    const status = url.searchParams.get('status') || undefined
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    const scenario = url.searchParams.get('__instructionsScenario') || undefined
    const delayMsParam = url.searchParams.get('__instructionsDelayMs') || '0'
    const delayMs = Number.isNaN(Number(delayMsParam)) ? 0 : Number(delayMsParam)

    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    // Scenario-specific behavior for E2E tests
    if (scenario === 'error') {
      return HttpResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Failed to load instructions' },
        { status: 500 },
      )
    }

    if (scenario === 'empty') {
      return HttpResponse.json(buildMocListResponse([], page, limit), { status: 200 })
    }

    let items: MockMocInstruction[] = [...mockMocInstructions]

    // Apply filters
    if (search) {
      const lower = search.toLowerCase()
      items = items.filter(item => {
        return (
          item.title.toLowerCase().includes(lower) ||
          item.description?.toLowerCase().includes(lower) ||
          item.tags.some(tag => tag.toLowerCase().includes(lower))
        )
      })
    }

    if (theme) {
      items = items.filter(item => item.theme === theme)
    }

    if (type) {
      items = items.filter(item => item.type === type)
    }

    if (status) {
      items = items.filter(item => item.status === status)
    }

    const response = buildMocListResponse(items, page, limit)
    return HttpResponse.json(response, { status: 200 })
  }),

  // GET /api/v2/instructions/mocs/:id - Get single MOC instruction
  http.get('/api/v2/instructions/mocs/:id', ({ params }) => {
    const id = String(params.id)
    const item = mockMocInstructions.find(i => i.id === id)

    if (!item) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Instruction not found' }, { status: 404 })
    }

    return HttpResponse.json(item, { status: 200 })
  }),

  // PATCH /api/v2/instructions/mocs/:id - Update MOC instruction
  http.patch('/api/v2/instructions/mocs/:id', async ({ params, request }) => {
    const id = String(params.id)
    const index = mockMocInstructions.findIndex(i => i.id === id)
    if (index === -1) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Instruction not found' }, { status: 404 })
    }

    const body = (await request.json()) as Partial<MockMocInstruction>
    const updated: MockMocInstruction = {
      ...mockMocInstructions[index],
      ...body,
      updatedAt: new Date().toISOString(),
    }
    mockMocInstructions[index] = updated

    return HttpResponse.json(updated, { status: 200 })
  }),

  // DELETE /api/v2/instructions/mocs/:id - Delete MOC instruction
  http.delete('/api/v2/instructions/mocs/:id', ({ params }) => {
    const id = String(params.id)
    const index = mockMocInstructions.findIndex(i => i.id === id)
    if (index === -1) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Instruction not found' }, { status: 404 })
    }

    mockMocInstructions.splice(index, 1)
    return HttpResponse.json({ message: 'Instruction deleted' }, { status: 200 })
  }),

  // ---------------------------------------------------------------------------
  // Legacy Wishlist API Endpoints (v1 - kept for backward compatibility)
  // ---------------------------------------------------------------------------

  // GET /api/wishlist - list endpoint
  http.get('/api/wishlist', async ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q') || undefined
    const store = url.searchParams.get('store') || undefined
    const scenario = url.searchParams.get('__wishlistScenario') || undefined
    const delayMsParam = url.searchParams.get('__wishlistDelayMs') || '0'
    const delayMs = Number.isNaN(Number(delayMsParam)) ? 0 : Number(delayMsParam)

    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    // Scenario-specific behavior for E2E tests (driven via query params)
    if (scenario === 'error') {
      return HttpResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Failed to load wishlist' },
        { status: 500 },
      )
    }

    if (scenario === 'empty') {
      const emptyResponse: MockWishlistListResponse = wishlistListResponse([])
      return HttpResponse.json(emptyResponse, { status: 200 })
    }

    let items: MockWishlistItem[] = [...mockWishlistItems]

    if (scenario === 'many') {
      // Generate additional mock items to exceed a single page
      const manyItems: MockWishlistItem[] = [...items]
      for (let i = items.length; i < 30; i++) {
        manyItems.push({
          ...items[0],
          id: `wish-${(i + 1).toString().padStart(3, '0')}`,
          title: `Mock Set ${i + 1}`,
          sortOrder: i + 1,
        })
      }
      items = manyItems
    }

    // Apply filters
    if (q) {
      const lower = q.toLowerCase()
      items = items.filter(item => {
        return (
          item.title.toLowerCase().includes(lower) ||
          item.setNumber?.toLowerCase().includes(lower) ||
          item.tags.some(tag => tag.toLowerCase().includes(lower))
        )
      })
    }

    if (store) {
      items = items.filter(item => item.store === store)
    }

    const response: MockWishlistListResponse = wishlistListResponse(items)

    return HttpResponse.json(response, { status: 200 })
  }),

  // ---------------------------------------------------------------------------
  // Sets gallery read-only list endpoint (MSW only)
  // ---------------------------------------------------------------------------

  http.get('/api/sets', async ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('search') || undefined
    const theme = url.searchParams.get('theme') || undefined
    const scenario = url.searchParams.get('__setsScenario') || undefined
    const delayMsParam = url.searchParams.get('__setsDelayMs') || '0'
    const delayMs = Number.isNaN(Number(delayMsParam)) ? 0 : Number(delayMsParam)

    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    // Scenario-specific behavior for E2E tests
    if (scenario === 'error') {
      return HttpResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Failed to load sets' },
        { status: 500 },
      )
    }

    if (scenario === 'empty') {
      return HttpResponse.json(buildSetListResponse([]), { status: 200 })
    }

    let items = [...mockSets]

    if (q) {
      const lower = q.toLowerCase()
      items = items.filter(setItem => {
        return (
          setItem.title.toLowerCase().includes(lower) ||
          setItem.setNumber?.toLowerCase().includes(lower) ||
          setItem.tags.some(tag => tag.toLowerCase().includes(lower))
        )
      })
    }

    if (theme) {
      items = items.filter(setItem => setItem.theme === theme)
    }

    const response = buildSetListResponse(items)
    return HttpResponse.json(response, { status: 200 })
  }),

  // GET /api/wishlist/:id - single item endpoint
  http.get('/api/wishlist/:id', ({ params }) => {
    const id = String(params.id)
    const item = mockWishlistItems.find(i => i.id === id)

    if (!item) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Item not found' }, { status: 404 })
    }

    return HttpResponse.json(item, { status: 200 })
  }),

  // POST /api/wishlist - create item
  http.post('/api/wishlist', async ({ request }) => {
    const body = (await request.json()) as Partial<MockWishlistItem>

    const created: MockWishlistItem = {
      id: `wish-${(mockWishlistItems.length + 1).toString().padStart(3, '0')}`,
      userId: 'test-user-123',
      title: body.title ?? 'New Wishlist Item',
      store: (body.store as any) ?? 'LEGO',
      setNumber: body.setNumber ?? null,
      sourceUrl: body.sourceUrl ?? null,
      imageUrl: body.imageUrl ?? null,
      price: body.price ?? null,
      currency: body.currency ?? 'USD',
      pieceCount: body.pieceCount ?? null,
      releaseDate: body.releaseDate ?? null,
      tags: body.tags ?? [],
      priority: body.priority ?? 0,
      notes: body.notes ?? null,
      sortOrder: mockWishlistItems.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mockWishlistItems.push(created)

    return HttpResponse.json(created, { status: 201 })
  }),

  // PATCH /api/wishlist/:id - update item
  http.patch('/api/wishlist/:id', async ({ params, request }) => {
    const id = String(params.id)
    const index = mockWishlistItems.findIndex(i => i.id === id)
    if (index === -1) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Item not found' }, { status: 404 })
    }

    const body = (await request.json()) as Partial<MockWishlistItem>
    const updated: MockWishlistItem = {
      ...mockWishlistItems[index],
      ...body,
      updatedAt: new Date().toISOString(),
    }
    mockWishlistItems[index] = updated

    return HttpResponse.json(updated, { status: 200 })
  }),

  // DELETE /api/wishlist/:id - remove item
  http.delete('/api/wishlist/:id', ({ params }) => {
    const id = String(params.id)
    const index = mockWishlistItems.findIndex(i => i.id === id)
    if (index === -1) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Item not found' }, { status: 404 })
    }

    mockWishlistItems.splice(index, 1)

    return HttpResponse.json({ message: 'Item deleted' }, { status: 200 })
  }),

  // POST /api/wishlist/:id/purchased - mark item as purchased
  http.post('/api/wishlist/:id/purchased', async ({ params, request }) => {
    const id = String(params.id)
    const index = mockWishlistItems.findIndex(i => i.id === id)
    if (index === -1) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Item not found' }, { status: 404 })
    }

    const body = (await request.json()) as {
      purchasePrice: number
      purchaseTax?: number
      purchaseShipping?: number
      quantity: number
      purchaseDate: string
      keepOnWishlist?: boolean
    }

    const keepOnWishlist = !!body.keepOnWishlist
    const newSetId = `set-from-${id}`

    if (!keepOnWishlist) {
      mockWishlistItems.splice(index, 1)
    }

    return HttpResponse.json(
      {
        message: 'Item marked as purchased',
        newSetId,
        removedFromWishlist: !keepOnWishlist,
      },
      { status: 200 },
    )
  }),

  // ---------------------------------------------------------------------------
  // Instructions uploader finalize endpoint (E2E scenarios via query flags)
  // ---------------------------------------------------------------------------

  http.post('/api/mocs/uploads/finalize', async ({ request }) => {
    const url = new URL(request.url)
    const scenario = url.searchParams.get('__uploaderScenario') || 'success'

    if (scenario === 'conflict') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'CONFLICT',
            message: 'A MOC with this title already exists',
            details: {
              title: 'Conflict Test',
              suggestedSlug: 'my-awesome-moc-2',
            },
          },
        },
        { status: 409 },
      )
    }

    if (scenario === 'rateLimit') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'RATE_LIMIT',
            message: 'Too many requests',
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        },
      )
    }

    if (scenario === 'fileValidation') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'FILE_VALIDATION_ERROR',
            message: 'File validation failed',
            details: {
              files: [
                {
                  fileId: 'file-1',
                  filename: 'test.exe',
                  reason: 'type',
                  message: 'File type not allowed',
                },
              ],
            },
          },
        },
        { status: 400 },
      )
    }

    // Default success
    const body = (await request.json()) as { uploadSessionId: string; title: string }
    return HttpResponse.json(
      {
        data: {
          id: 'moc-123',
          title: body.title,
          slug: body.title.toLowerCase().replace(/\s+/g, '-'),
          description: null,
          status: 'PUBLISHED',
          pdfKey: 'pdf/123',
          imageKeys: [],
          partsKeys: [],
          tags: [],
          theme: null,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    )
  }),
]
