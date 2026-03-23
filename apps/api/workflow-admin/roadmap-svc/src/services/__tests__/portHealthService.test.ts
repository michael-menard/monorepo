import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRegistry = {
  MAIN_APP_PORT: 8000,
  LEGO_API_PORT: 9100,
  ROADMAP_SVC_PORT: 9103,
}

vi.mock('module', () => ({
  createRequire: () => () => ({
    getRegistry: () => mockRegistry,
  }),
}))

const { getPortHealth } = await import('../portHealthService')

describe('portHealthService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns correct shape with all services', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 }),
    )

    const result = await getPortHealth()

    expect(result.services).toHaveLength(3)
    expect(result.summary.total).toBe(3)
    expect(result.checkedAt).toBeTruthy()
    expect(result.summary.healthy).toBe(3)
  })

  it('classifies frontend and backend ports correctly', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 }),
    )

    const result = await getPortHealth()

    const mainApp = result.services.find(s => s.key === 'MAIN_APP_PORT')
    const legoApi = result.services.find(s => s.key === 'LEGO_API_PORT')

    expect(mainApp?.kind).toBe('frontend')
    expect(legoApi?.kind).toBe('backend')
  })

  it('derives human-readable names', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 }),
    )

    const result = await getPortHealth()

    const mainApp = result.services.find(s => s.key === 'MAIN_APP_PORT')
    expect(mainApp?.name).toBe('Main App')
  })

  it('marks unhealthy services for non-200 responses', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('error', { status: 500 }),
    )

    const result = await getPortHealth()

    expect(result.services.every(s => s.status === 'unhealthy')).toBe(true)
    expect(result.summary.unhealthy).toBe(3)
  })

  it('handles connection refused errors', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(
      new Error('fetch failed'),
    )

    const result = await getPortHealth()

    expect(result.services.every(s => s.status === 'unhealthy')).toBe(true)
    expect(result.services[0].error).toBe('fetch failed')
  })

  it('handles timeout errors as unknown', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(
      new Error('The operation was aborted due to timeout'),
    )

    const result = await getPortHealth()

    expect(result.services.every(s => s.status === 'unknown')).toBe(true)
    expect(result.services[0].error).toBe('Timeout (3s)')
  })
})
