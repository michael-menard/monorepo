import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://localhost:3001'

export const handlers = [
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
