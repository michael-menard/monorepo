import { Hono } from 'hono'
import { logger } from '@repo/logger'
import { graphRoutes } from './routes/graphs.js'

const app = new Hono()
const PORT = Number(process.env.PORT ?? 9104)

app.route('/api/v1', graphRoutes)
app.get('/health', c => c.json({ status: 'ok' }))

logger.info(`Starting workflow service on port ${PORT}`)

export default { port: PORT, fetch: app.fetch }
