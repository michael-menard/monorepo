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

  // Module-specific mock endpoints
  http.get(`${API_BASE_URL}/api/v2/app-inspiration-gallery/data`, () => {
    return HttpResponse.json({
      data: {
        message: 'Mock data for App Inspiration Gallery module',
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
