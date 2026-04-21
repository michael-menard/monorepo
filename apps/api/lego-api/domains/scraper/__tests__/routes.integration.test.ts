/**
 * Scraper API Route Integration Tests
 *
 * Requires:
 * - Redis running at localhost:6379
 * - lego-api running at localhost:9100
 *
 * Tests the full request/response cycle for scraper queue endpoints.
 */

import { describe, it, expect, afterAll } from 'vitest'
import Redis from 'ioredis'

const API_BASE = process.env.LEGO_API_URL || 'http://localhost:9100'
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
}

let redis: Redis

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

// Track job IDs for cleanup
const createdJobIds: string[] = []

afterAll(async () => {
  // Clean up any test jobs
  for (const id of createdJobIds) {
    await api(`/scraper/jobs/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  // Clean up test queue keys
  redis = new Redis(redisConnection)
  const keys = await redis.keys('bull:scrape:*')
  // Don't delete all keys — just clean completed/failed test jobs
  await redis.quit()
})

describe('POST /scraper/jobs', () => {
  it('adds a bricklink minifig job from bare item number', async () => {
    const { status, body } = await api('/scraper/jobs', {
      method: 'POST',
      body: JSON.stringify({ url: 'cas002' }),
    })

    expect(status).toBe(201)
    expect(body.type).toBe('bricklink-minifig')
    expect(body.status).toBe('waiting')
    expect(body.data.itemNumber).toBe('cas002')
    expect(body.data.itemType).toBe('M')
    expect(body.id).toBeTruthy()

    createdJobIds.push(body.id)
  })

  it('auto-detects CMF set from col-prefix', async () => {
    const { status, body } = await api('/scraper/jobs', {
      method: 'POST',
      body: JSON.stringify({ url: 'col25-1' }),
    })

    expect(status).toBe(201)
    expect(body.type).toBe('bricklink-minifig')
    expect(body.data.itemType).toBe('S')

    createdJobIds.push(body.id)
  })

  it('auto-detects bricklink catalog URL', async () => {
    const { status, body } = await api('/scraper/jobs', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://www.bricklink.com/catalogList.asp?catType=S&catString=746.753',
      }),
    })

    expect(status).toBe(201)
    expect(body.type).toBe('bricklink-catalog')

    createdJobIds.push(body.id)
  })

  it('auto-detects LEGO.com URL', async () => {
    const { status, body } = await api('/scraper/jobs', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://www.lego.com/en-us/product/lamborghini-42115',
      }),
    })

    expect(status).toBe(201)
    expect(body.type).toBe('lego-set')

    createdJobIds.push(body.id)
  })

  it('auto-detects rebrickable set URL', async () => {
    const { status, body } = await api('/scraper/jobs', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://rebrickable.com/sets/76919-1/mclaren/',
      }),
    })

    expect(status).toBe(201)
    expect(body.type).toBe('rebrickable-set')

    createdJobIds.push(body.id)
  })

  it('accepts explicit type override', async () => {
    const { status, body } = await api('/scraper/jobs', {
      method: 'POST',
      body: JSON.stringify({
        url: 'cas002',
        type: 'bricklink-prices',
      }),
    })

    expect(status).toBe(201)
    expect(body.type).toBe('bricklink-prices')

    createdJobIds.push(body.id)
  })

  it('sets wishlist flag', async () => {
    const { status, body } = await api('/scraper/jobs', {
      method: 'POST',
      body: JSON.stringify({ url: 'cas002', wishlist: true }),
    })

    expect(status).toBe(201)
    expect(body.data.wishlist).toBe(true)

    createdJobIds.push(body.id)
  })

  it('rejects empty URL', async () => {
    const { status, body } = await api('/scraper/jobs', {
      method: 'POST',
      body: JSON.stringify({ url: '' }),
    })

    expect(status).toBe(400)
    expect(body.error).toBe('VALIDATION_ERROR')
  })

  it('rejects unrecognized URL without explicit type', async () => {
    const { status, body } = await api('/scraper/jobs', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://www.google.com' }),
    })

    expect(status).toBe(400)
    expect(body.error).toBe('UNKNOWN_TYPE')
  })
})

describe('GET /scraper/jobs', () => {
  it('returns job list', async () => {
    const { status, body } = await api('/scraper/jobs')

    expect(status).toBe(200)
    expect(body.jobs).toBeDefined()
    expect(Array.isArray(body.jobs)).toBe(true)
  })

  it('filters by status', async () => {
    const { status, body } = await api('/scraper/jobs?status=waiting')

    expect(status).toBe(200)
    for (const job of body.jobs) {
      expect(job.status).toBe('waiting')
    }
  })

  it('filters by type', async () => {
    const { status, body } = await api('/scraper/jobs?type=bricklink-minifig')

    expect(status).toBe(200)
    for (const job of body.jobs) {
      expect(job.type).toBe('bricklink-minifig')
    }
  })
})

describe('GET /scraper/jobs/:id', () => {
  it('returns a specific job', async () => {
    // First create a job
    const { body: created } = await api('/scraper/jobs', {
      method: 'POST',
      body: JSON.stringify({ url: 'sw0001' }),
    })
    createdJobIds.push(created.id)

    const { status, body } = await api(`/scraper/jobs/${created.id}`)

    expect(status).toBe(200)
    expect(body.id).toBe(created.id)
    expect(body.type).toBe('bricklink-minifig')
    expect(body.data.itemNumber).toBe('sw0001')
  })

  it('returns 404 for non-existent job', async () => {
    const { status } = await api('/scraper/jobs/non-existent-id-12345')
    expect(status).toBe(404)
  })
})

describe('DELETE /scraper/jobs/:id', () => {
  it('removes a waiting job', async () => {
    const { body: created } = await api('/scraper/jobs', {
      method: 'POST',
      body: JSON.stringify({ url: 'cty9999' }),
    })

    const { status, body } = await api(`/scraper/jobs/${created.id}`, { method: 'DELETE' })
    expect(status).toBe(200)
    expect(body.success).toBe(true)

    // Verify it's gone
    const { status: getStatus } = await api(`/scraper/jobs/${created.id}`)
    expect(getStatus).toBe(404)
  })

  it('returns 404 for non-existent job', async () => {
    const { status } = await api('/scraper/jobs/non-existent-id-12345', { method: 'DELETE' })
    expect(status).toBe(404)
  })
})

describe('GET /scraper/queues', () => {
  it('returns health for all 7 queues', async () => {
    const { status, body } = await api('/scraper/queues')

    expect(status).toBe(200)
    expect(body.queues).toBeDefined()
    expect(body.queues.length).toBe(7)

    for (const queue of body.queues) {
      expect(queue.name).toBeTruthy()
      expect(typeof queue.waiting).toBe('number')
      expect(typeof queue.active).toBe('number')
      expect(typeof queue.completed).toBe('number')
      expect(typeof queue.failed).toBe('number')
      expect(typeof queue.delayed).toBe('number')
      expect(typeof queue.isPaused).toBe('boolean')
      expect(queue.circuitBreaker).toBeDefined()
      expect(typeof queue.circuitBreaker.isOpen).toBe('boolean')
    }
  })

  it('includes expected queue names', async () => {
    const { body } = await api('/scraper/queues')
    const names = body.queues.map((q: any) => q.name)

    expect(names).toContain('bricklink-minifig')
    expect(names).toContain('bricklink-catalog')
    expect(names).toContain('bricklink-prices')
    expect(names).toContain('lego-set')
    expect(names).toContain('rebrickable-set')
    expect(names).toContain('rebrickable-mocs')
    expect(names).toContain('rebrickable-moc-single')
  })
})
