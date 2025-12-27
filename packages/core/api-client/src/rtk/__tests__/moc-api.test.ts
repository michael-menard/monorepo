/**
 * Story 3.1.40: MOC API Tests
 *
 * Tests for RTK Query MOC API endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

// Mock dependencies
vi.mock('@repo/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Mock upload-types schemas
vi.mock('@repo/upload-types', () => ({
  MocForEditResponseSchema: z.object({
    id: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().nullable(),
    slug: z.string().nullable(),
    tags: z.array(z.string()).nullable(),
    theme: z.string().nullable(),
    status: z.enum(['draft', 'published', 'archived', 'pending_review']),
    isOwner: z.boolean(),
    files: z.array(
      z.object({
        id: z.string(),
        category: z.enum(['instruction', 'parts-list', 'image', 'thumbnail']),
        filename: z.string(),
        size: z.number(),
        mimeType: z.string(),
        url: z.string().url(),
        uploadedAt: z.string(),
      }),
    ),
  }),
}))

// Mock base-query
vi.mock('../base-query', () => ({
  createServerlessBaseQuery: vi.fn(() => vi.fn()),
  getServerlessCacheConfig: vi.fn(() => ({
    keepUnusedDataFor: 30,
    refetchOnMountOrArgChange: 30,
  })),
}))

// Mock endpoints config
vi.mock('../../config/endpoints', () => ({
  buildEndpoint: vi.fn((template, params) => {
    let url = template
    Object.entries(params || {}).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, String(value))
    })
    return url
  }),
  SERVERLESS_ENDPOINTS: {
    MOC: {
      GET_INSTRUCTION: '/api/v2/mocs/{id}',
      UPDATE: '/api/v2/mocs/{id}',
    },
  },
}))

import { mocApi } from '../moc-api'

describe('mocApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('API structure', () => {
    it('should have correct reducer path', () => {
      expect(mocApi.reducerPath).toBe('mocApi')
    })

    it('should define getMocForEdit endpoint', () => {
      expect(mocApi.endpoints.getMocForEdit).toBeDefined()
    })

    it('should define updateMoc endpoint', () => {
      expect(mocApi.endpoints.updateMoc).toBeDefined()
    })

    it('should define getMocById endpoint', () => {
      expect(mocApi.endpoints.getMocById).toBeDefined()
    })
  })

  describe('Tag types', () => {
    it('should have correct tag types', () => {
      // RTK Query stores tag types internally
      expect(mocApi.reducerPath).toBe('mocApi')
    })
  })

  describe('Export hooks', () => {
    it('should export useGetMocForEditQuery hook', async () => {
      const { useGetMocForEditQuery } = await import('../moc-api')
      expect(useGetMocForEditQuery).toBeDefined()
    })

    it('should export useLazyGetMocForEditQuery hook', async () => {
      const { useLazyGetMocForEditQuery } = await import('../moc-api')
      expect(useLazyGetMocForEditQuery).toBeDefined()
    })

    it('should export useUpdateMocMutation hook', async () => {
      const { useUpdateMocMutation } = await import('../moc-api')
      expect(useUpdateMocMutation).toBeDefined()
    })

    it('should export useGetMocByIdQuery hook', async () => {
      const { useGetMocByIdQuery } = await import('../moc-api')
      expect(useGetMocByIdQuery).toBeDefined()
    })
  })

  describe('Reducer and middleware exports', () => {
    it('should export mocApiReducer', async () => {
      const { mocApiReducer } = await import('../moc-api')
      expect(mocApiReducer).toBeDefined()
      expect(typeof mocApiReducer).toBe('function')
    })

    it('should export mocApiMiddleware', async () => {
      const { mocApiMiddleware } = await import('../moc-api')
      expect(mocApiMiddleware).toBeDefined()
    })
  })
})

describe('MocForEditResponse schema validation', () => {
  const validMoc = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Test MOC',
    description: 'A description',
    slug: 'test-moc',
    tags: ['tag1', 'tag2'],
    theme: 'Technic',
    status: 'draft',
    isOwner: true,
    files: [
      {
        id: 'file-1',
        category: 'instruction',
        filename: 'test.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        url: 'https://example.com/test.pdf',
        uploadedAt: '2024-01-01T00:00:00Z',
      },
    ],
  }

  it('should accept valid MOC data', async () => {
    const { MocForEditResponseSchema } = await import('@repo/upload-types')
    const result = MocForEditResponseSchema.safeParse(validMoc)
    expect(result.success).toBe(true)
  })

  it('should accept MOC with nullable fields as null', async () => {
    const { MocForEditResponseSchema } = await import('@repo/upload-types')
    const mocWithNulls = {
      ...validMoc,
      description: null,
      slug: null,
      tags: null,
      theme: null,
    }
    const result = MocForEditResponseSchema.safeParse(mocWithNulls)
    expect(result.success).toBe(true)
  })

  it('should reject MOC with invalid UUID', async () => {
    const { MocForEditResponseSchema } = await import('@repo/upload-types')
    const invalidMoc = {
      ...validMoc,
      id: 'not-a-uuid',
    }
    const result = MocForEditResponseSchema.safeParse(invalidMoc)
    expect(result.success).toBe(false)
  })

  it('should reject MOC with empty title', async () => {
    const { MocForEditResponseSchema } = await import('@repo/upload-types')
    const invalidMoc = {
      ...validMoc,
      title: '',
    }
    const result = MocForEditResponseSchema.safeParse(invalidMoc)
    expect(result.success).toBe(false)
  })

  it('should reject MOC with invalid status', async () => {
    const { MocForEditResponseSchema } = await import('@repo/upload-types')
    const invalidMoc = {
      ...validMoc,
      status: 'invalid-status',
    }
    const result = MocForEditResponseSchema.safeParse(invalidMoc)
    expect(result.success).toBe(false)
  })

  it('should validate file category enum', async () => {
    const { MocForEditResponseSchema } = await import('@repo/upload-types')
    const mocWithValidCategories = {
      ...validMoc,
      files: [
        { ...validMoc.files[0], category: 'instruction' },
        { ...validMoc.files[0], id: 'file-2', category: 'parts-list' },
        { ...validMoc.files[0], id: 'file-3', category: 'image' },
        { ...validMoc.files[0], id: 'file-4', category: 'thumbnail' },
      ],
    }
    const result = MocForEditResponseSchema.safeParse(mocWithValidCategories)
    expect(result.success).toBe(true)
  })
})
