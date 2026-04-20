import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { scraperEvents } from '../events.js'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('scraperEvents', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({ ok: true, status: 201 })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('emits job_started event', async () => {
    await scraperEvents.jobStarted('job-1', 'bricklink-minifig', { itemNumber: 'cas002' })

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/events')
    const body = JSON.parse(options.body)
    expect(body.channel).toBe('scraper-queue')
    expect(body.type).toBe('job_started')
    expect(body.data.jobId).toBe('job-1')
    expect(body.data.jobType).toBe('bricklink-minifig')
  })

  it('emits job_completed event', async () => {
    await scraperEvents.jobCompleted('job-1', 'lego-set', { setId: 'abc' })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.type).toBe('job_completed')
    expect(body.data.jobType).toBe('lego-set')
  })

  it('emits job_failed event with warning severity', async () => {
    await scraperEvents.jobFailed('job-1', 'bricklink-prices', 'Timeout', 2)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.type).toBe('job_failed')
    expect(body.severity).toBe('warning')
    expect(body.data.error).toBe('Timeout')
    expect(body.data.attempt).toBe(2)
  })

  it('emits circuit_breaker_tripped with critical severity', async () => {
    await scraperEvents.circuitBreakerTripped(
      'scrape-bricklink-prices',
      'Rate limited',
      '2026-04-20T11:00:00Z',
    )

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.type).toBe('circuit_breaker_tripped')
    expect(body.severity).toBe('critical')
    expect(body.data.queueName).toBe('scrape-bricklink-prices')
    expect(body.data.resumesAt).toBe('2026-04-20T11:00:00Z')
  })

  it('emits circuit_breaker_reset event', async () => {
    await scraperEvents.circuitBreakerReset('scrape-bricklink-prices')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.type).toBe('circuit_breaker_reset')
    expect(body.data.queueName).toBe('scrape-bricklink-prices')
  })

  it('emits catalog_expanded event', async () => {
    await scraperEvents.catalogExpanded('job-1', 50, 50)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.type).toBe('catalog_expanded')
    expect(body.data.itemsFound).toBe(50)
    expect(body.data.jobsEnqueued).toBe(50)
  })

  it('does not throw when notifications server is unreachable', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'))

    // Should not throw
    await expect(
      scraperEvents.jobStarted('job-1', 'test', {}),
    ).resolves.toBeUndefined()
  })

  it('does not throw on non-200 response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 })

    await expect(
      scraperEvents.jobStarted('job-1', 'test', {}),
    ).resolves.toBeUndefined()
  })
})
