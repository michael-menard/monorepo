import { HttpResponse, http } from 'msw'

// Define handlers that correspond to your API endpoints
export const handlers = [
  // Example handler - replace with your actual API endpoints
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' })
  }),

  // Add more handlers as needed for your API endpoints
] 