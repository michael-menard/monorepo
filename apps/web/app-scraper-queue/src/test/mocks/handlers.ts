import { http, HttpResponse } from 'msw'

const baseUrl = 'http://localhost:3001'

const mockJobs = [
  {
    id: 'job-1',
    type: 'bricklink-minifig',
    status: 'completed',
    data: { itemNumber: 'cas002', itemType: 'M', wishlist: false },
    attemptsMade: 1,
    failedReason: null,
    createdAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    parentJobId: null,
  },
  {
    id: 'job-2',
    type: 'bricklink-minifig',
    status: 'waiting',
    data: { itemNumber: 'sw0001', itemType: 'M', wishlist: false },
    attemptsMade: 0,
    failedReason: null,
    createdAt: new Date().toISOString(),
    finishedAt: null,
    parentJobId: null,
  },
  {
    id: 'job-3',
    type: 'lego-set',
    status: 'failed',
    data: { url: 'https://www.lego.com/en-us/product/test-42115', wishlist: false },
    attemptsMade: 3,
    failedReason: 'Scrape failed: timeout',
    createdAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    parentJobId: null,
  },
]

const mockQueues = [
  { name: 'bricklink-minifig', waiting: 2, active: 1, completed: 10, failed: 0, delayed: 0, isPaused: false, circuitBreaker: { isOpen: false, trippedAt: null, resumesAt: null, reason: null } },
  { name: 'bricklink-catalog', waiting: 0, active: 0, completed: 3, failed: 0, delayed: 0, isPaused: false, circuitBreaker: { isOpen: false, trippedAt: null, resumesAt: null, reason: null } },
  { name: 'bricklink-prices', waiting: 5, active: 0, completed: 8, failed: 1, delayed: 3, isPaused: false, circuitBreaker: { isOpen: true, trippedAt: '2026-04-20T10:00:00Z', resumesAt: '2026-04-20T10:30:00Z', reason: 'Rate limited on cas002' } },
  { name: 'lego-set', waiting: 0, active: 0, completed: 5, failed: 0, delayed: 0, isPaused: false, circuitBreaker: { isOpen: false, trippedAt: null, resumesAt: null, reason: null } },
  { name: 'rebrickable-set', waiting: 0, active: 0, completed: 2, failed: 0, delayed: 0, isPaused: false, circuitBreaker: { isOpen: false, trippedAt: null, resumesAt: null, reason: null } },
  { name: 'rebrickable-mocs', waiting: 0, active: 0, completed: 1, failed: 0, delayed: 0, isPaused: false, circuitBreaker: { isOpen: false, trippedAt: null, resumesAt: null, reason: null } },
  { name: 'rebrickable-moc-single', waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, isPaused: false, circuitBreaker: { isOpen: false, trippedAt: null, resumesAt: null, reason: null } },
]

export const handlers = [
  http.get(`${baseUrl}/scraper/jobs`, () => {
    return HttpResponse.json({ jobs: mockJobs })
  }),

  http.post(`${baseUrl}/scraper/jobs`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      {
        id: `job-${Date.now()}`,
        type: 'bricklink-minifig',
        status: 'waiting',
        data: { itemNumber: body.url, itemType: 'M', wishlist: body.wishlist ?? false },
      },
      { status: 201 },
    )
  }),

  http.delete(`${baseUrl}/scraper/jobs/:id`, () => {
    return HttpResponse.json({ success: true })
  }),

  http.post(`${baseUrl}/scraper/jobs/:id/retry`, () => {
    return HttpResponse.json({ success: true, status: 'waiting' })
  }),

  http.get(`${baseUrl}/scraper/queues`, () => {
    return HttpResponse.json({ queues: mockQueues })
  }),
]
