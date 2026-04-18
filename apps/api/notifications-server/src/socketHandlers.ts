import { Server } from 'socket.io'
import { logger } from '@repo/logger'
import { initRedis, persistEvent, replayEvents, shutdownRedis, isRedisConnected } from './stub'
import * as channelManager from './channelManager'

export default function setupSocketHandlers(io: Server) {
  // Initialize Redis with io instance for pub/sub
  initRedis(io).catch(err => {
    logger.error('Failed to initialize Redis', { err })
  })

  io.on('connection', socket => {
    logger.info('A user connected')

    socket.on('subscribe', async ({ channels }: { channels: string[] }) => {
      channels.forEach(channel => {
        channelManager.subscribe(socket, channel)
        socket.join(channel)
      })
      // Replay last N events from Redis on subscribe
      await replayEvents(io, socket.id, channels)
    })

    socket.on('unsubscribe', ({ channels }: { channels: string[] }) => {
      channels.forEach(channel => {
        channelManager.unsubscribe(socket, channel)
        socket.leave(channel)
      })
    })

    socket.on('event', async ({ channel, data }: { channel: string; data: any }) => {
      // Persist event to Redis
      await persistEvent(channel, data)
      // Note: The event will be broadcasted via Redis pub/sub, which will trigger the subscriber
      // to add to local event buffer and emit to local clients.
      // So we don't need to call io.emit here.
    })

    socket.on('disconnect', () => {
      logger.info('User disconnected')
      channelManager.disconnect(socket)
    })
  })
}

export { initRedis, persistEvent, shutdownRedis, isRedisConnected }
