/**
 * HTTP Server for Role Pack Sidecar
 * WINT-2010: Create Role Pack Sidecar Service
 *
 * Starts a Node.js http server on PORT (default: 3090).
 * Uses Node.js built-in http module — no Hono or Express.
 */

import { createServer } from 'node:http'
import { logger } from '@repo/logger'
import { handleRolePackRequest } from './http-handler.js'

const PORT = parseInt(process.env.PORT ?? '3090', 10)

const server = createServer((req, res) => {
  handleRolePackRequest(req, res).catch(error => {
    logger.warn('[sidecar-role-pack] Unhandled error in request handler', {
      error: error instanceof Error ? error.message : String(error),
    })
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'Internal server error' }))
    }
  })
})

server.listen(PORT, () => {
  logger.info(`[sidecar-role-pack] Server listening on port ${PORT}`)
})

export { server }
