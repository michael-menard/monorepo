import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StepTracker } from '../utils/step-tracker.js'

// Mock fetch for notification server
const mockFetch = vi.fn().mockResolvedValue({ ok: true })
vi.stubGlobal('fetch', mockFetch)

// Mock DB insert
const mockInsert = vi.fn().mockReturnValue({
  values: vi.fn().mockResolvedValue(undefined),
})

const mockDb = {
  insert: mockInsert,
} as any

const baseOpts = {
  jobId: 'job-123',
  scrapeRunId: 'run-uuid',
  mocNumber: '232659',
  scraperType: 'rebrickable-moc-single',
  notificationsUrl: 'http://localhost:3098',
  hmacSecret: '',
  db: mockDb,
}

describe('StepTracker', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockInsert.mockClear()
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('emits step_plan event with correct structure', async () => {
    const tracker = new StepTracker(baseOpts)
    const steps = [
      { id: 'browser_launch', label: 'Launch browser' },
      { id: 'scrape_detail', label: 'Scrape metadata' },
    ]

    await tracker.plan(steps)

    // Check notification POST
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3098/events')
    const body = JSON.parse(opts.body)
    expect(body.channel).toBe('scraper-queue')
    expect(body.type).toBe('step_plan')
    expect(body.data.jobId).toBe('job-123')
    expect(body.data.scraperType).toBe('rebrickable-moc-single')
    expect(body.data.steps).toEqual(steps)
    expect(body.data.seq).toBe(0)

    // Check DB insert
    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('emits start and complete events with incrementing seq', async () => {
    const tracker = new StepTracker(baseOpts)
    await tracker.plan([{ id: 'step1', label: 'Step 1' }])

    mockFetch.mockClear()
    await tracker.start('step1')

    let body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.type).toBe('step_progress')
    expect(body.data.step).toBe('step1')
    expect(body.data.status).toBe('running')
    expect(body.data.seq).toBe(1)

    mockFetch.mockClear()
    await tracker.complete('step1', { title: 'Test MOC' })

    body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.data.status).toBe('completed')
    expect(body.data.detail).toEqual({ title: 'Test MOC' })
    expect(body.data.seq).toBe(2)
  })

  it('emits skip events', async () => {
    const tracker = new StepTracker(baseOpts)
    await tracker.plan([{ id: 'upload', label: 'Upload' }])

    mockFetch.mockClear()
    await tracker.skip('upload')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.data.status).toBe('skipped')
  })

  it('emits fail events with error and warning severity', async () => {
    const tracker = new StepTracker(baseOpts)
    await tracker.plan([{ id: 'download', label: 'Download' }])

    mockFetch.mockClear()
    await tracker.fail('download', 'Connection refused')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.data.status).toBe('failed')
    expect(body.data.error).toBe('Connection refused')
    expect(body.severity).toBe('warning')
  })

  it('continues gracefully when notification fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

    const tracker = new StepTracker(baseOpts)
    // Should not throw
    await tracker.plan([{ id: 'step1', label: 'Step 1' }])
  })

  it('continues gracefully when DB insert fails', async () => {
    mockInsert.mockReturnValue({
      values: vi.fn().mockRejectedValue(new Error('DB connection lost')),
    })

    const tracker = new StepTracker(baseOpts)
    // Should not throw
    await tracker.plan([{ id: 'step1', label: 'Step 1' }])
  })

  it('works without jobId (CLI mode)', async () => {
    const tracker = new StepTracker({ ...baseOpts, jobId: undefined })
    await tracker.plan([{ id: 'step1', label: 'Step 1' }])

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.data.jobId).toBeNull()
  })

  it('includes elapsed time in step_progress events', async () => {
    const tracker = new StepTracker(baseOpts)
    await tracker.plan([{ id: 'step1', label: 'Step 1' }])

    mockFetch.mockClear()
    await tracker.start('step1')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(typeof body.data.elapsed).toBe('number')
    expect(body.data.elapsed).toBeGreaterThanOrEqual(0)
  })

  it('signs requests when HMAC secret is provided', async () => {
    const tracker = new StepTracker({ ...baseOpts, hmacSecret: 'test-secret' })
    await tracker.plan([{ id: 'step1', label: 'Step 1' }])

    const [_url, opts] = mockFetch.mock.calls[0]
    expect(opts.headers['X-Signature']).toBeTruthy()
    expect(opts.headers['X-Signature'].length).toBeGreaterThan(0)
  })
})
