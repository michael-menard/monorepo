import Redis from 'ioredis'
import { Server } from 'socket.io'
import { logger } from '@repo/logger'
import { env } from './env'
import * as eventBuffer from './eventBuffer'

const EVENT_REPLAY_LIMIT = 100
const REDIS_KEY_PREFIX = 'notifications:channel:'

let pub: Redis | null = null
let sub: Redis | null = null
let connected = false

export async function initRedis(io: Server): Promise<void> {
  const url = env.REDIS_URL || 'redis://localhost:6379'

  pub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 })
  sub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 })

  pub.on('error', err => logger.error('Redis pub client error', { err: err.message }))
  sub.on('error', err => logger.error('Redis sub client error', { err: err.message }))

  try {
    await pub.connect()
    await sub.connect()
    connected = true
    logger.info('Redis connected', { url })
  } catch (err) {
    connected = false
    logger.warn('Redis connection failed — running without persistence', {
      err: err instanceof Error ? err.message : String(err),
    })
    return
  }

  // Subscribe to all notification channels for fan-out to local Socket.IO clients
  await sub.psubscribe(`${REDIS_KEY_PREFIX}*`)
  sub.on('pmessage', (_pattern, redisChannel, message) => {
    try {
      const parsed = JSON.parse(message)
      // Extract the logical channel name from the Redis channel key
      // Format: notifications:channel:<channel>:pubsub
      const match = redisChannel.match(/^notifications:channel:(.+):pubsub$/)
      if (!match) return

      const channel = match[1]
      eventBuffer.addEvent(channel, parsed.data)
      io.to(channel).emit('notification', parsed)
    } catch (err) {
      logger.error('Failed to process Redis pub/sub message', {
        err: err instanceof Error ? err.message : String(err),
      })
    }
  })
}

export async function persistEvent(channel: string, data: unknown): Promise<void> {
  if (!connected || !pub) {
    logger.warn('Redis unavailable — event not persisted')
    return
  }

  const event = {
    data,
    timestamp: new Date().toISOString(),
  }

  const listKey = `${REDIS_KEY_PREFIX}${channel}:events`
  const pubsubKey = `${REDIS_KEY_PREFIX}${channel}:pubsub`
  const serialized = JSON.stringify(event)

  try {
    await pub.lpush(listKey, serialized)
    await pub.ltrim(listKey, 0, EVENT_REPLAY_LIMIT - 1)
    await pub.publish(pubsubKey, serialized)
  } catch (err) {
    logger.error('Failed to persist event to Redis', {
      channel,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function replayEvents(
  io: Server,
  socketId: string,
  channels: string[],
): Promise<void> {
  if (!connected || !pub) {
    logger.warn('Redis unavailable — cannot replay events')
    return
  }

  for (const channel of channels) {
    const listKey = `${REDIS_KEY_PREFIX}${channel}:events`

    try {
      const items = await pub.lrange(listKey, 0, EVENT_REPLAY_LIMIT - 1)
      const events = items.map(item => JSON.parse(item))

      io.to(socketId).emit('replay', { channel, events })
    } catch (err) {
      logger.error('Failed to replay events from Redis', {
        channel,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

export function isRedisConnected(): boolean {
  return connected
}

export async function shutdownRedis(): Promise<void> {
  connected = false
  if (sub) {
    await sub.punsubscribe()
    await sub.quit()
    sub = null
  }
  if (pub) {
    await pub.quit()
    pub = null
  }
  logger.info('Redis connections closed')
}
