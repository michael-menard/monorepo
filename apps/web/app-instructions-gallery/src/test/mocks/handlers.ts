import { http, HttpResponse } from 'msw'
import { uploadSessionHandlers } from '../handlers/upload-sessions'

const API_BASE_URL = 'http://localhost:3001'

export const handlers = [
  // INST-1105: Upload session handlers for presigned uploads
  ...uploadSessionHandlers,

  // INST-1101: GET /instructions/mocs/:id - MOC detail endpoint
  // Handles common test scenarios by MOC ID. Integration tests can override
  // specific scenarios using server.use() which prepends to this handler list.
  http.get('*/instructions/mocs/:id', ({ params }) => {
    const { id } = params

    if (id === 'not-found') {
      return HttpResponse.json(
        { error: 'NOT_FOUND', message: 'MOC not found' },
        { status: 404 },
      )
    }

    if (id === 'unauthorized') {
      return HttpResponse.json(
        { error: 'FORBIDDEN', message: 'Access denied' },
        { status: 403 },
      )
    }

    if (id === 'server-error') {
      return HttpResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Internal server error' },
        { status: 500 },
      )
    }

    // Default mock MOC response (used for 'moc-123' and any unknown ID)
    return HttpResponse.json({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      userId: 'user-123',
      title: 'Castle MOC',
      description: 'A detailed medieval castle MOC',
      theme: 'Castle',
      tags: ['castle', 'medieval'],
      thumbnailUrl: 'https://example.com/castle-thumb.jpg',
      createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
      updatedAt: new Date('2025-01-02T00:00:00Z').toISOString(),
      files: [
        {
          id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          mocId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          fileType: 'instruction',
          name: 'castle-instructions.pdf',
          mimeType: 'application/pdf',
          size: 1024000,
          s3Key: 'mocs/user-123/moc-123/instructions/file-1.pdf',
          downloadUrl: 'https://example.com/castle-instructions.pdf',
          uploadedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
        },
        {
          id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          mocId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          fileType: 'parts-list',
          name: 'castle-parts.csv',
          mimeType: 'text/csv',
          size: 51200,
          s3Key: 'mocs/user-123/moc-123/parts-lists/file-2.csv',
          downloadUrl: 'https://example.com/castle-parts.csv',
          uploadedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
        },
        {
          id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          mocId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          fileType: 'gallery-image',
          name: 'castle-gallery-1.jpg',
          mimeType: 'image/jpeg',
          size: 204800,
          s3Key: 'mocs/user-123/moc-123/gallery/file-3.jpg',
          downloadUrl: 'https://example.com/castle-gallery-1.jpg',
          uploadedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
        },
      ],
      stats: {
        pieceCount: 1500,
        fileCount: 3,
      },
    })
  }),

  // Health check endpoint
  http.get(`${API_BASE_URL}/health`, () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'instuctions-gallery',
    })
  }),

  // Module-specific mock endpoints
  http.get(`${API_BASE_URL}/api/v2/instuctions-gallery/data`, () => {
    return HttpResponse.json({
      data: {
        message: 'Mock data for Instuctions Gallery module',
        items: [
          { id: 1, name: 'Sample Item 1' },
          { id: 2, name: 'Sample Item 2' },
        ],
      },
      meta: {
        requestId: `req-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    })
  }),

  /**
   * AC43: MSW handler for thumbnail upload endpoint
   * Story INST-1103: Upload Thumbnail
   */
  http.post(`${API_BASE_URL}/api/v2/mocs/:id/thumbnail`, async ({ request, params }) => {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return HttpResponse.json(
        {
          code: 'MISSING_FILE',
          message: 'No file provided',
        },
        { status: 400 }
      )
    }

    // Simulate successful upload
    const mocId = params.id
    const thumbnailUrl = `https://cdn.example.com/mocs/user-123/moc-${mocId}/thumbnail/test-image.jpg`

    return HttpResponse.json({
      thumbnailUrl,
    })
  }),

  // Error simulation endpoints
  http.get(`${API_BASE_URL}/api/error/500`, () => {
    return HttpResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Simulated server error',
        },
      },
      { status: 500 },
    )
  }),

  http.get(`${API_BASE_URL}/api/error/timeout`, () => {
    return new Promise(() => {
      // Never resolve to simulate timeout
    })
  }),
]
