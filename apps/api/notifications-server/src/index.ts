import 'dotenv/config'
import { createServer } from 'node:http'
import { serve } from '@hono/node-server'
import { Server as SocketIOServer } from 'socket.io'
import { logger } from '@repo/logger'
import { createApp } from './app'
import { env } from './env'

const app = createApp()

const httpServer = createServer()

serve({
  fetch: app.fetch,
  createServer: () => httpServer,
  port: env.NOTIFICATIONS_PORT,
})

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

io.on('connection', socket => {
  logger.info('Socket.io client connected', { socketId: socket.id })

  socket.on('disconnect', reason => {
    logger.info('Socket.io client disconnected', { socketId: socket.id, reason })
  })
})

logger.info(`Notifications server starting on port ${env.NOTIFICATIONS_PORT}`)

export { app, io }
