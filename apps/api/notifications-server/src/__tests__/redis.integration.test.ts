/**
 * Redis integration tests — require a running Redis instance.
 * Set REDIS_URL env var or default redis://localhost:6379 is used.
 * Skip these in CI environments without Redis by setting SKIP_REDIS_TESTS=1.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import Redis from 'ioredis'
import { logger } from '@repo/logger'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { initRedis, persistEvent, replayEvents, isRedisConnected, shutdownRedis } from '../stub'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const SKIP = process.env.SKIP_REDIS_TESTS === '1'

async function redisAvailable(): Promise<boolean> {
  const client = new Redis(REDIS_URL, { lazyConnect: true, connectTimeout: 1000 })
  try {
    await client.connect()
    await client.quit()
    return true
  } catch {
    return false
  }
}

describe.skipIf(SKIP)('Redis integration', () => {
  let client: Redis
  let io: Server

  beforeAll(async () => {
    const available = await redisAvailable()
    if (!available) {
      console.warn('Redis not available — skipping integration tests')
      return
    }

    client = new Redis(REDIS_URL)
    const httpServer = createServer()
    io = new Server(httpServer)
    await initRedis(io)
  })

  afterAll(async () => {
    await shutdownRedis()
    if (client) await client.quit()
    io?.close()
  })

  beforeEach(async () => {
    // Clean up test keys before each test
    const keys = await client.keys('notifications:channel:test-*')
    if (keys.length > 0) {
      await client.del(...keys)
    }
  })

  it('connects to Redis successfully', () => {
    expect(isRedisConnected()).toBe(true)
  })

  it('persists events to Redis list (LPUSH + LTRIM)', async () => {
    const channel = 'test-integration'
    const data = { msg: 'hello', value: 42 }

    await persistEvent(channel, data)

    const listKey = `notifications:channel:${channel}:events`
    const items = await client.lrange(listKey, 0, -1)
    expect(items).toHaveLength(1)

    const stored = JSON.parse(items[0])
    expect(stored.data).toEqual(data)
    expect(stored.timestamp).toBeDefined()
  })

  it('caps the list at EVENT_REPLAY_LIMIT (100)', async () => {
    const channel = 'test-cap'
    // Push 105 events
    for (let i = 0; i < 105; i++) {
      await persistEvent(channel, { index: i })
    }

    const listKey = `notifications:channel:${channel}:events`
    const count = await client.llen(listKey)
    expect(count).toBe(100)
  })

  it('replays last N events to a socket on subscribe', async () => {
    const channel = 'test-replay'
    const events = [{ a: 1 }, { a: 2 }, { a: 3 }]
    for (const data of events) {
      await persistEvent(channel, data)
    }

    const replayed: any[] = []
    const mockSocket = {
      to: (id: string) => ({
        emit: (_event: string, payload: any) => {
          replayed.push(payload)
        },
      }),
    } as unknown as Server

    await replayEvents(mockSocket, 'fake-socket-id', [channel])

    expect(replayed).toHaveLength(1)
    expect(replayed[0].channel).toBe(channel)
    expect(replayed[0].events).toHaveLength(3)
    // Most-recent event is at index 0 (LPUSH = prepend)
    expect(replayed[0].events[0].data).toEqual({ a: 3 })
  })

  it('publishes events to Redis pub/sub channel', async () => {
    const channel = 'test-pubsub'
    const received: any[] = []

    const sub = new Redis(REDIS_URL)
    await sub.psubscribe('notifications:channel:*')
    sub.on('pmessage', (_pattern, _ch, message) => {
      received.push(JSON.parse(message))
    })

    await persistEvent(channel, { test: 'fanout' })

    // Wait briefly for pub/sub delivery
    await new Promise(r => setTimeout(r, 100))

    await sub.punsubscribe('notifications:channel:*')
    await sub.quit()

    expect(received.length).toBeGreaterThanOrEqual(1)
    expect(received[0].data).toEqual({ test: 'fanout' })
  })

  it('gracefully degrades when Redis is unavailable (logs warning, does not throw)', async () => {
    await shutdownRedis()
    expect(isRedisConnected()).toBe(false)

    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

    await expect(persistEvent('test-degraded', { x: 1 })).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalledWith('Redis unavailable — event not persisted')

    warnSpy.mockRestore()

    // Re-init for other tests
    await initRedis(io)
  })
})
