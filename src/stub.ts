import { Hono } from 'hono'
import { Server } from 'socket.io'
import { createServer } from 'http'

// Basic server scaffold with Hono and Socket.io
export const createApp = () => {
  const app = new Hono()
  const httpServer = createServer(app.fetch)
  const io = new Server(httpServer)

  // Basic health check route
  app.get('/', c => {
    return c.text('Server is running')
  })

  // Basic socket connection handler
  io.on('connection', socket => {
    console.log('Client connected')
    socket.on('disconnect', () => {
      console.log('Client disconnected')
    })
  })

  return { app, httpServer, io }
}

export const startServer = (port: number = 3000) => {
  const { httpServer } = createApp()
  httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`)
  })
}
