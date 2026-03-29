import { Hono } from 'hono'
import { streamSSE, type SSEStreamingApi } from 'hono/streaming'
import { getHistory, subscribe, unsubscribe, type LogLine } from '../services/logBufferService'

const app = new Hono()

app.get('/api/v1/ports/:key/logs', async c => {
  const key = c.req.param('key')

  return streamSSE(c, async (stream: SSEStreamingApi) => {
    // Send buffered history as initial burst
    const history = getHistory(key)
    for (const line of history) {
      await stream.writeSSE({
        event: 'log',
        data: JSON.stringify(line),
      })
    }

    // Subscribe to new lines
    const onLine = (line: LogLine) => {
      stream
        .writeSSE({
          event: 'log',
          data: JSON.stringify(line),
        })
        .catch(() => {})
    }

    subscribe(key, onLine)

    // Heartbeat every 30s
    const heartbeat = setInterval(() => {
      stream.writeSSE({ event: 'heartbeat', data: '' }).catch(() => {})
    }, 30_000)

    stream.onAbort(() => {
      unsubscribe(key, onLine)
      clearInterval(heartbeat)
    })

    // Keep the stream open until the client disconnects
    await new Promise<void>(resolve => {
      stream.onAbort(() => resolve())
    })
  })
})

export const portLogRoutes = app
