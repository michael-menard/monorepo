import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://localhost:3001'

export const handlers = [
  // Health check endpoint
  http.get(`${API_BASE_URL}/health`, () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'app-inspiration-gallery',
    })
  }),

  // Inspirations list endpoint
  http.get(`${API_BASE_URL}/inspiration`, () => {
    return HttpResponse.json({
      items: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          userId: 'user-123',
          title: 'Sample Inspiration 1',
          imageUrl: 'https://example.com/image1.jpg',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          sourceUrl: null,
          description: null,
          tags: ['lego', 'moc'],
          sortOrder: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          userId: 'user-123',
          title: 'Sample Inspiration 2',
          imageUrl: 'https://example.com/image2.jpg',
          thumbnailUrl: 'https://example.com/thumb2.jpg',
          sourceUrl: 'https://example.com/source',
          description: 'A cool MOC idea',
          tags: ['castle'],
          sortOrder: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: {
        total: 2,
        limit: 50,
        offset: 0,
        page: 1,
        totalPages: 1,
        hasMore: false,
      },
    })
  }),

  // Albums list endpoint
  http.get(`${API_BASE_URL}/inspiration/albums`, () => {
    return HttpResponse.json({
      items: [
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          userId: 'user-123',
          title: 'My Album',
          description: 'A collection of ideas',
          coverImageId: null,
          coverImage: null,
          itemCount: 5,
          childAlbumCount: 0,
          tags: ['favorites'],
          sortOrder: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: {
        total: 1,
        limit: 50,
        page: 1,
        totalPages: 1,
      },
    })
  }),

  // Single inspiration endpoint
  http.get(`${API_BASE_URL}/inspiration/:id`, ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      id,
      userId: 'user-123',
      title: 'Sample Inspiration',
      imageUrl: 'https://example.com/image.jpg',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      sourceUrl: null,
      description: null,
      tags: [],
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }),

  // Create inspiration endpoint
  http.post(`${API_BASE_URL}/inspiration`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      {
        id: '123e4567-e89b-12d3-a456-426614174999',
        userId: 'user-123',
        ...body,
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { status: 201 },
    )
  }),

  // Update inspiration endpoint
  http.patch(`${API_BASE_URL}/inspiration/:id`, async ({ params, request }) => {
    const { id } = params
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({
      id,
      userId: 'user-123',
      ...body,
      updatedAt: new Date().toISOString(),
    })
  }),

  // Delete inspiration endpoint
  http.delete(`${API_BASE_URL}/inspiration/:id`, () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // Single album endpoint
  http.get(`${API_BASE_URL}/inspiration/albums/:id`, ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      id,
      userId: 'user-123',
      title: 'Sample Album',
      description: null,
      coverImageId: null,
      coverImage: null,
      itemCount: 0,
      childAlbumCount: 0,
      tags: [],
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }),

  // Create album endpoint
  http.post(`${API_BASE_URL}/inspiration/albums`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      {
        id: '223e4567-e89b-12d3-a456-426614174999',
        userId: 'user-123',
        ...body,
        itemCount: 0,
        childAlbumCount: 0,
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { status: 201 },
    )
  }),

  // Update album endpoint
  http.patch(`${API_BASE_URL}/inspiration/albums/:id`, async ({ params, request }) => {
    const { id } = params
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({
      id,
      userId: 'user-123',
      ...body,
      updatedAt: new Date().toISOString(),
    })
  }),

  // Delete album endpoint
  http.delete(`${API_BASE_URL}/inspiration/albums/:id`, () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // Presigned URL endpoint
  http.post(`${API_BASE_URL}/inspiration/presign`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({
      presignedUrl: `https://s3.example.com/upload?key=${body.fileName}`,
      key: `uploads/${body.fileName}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
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
