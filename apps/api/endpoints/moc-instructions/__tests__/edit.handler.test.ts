import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../edit/handler'
import { createMockEvent, createUnauthorizedEvent } from './fixtures/mock-events'

// Valid UUIDs for testing
const OWNER_USER_ID = 'user-123'
const OTHER_USER_ID = 'user-other'
const MOC_ID = 'a1b2c3d4-e5f6-7890-abcd-111111111111'
const OTHER_MOC_ID = 'a1b2c3d4-e5f6-7890-abcd-222222222222'

const mockMoc = {
  id: MOC_ID,
  userId: OWNER_USER_ID,
  title: 'Original Title',
  description: 'Original description',
  slug: 'original-slug',
  tags: ['castle', 'medieval'],
  theme: 'Castle',
  status: 'draft',
  type: 'moc',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  publishedAt: null,
}

const mockOtherMoc = {
  id: OTHER_MOC_ID,
  userId: OWNER_USER_ID,
  title: 'Other MOC',
  slug: 'conflicting-slug',
  status: 'published',
}

// Track mock state for complex scenarios
let mockSelectResults: any[] = []
let mockUpdateResult: any = null
let selectCallCount = 0

vi.mock('@/core/database/client', () => {
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            // Return an object that supports both .limit() and being awaited directly
            const result = mockSelectResults[selectCallCount] ?? []
            selectCallCount++
            return {
              limit: vi.fn(() => Promise.resolve(result)),
              // Make it thenable so it can be awaited directly (for queries without .limit())
              then: (resolve: (v: any) => void) => resolve(result),
            }
          }),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve(mockUpdateResult ? [mockUpdateResult] : [])),
          })),
        })),
      })),
    },
  }
})

vi.mock('@/endpoints/moc-instructions/_shared/opensearch-moc', () => ({
  updateMocIndex: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/core/observability/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('PATCH MOC metadata handler', () => {
  const path = `/api/mocs/${MOC_ID}`

  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0
    mockSelectResults = []
    mockUpdateResult = null
  })

  describe('authentication', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const event = createUnauthorizedEvent({
        method: 'PATCH',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { title: 'New Title' },
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(401)

      const body = JSON.parse(res.body)
      expect(body.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('authorization', () => {
    it('returns 403 for non-owner', async () => {
      mockSelectResults = [[mockMoc]] // MOC exists
      mockUpdateResult = null

      const event = createMockEvent({
        method: 'PATCH',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { title: 'New Title' },
        userId: OTHER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(403)

      const body = JSON.parse(res.body)
      expect(body.error.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent MOC', async () => {
      mockSelectResults = [[]] // MOC doesn't exist

      const event = createMockEvent({
        method: 'PATCH',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { title: 'New Title' },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(404)

      const body = JSON.parse(res.body)
      expect(body.error.code).toBe('NOT_FOUND')
    })

    it('returns 404 for invalid UUID format', async () => {
      const event = createMockEvent({
        method: 'PATCH',
        path: '/api/mocs/invalid-id',
        pathParameters: { mocId: 'invalid-id' },
        body: { title: 'New Title' },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(404)
    })
  })

  describe('validation', () => {
    it('returns 400 for empty request body', async () => {
      const event = createMockEvent({
        method: 'PATCH',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {},
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(400)

      const body = JSON.parse(res.body)
      expect(body.error.message).toContain('No fields to update')
    })

    it('returns 400 for title exceeding max length', async () => {
      const event = createMockEvent({
        method: 'PATCH',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { title: 'a'.repeat(101) },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(400)

      const body = JSON.parse(res.body)
      expect(body.error.message).toContain('Title too long')
    })

    it('returns 400 for description exceeding max length', async () => {
      const event = createMockEvent({
        method: 'PATCH',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { description: 'a'.repeat(2001) },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(400)

      const body = JSON.parse(res.body)
      expect(body.error.message).toContain('Description too long')
    })

    it('returns 400 for too many tags', async () => {
      const event = createMockEvent({
        method: 'PATCH',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { tags: Array(11).fill('tag') },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(400)

      const body = JSON.parse(res.body)
      expect(body.error.message).toContain('Maximum 10 tags')
    })

    it('returns 400 for invalid slug format', async () => {
      const event = createMockEvent({
        method: 'PATCH',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { slug: 'Invalid Slug With Spaces' },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(400)

      const body = JSON.parse(res.body)
      expect(body.error.message).toContain('Slug must contain only lowercase')
    })

    it('returns 400 for unknown fields (strict schema)', async () => {
      const event = createMockEvent({
        method: 'PATCH',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { title: 'Valid Title', unknownField: 'value' },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(400)
    })
  })

  describe('slug conflict handling', () => {
    it('returns 409 with suggested slug on conflict', async () => {
      // First select: get existing MOC
      // Second select: check slug uniqueness (finds conflict)
      // Third select: get all user slugs for suggestion
      mockSelectResults = [
        [mockMoc], // MOC exists and owned
        [mockOtherMoc], // Slug conflict found
        [{ slug: 'conflicting-slug' }, { slug: 'conflicting-slug-2' }], // All user slugs
      ]

      const event = createMockEvent({
        method: 'PATCH',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { slug: 'conflicting-slug' },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(409)

      const body = JSON.parse(res.body)
      expect(body.code).toBe('SLUG_CONFLICT')
      expect(body.suggestedSlug).toBe('conflicting-slug-3')
      expect(body.message).toContain('already used')
    })
  })

  describe('successful updates', () => {
    it('returns 200 with updated data for title update', async () => {
      const updatedMoc = {
        ...mockMoc,
        title: 'New Title',
        updatedAt: new Date(),
      }

      mockSelectResults = [
        [mockMoc], // MOC exists and owned
      ]
      mockUpdateResult = updatedMoc

      const event = createMockEvent({
        method: 'PATCH',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { title: 'New Title' },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.data.success).toBe(true)
      expect(body.data.data.title).toBe('New Title')
      expect(body.data.data.id).toBe(MOC_ID)
    })

    it('returns 200 for partial update with multiple fields', async () => {
      const updatedMoc = {
        ...mockMoc,
        title: 'New Title',
        description: 'New description',
        tags: ['new-tag'],
        updatedAt: new Date(),
      }

      mockSelectResults = [[mockMoc]]
      mockUpdateResult = updatedMoc

      const event = createMockEvent({
        method: 'PATCH',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          title: 'New Title',
          description: 'New description',
          tags: ['new-tag'],
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.data.data.title).toBe('New Title')
      expect(body.data.data.description).toBe('New description')
      expect(body.data.data.tags).toEqual(['new-tag'])
    })

    it('allows setting description to null', async () => {
      const updatedMoc = {
        ...mockMoc,
        description: null,
        updatedAt: new Date(),
      }

      mockSelectResults = [[mockMoc]]
      mockUpdateResult = updatedMoc

      const event = createMockEvent({
        method: 'PATCH',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { description: null },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.data.data.description).toBeNull()
    })

    it('allows slug update when no conflict', async () => {
      const updatedMoc = {
        ...mockMoc,
        slug: 'new-unique-slug',
        updatedAt: new Date(),
      }

      mockSelectResults = [
        [mockMoc], // MOC exists
        [], // No slug conflict
      ]
      mockUpdateResult = updatedMoc

      const event = createMockEvent({
        method: 'PATCH',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { slug: 'new-unique-slug' },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.data.data.slug).toBe('new-unique-slug')
    })
  })

  describe('OpenSearch integration', () => {
    it('continues successfully even if OpenSearch update fails', async () => {
      const { updateMocIndex } = await import(
        '@/endpoints/moc-instructions/_shared/opensearch-moc'
      )
      vi.mocked(updateMocIndex).mockRejectedValueOnce(new Error('OpenSearch unavailable'))

      const updatedMoc = {
        ...mockMoc,
        title: 'New Title',
        updatedAt: new Date(),
      }

      mockSelectResults = [[mockMoc]]
      mockUpdateResult = updatedMoc

      const event = createMockEvent({
        method: 'PATCH',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { title: 'New Title' },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      // Should still succeed (fail-open)
      expect(res.statusCode).toBe(200)
    })
  })

  describe('response structure', () => {
    it('includes all required fields in response', async () => {
      const updatedMoc = {
        ...mockMoc,
        title: 'New Title',
        updatedAt: new Date(),
      }

      mockSelectResults = [[mockMoc]]
      mockUpdateResult = updatedMoc

      const event = createMockEvent({
        method: 'PATCH',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { title: 'New Title' },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      const data = body.data.data

      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('title')
      expect(data).toHaveProperty('description')
      expect(data).toHaveProperty('slug')
      expect(data).toHaveProperty('tags')
      expect(data).toHaveProperty('theme')
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('updatedAt')
    })
  })
})
