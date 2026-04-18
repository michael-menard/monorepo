import { Server } from 'socket.io'
import { persistEvent } from './stub'

export default function setupEventPublisher(io: Server) {
  io.on('connection', socket => {
    socket.on('publish', async ({ channel, data }: { channel: string; data: any }) => {
      // Persist event to Redis
      await persistEvent(channel, data)
      // Emit event to all subscribers via Redis pub/sub (simulated here via Socket.IO)
      io.to(channel).emit('event', { channel, data, timestamp: new Date().toISOString() })
    })
  })
}
