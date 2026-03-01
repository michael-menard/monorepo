/**
 * Drain Integration Test
 *
 * Tests the full drain sequence with a real HTTP health server.
 * Verifies:
 * - GET /health returns healthy before drain
 * - GET /health returns draining during drain
 * - GET /live returns 200
 * - GET /health returns 503 when status is unhealthy
 *
 * Run conditions: requires Node.js process only (no Redis needed for this level).
 * For full BullMQ+Redis drain test, use a live Redis instance.
 *
 * APIP-2030: AC-10
 */

import { describe, it, expect, afterEach } from 'vitest'
import * as http from 'node:http'
import { HealthServer } from '../../health/server.js'
import type { HealthContext } from '../../health/__types__/index.js'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function httpGet(port: number, path: string): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${port}${path}`, res => {
      let data = ''
      res.on('data', chunk => {
        data += chunk
      })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode ?? 0, body: data })
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(2000, () => {
      req.destroy(new Error('HTTP request timed out'))
    })
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests — each uses a unique port to avoid conflicts when run in parallel
// ─────────────────────────────────────────────────────────────────────────────

describe('Drain Integration', () => {
  const servers: HealthServer[] = []

  afterEach(async () => {
    await Promise.all(
      servers.map(s =>
        s.stop().catch(() => {
          // ignore stop errors in teardown
        }),
      ),
    )
    servers.length = 0
  })

  it('HP-3: GET /health returns 200 with healthy status when running normally', async () => {
    const PORT = 19_091
    const startTimeMs = Date.now() - 1000
    const server = new HealthServer(PORT, () => ({
      draining: false,
      activeJobs: 0,
      circuitBreakerState: { elaboration: 'CLOSED' as const, storyCreation: 'CLOSED' as const },
      startTimeMs,
    }))
    servers.push(server)
    await server.start()

    const res = await httpGet(PORT, '/health')

    expect(res.status).toBe(200)
    const body = res.body as Record<string, unknown>
    expect(body.status).toBe('healthy')
    expect(body.draining).toBe(false)
    expect(body.activeJobs).toBe(0)
    expect(typeof body.uptimeMs).toBe('number')
    expect(body.uptimeMs).toBeGreaterThanOrEqual(0)
  })

  it('HP-4: GET /health returns 200 with draining status during drain mode', async () => {
    const PORT = 19_092
    const startTimeMs = Date.now() - 1000
    let state: HealthContext = {
      draining: false,
      activeJobs: 1,
      circuitBreakerState: { elaboration: 'CLOSED', storyCreation: 'CLOSED' },
      startTimeMs,
    }

    const server = new HealthServer(PORT, () => state)
    servers.push(server)
    await server.start()

    // Simulate entering drain mode
    state = { ...state, draining: true }

    const res = await httpGet(PORT, '/health')

    expect(res.status).toBe(200)
    const body = res.body as Record<string, unknown>
    expect(body.status).toBe('draining')
    expect(body.draining).toBe(true)
    expect(body.activeJobs).toBe(1)
  })

  it('HP-5: GET /live returns 200 always', async () => {
    const PORT = 19_093
    const startTimeMs = Date.now()
    const server = new HealthServer(PORT, () => ({
      draining: false,
      activeJobs: 0,
      circuitBreakerState: { elaboration: 'CLOSED' as const, storyCreation: 'CLOSED' as const },
      startTimeMs,
    }))
    servers.push(server)
    await server.start()

    const res = await httpGet(PORT, '/live')

    expect(res.status).toBe(200)
    expect((res.body as Record<string, unknown>).status).toBe('ok')
  })

  it('EC-2: GET /health returns 503 when status is unhealthy (Redis unreachable)', async () => {
    const PORT = 19_094
    const startTimeMs = Date.now()
    const server = new HealthServer(PORT, () => ({
      draining: false,
      activeJobs: 0,
      circuitBreakerState: { elaboration: 'CLOSED' as const, storyCreation: 'CLOSED' as const },
      startTimeMs,
      redisReachable: false,
    }))
    servers.push(server)
    await server.start()

    const res = await httpGet(PORT, '/health')

    expect(res.status).toBe(503)
    expect((res.body as Record<string, unknown>).status).toBe('unhealthy')
  })

  it('ED-4: health server still responds during drain before process.exit', async () => {
    const PORT = 19_095
    const startTimeMs = Date.now()
    let draining = false
    const activeJobs = 1

    const server = new HealthServer(PORT, () => ({
      draining,
      activeJobs,
      circuitBreakerState: { elaboration: 'CLOSED' as const, storyCreation: 'CLOSED' as const },
      startTimeMs,
    }))
    servers.push(server)
    await server.start()

    // Confirm initial state
    const initial = await httpGet(PORT, '/health')
    expect(initial.status).toBe(200)
    expect((initial.body as Record<string, unknown>).status).toBe('healthy')

    // Enter drain mode — server still responds
    draining = true
    const duringDrain = await httpGet(PORT, '/health')
    expect(duringDrain.status).toBe(200)
    expect((duringDrain.body as Record<string, unknown>).draining).toBe(true)
    expect((duringDrain.body as Record<string, unknown>).status).toBe('draining')
  })
})
