import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { rateLimit } from './middleware/rate-limit.js'
import health from './domains/health/routes.js'
import gallery from './domains/gallery/routes.js'
import sets from './domains/sets/routes.js'
import wishlist from './domains/wishlist/routes.js'
import instructions from './domains/instructions/routes.js'
import partsLists from './domains/parts-lists/routes.js'
import config, { adminConfig } from './domains/config/routes.js'
const app = new Hono()
// Global middleware
app.use('*', logger())
app.use('*', cors())
app.use('*', rateLimit) // WISH-2008 AC24: Rate limiting for brute-force protection
// Mount domain routes
app.route('/health', health)
app.route('/gallery', gallery)
app.route('/sets', sets)
app.route('/wishlist', wishlist)
app.route('/instructions', instructions)
app.route('/parts-lists', partsLists)
app.route('/config', config)
app.route('/admin', adminConfig)
// Root endpoint
app.get('/', c => {
  return c.json({
    name: 'lego-api',
    version: '1.0.0',
    status: 'running',
  })
})
// 404 handler
app.notFound(c => {
  return c.json({ error: 'Not found' }, 404)
})
// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})
// Export for Bun
export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch,
}
// Log startup
console.log(`🚀 lego-api running on http://localhost:${process.env.PORT || 3001}`)
