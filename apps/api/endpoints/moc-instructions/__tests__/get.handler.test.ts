import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../get/handler'
import { createMockEvent, createUnauthorizedEvent } from './fixtures/mock-events'
import { createDbMock } from './helpers/mock-db'

let currentDb: any
vi.mock('@/core/database/client', () => {
  const dbDelegator = new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        return (...args: any[]) => (currentDb as any)[prop](...args)
      },
    },
  )
  return { db: dbDelegator }
})

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://signed.example.com/mock-presigned') as any,
}))

vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    send = vi.fn(async () => ({}))
  }
  class GetObjectCommand {
    constructor(public input: any) {}
  }
  return { S3Client, GetObjectCommand }
})

vi.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: vi.fn(() => ({
      verify: vi.fn(async (token: string) => {
        // Mock verification - extract userId from token pattern
        if (token.startsWith('mock-jwt-token-')) {
          return { sub: token.replace('mock-jwt-token-', '') }
        }
        throw new Error('Invalid token')
      }),
    })),
  },
}))

// Valid UUIDs for testing
const PUBLISHED_MOC_ID = 'a1b2c3d4-e5f6-7890-abcd-111111111111'
const DRAFT_MOC_ID = 'a1b2c3d4-e5f6-7890-abcd-222222222222'
const FILE_ID = 'a1b2c3d4-e5f6-7890-abcd-333333333333'

const mockPublishedMoc = {
  id: PUBLISHED_MOC_ID,
  userId: 'user-123',
  title: 'Published Castle',
  description: 'A published castle',
  slug: 'published-castle',
  tags: ['castle'],
  theme: 'Castle',
  status: 'published',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  publishedAt: new Date('2024-01-01'),
}

const mockDraftMoc = {
  id: DRAFT_MOC_ID,
  userId: 'user-123',
  title: 'Draft Castle',
  description: 'A draft castle',
  slug: null,
  tags: ['castle'],
  theme: 'Castle',
  status: 'draft',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  publishedAt: null,
}

const mockFile = {
  id: FILE_ID,
  mocId: PUBLISHED_MOC_ID,
  fileType: 'instruction',
  fileUrl: `https://test-bucket.s3.us-east-1.amazonaws.com/mocs/${PUBLISHED_MOC_ID}/instructions.pdf`,
  originalFilename: 'instructions.pdf',
  mimeType: 'application/pdf',
  createdAt: new Date('2024-01-01'),
  deletedAt: null,
}

describe('get MOC detail handler', () => {
  const path = `/api/mocs/${PUBLISHED_MOC_ID}`

  beforeEach(() => {
    process.env.LEGO_API_BUCKET_NAME = 'test-bucket'
    process.env.AWS_REGION = 'us-east-1'
    process.env.COGNITO_USER_POOL_ID = 'us-east-1_test'
    process.env.COGNITO_CLIENT_ID = 'test-client-id'
    currentDb = createDbMock({})
  })

  describe('anonymous access', () => {
    it('returns 200 with CDN URLs for published MOC', async () => {
      currentDb = createDbMock({
        moc: [mockPublishedMoc],
        mocFile: [mockFile],
      })
      const event = createUnauthorizedEvent({
        method: 'GET',
        path,
        pathParameters: { mocId: PUBLISHED_MOC_ID },
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.data.success).toBe(true)
      expect(body.data.data.isOwner).toBe(false)
      expect(body.data.data.files[0].url).toContain('test-bucket.s3')
      expect(body.data.data.files[0].url).not.toContain('presigned')
    })

    it('returns 404 for draft MOC', async () => {
      currentDb = createDbMock({
        moc: [mockDraftMoc],
        mocFile: [],
      })
      const event = createUnauthorizedEvent({
        method: 'GET',
        path: `/api/mocs/${DRAFT_MOC_ID}`,
        pathParameters: { mocId: DRAFT_MOC_ID },
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(404)
    })

    it('returns 404 for non-existent MOC', async () => {
      currentDb = createDbMock({ moc: [] })
      const event = createUnauthorizedEvent({
        method: 'GET',
        path: '/api/mocs/a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        pathParameters: { mocId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(404)
    })
  })

  describe('owner access', () => {
    it('returns 200 with presigned URLs and isOwner: true for published MOC', async () => {
      currentDb = createDbMock({
        moc: [mockPublishedMoc],
        mocFile: [mockFile],
      })
      const event = createMockEvent({
        method: 'GET',
        path,
        pathParameters: { mocId: PUBLISHED_MOC_ID },
        userId: 'user-123',
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.data.success).toBe(true)
      expect(body.data.data.isOwner).toBe(true)
      expect(body.data.data.files[0].url).toContain('presigned')
    })

    it('returns 200 with presigned URLs and isOwner: true for draft MOC', async () => {
      currentDb = createDbMock({
        moc: [mockDraftMoc],
        mocFile: [],
      })
      const event = createMockEvent({
        method: 'GET',
        path: `/api/mocs/${DRAFT_MOC_ID}`,
        pathParameters: { mocId: DRAFT_MOC_ID },
        userId: 'user-123',
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.data.success).toBe(true)
      expect(body.data.data.isOwner).toBe(true)
      expect(body.data.data.status).toBe('draft')
    })
  })

  describe('non-owner authenticated access', () => {
    it('returns 200 with CDN URLs and isOwner: false for published MOC', async () => {
      currentDb = createDbMock({
        moc: [mockPublishedMoc],
        mocFile: [mockFile],
      })
      const event = createMockEvent({
        method: 'GET',
        path,
        pathParameters: { mocId: PUBLISHED_MOC_ID },
        userId: 'user-other',
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.data.success).toBe(true)
      expect(body.data.data.isOwner).toBe(false)
      expect(body.data.data.files[0].url).toContain('test-bucket.s3')
      expect(body.data.data.files[0].url).not.toContain('presigned')
    })

    it('returns 404 (not 403) for draft MOC to prevent existence leak', async () => {
      currentDb = createDbMock({
        moc: [mockDraftMoc],
        mocFile: [],
      })
      const event = createMockEvent({
        method: 'GET',
        path: `/api/mocs/${DRAFT_MOC_ID}`,
        pathParameters: { mocId: DRAFT_MOC_ID },
        userId: 'user-other',
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(404)
    })
  })

  describe('validation', () => {
    it('returns 404 for invalid UUID format', async () => {
      const event = createMockEvent({
        method: 'GET',
        path: '/api/mocs/invalid-id',
        pathParameters: { mocId: 'invalid-id' },
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(404)
    })

    it('returns 404 when mocId is missing', async () => {
      const event = createMockEvent({
        method: 'GET',
        path: '/api/mocs/',
        pathParameters: {},
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(404)
    })
  })

  describe('response structure', () => {
    it('includes all required fields in response', async () => {
      currentDb = createDbMock({
        moc: [mockPublishedMoc],
        mocFile: [mockFile],
      })
      const event = createMockEvent({
        method: 'GET',
        path,
        pathParameters: { mocId: PUBLISHED_MOC_ID },
        userId: 'user-123',
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
      expect(data).toHaveProperty('createdAt')
      expect(data).toHaveProperty('updatedAt')
      expect(data).toHaveProperty('publishedAt')
      expect(data).toHaveProperty('files')
      expect(data).toHaveProperty('isOwner')
    })

    it('includes file metadata in response', async () => {
      currentDb = createDbMock({
        moc: [mockPublishedMoc],
        mocFile: [mockFile],
      })
      const event = createMockEvent({
        method: 'GET',
        path,
        pathParameters: { mocId: PUBLISHED_MOC_ID },
        userId: 'user-123',
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      const file = body.data.data.files[0]

      expect(file).toHaveProperty('id')
      expect(file).toHaveProperty('category')
      expect(file).toHaveProperty('filename')
      expect(file).toHaveProperty('mimeType')
      expect(file).toHaveProperty('url')
      expect(file).toHaveProperty('uploadedAt')
    })
  })
})
