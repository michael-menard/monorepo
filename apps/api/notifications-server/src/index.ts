import 'dotenv/config'
import { createServer } from 'node:http'
import { serve } from '@hono/node-server'
import { Server as SocketIOServer } from 'socket.io'
import { logger } from '@repo/logger'
import { createApp } from './app'
import { env } from './env'

const io = new SocketIOServer({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

const app = createApp(io)

const httpServer = createServer()

serve({
  fetch: app.fetch,
  createServer: () => httpServer,
  port: env.NOTIFICATIONS_PORT,
})

io.attach(httpServer)

io.on('connection', socket => {
  logger.info('Socket.io client connected', { socketId: socket.id })

  socket.on('join', (channel: string) => {
    socket.join(channel)
    logger.info('Socket joined channel', { socketId: socket.id, channel })
  })

  socket.on('disconnect', reason => {
    logger.info('Socket.io client disconnected', { socketId: socket.id, reason })
  })
})

logger.info(`Notifications server starting on port ${env.NOTIFICATIONS_PORT}`)

export { app, io }
