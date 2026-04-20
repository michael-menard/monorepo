import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CircuitBreaker } from '../circuit-breaker.js'

// Mock Redis
function createMockRedis() {
  const store = new Map<string, string>()
  return {
    set: vi.fn(async (key: string, value: string, _ex?: string, _ttl?: number) => {
      store.set(key, value)
      return 'OK'
    }),
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    del: vi.fn(async (key: string) => {
      store.delete(key)
      return 1
    }),
    _store: store,
  }
}

// Mock Queue
function createMockQueue(name: string) {
  return {
    name,
    pause: vi.fn(async () => {}),
    resume: vi.fn(async () => {}),
  }
}

describe('CircuitBreaker', () => {
  let redis: ReturnType<typeof createMockRedis>
  let cb: CircuitBreaker

  beforeEach(() => {
    vi.useFakeTimers()
    redis = createMockRedis()
    cb = new CircuitBreaker(redis as any)
  })

  it('starts with closed state for all queues', async () => {
    const state = await cb.getState('scrape:bricklink-minifig')
    expect(state.isOpen).toBe(false)
    expect(state.trippedAt).toBeNull()
    expect(state.resumesAt).toBeNull()
    expect(state.reason).toBeNull()
  })

  it('trips the circuit breaker and pauses the queue', async () => {
    const queue = createMockQueue('scrape:bricklink-minifig')

    await cb.trip(queue as any, 'Rate limited on cas002', 30 * 60 * 1000)

    expect(queue.pause).toHaveBeenCalledOnce()
    expect(redis.set).toHaveBeenCalledOnce()

    const state = await cb.getState('scrape:bricklink-minifig')
    expect(state.isOpen).toBe(true)
    expect(state.reason).toBe('Rate limited on cas002')
    expect(state.trippedAt).toBeTruthy()
    expect(state.resumesAt).toBeTruthy()
  })

  it('resumes the queue after cooldown', async () => {
    const queue = createMockQueue('scrape:bricklink-minifig')

    await cb.trip(queue as any, 'Rate limited', 5000) // 5 second cooldown

    expect(queue.pause).toHaveBeenCalledOnce()

    // Advance time past cooldown
    await vi.advanceTimersByTimeAsync(6000)

    expect(queue.resume).toHaveBeenCalledOnce()
  })

  it('resets the circuit breaker manually', async () => {
    const queue = createMockQueue('scrape:bricklink-minifig')

    await cb.trip(queue as any, 'Rate limited', 30 * 60 * 1000)
    await cb.reset(queue as any)

    expect(queue.resume).toHaveBeenCalledOnce()
    expect(redis.del).toHaveBeenCalledWith('circuit-breaker:scrape:bricklink-minifig')

    const state = await cb.getState('scrape:bricklink-minifig')
    expect(state.isOpen).toBe(false)
  })

  it('returns all states for multiple queues', async () => {
    const queue1 = createMockQueue('scrape:bricklink-minifig')
    const queue2 = createMockQueue('scrape:lego-set')

    await cb.trip(queue1 as any, 'Rate limited', 30 * 60 * 1000)

    const states = await cb.getAllStates([
      'scrape:bricklink-minifig',
      'scrape:lego-set',
    ])

    expect(states).toHaveLength(2)
    expect(states[0].isOpen).toBe(true)
    expect(states[1].isOpen).toBe(false)
  })

  it('replaces existing timer when tripped again', async () => {
    const queue = createMockQueue('scrape:bricklink-minifig')

    await cb.trip(queue as any, 'First trip', 10000)
    await cb.trip(queue as any, 'Second trip', 5000)

    expect(queue.pause).toHaveBeenCalledTimes(2)

    const state = await cb.getState('scrape:bricklink-minifig')
    expect(state.reason).toBe('Second trip')
  })

  it('cleans up timers on destroy', async () => {
    const queue = createMockQueue('scrape:bricklink-minifig')

    await cb.trip(queue as any, 'Rate limited', 30 * 60 * 1000)
    cb.destroy()

    // Advance time — resume should NOT be called since timer was cleared
    await vi.advanceTimersByTimeAsync(31 * 60 * 1000)
    expect(queue.resume).not.toHaveBeenCalled()
  })
})
