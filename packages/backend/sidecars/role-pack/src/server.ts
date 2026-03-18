/**
 * Role Pack Sidecar HTTP Server
 * WINT-2010: Create Role Pack Sidecar Service
 *
 * Starts a lightweight Node.js HTTP server on PORT (default: 3090).
 * Run: node dist/server.js
 */

import { createServer } from 'http'
import { logger } from '@repo/logger'
import { handleRolePackRequest } from './http-handler.js'

const PORT = parseInt(process.env['PORT'] ?? '3090', 10)

const server = createServer((req, res) => {
  handleRolePackRequest(req, res).catch(err => {
    logger.warn('[sidecar-role-pack] Unhandled request error', {
      error: err instanceof Error ? err.message : String(err),
    })
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  })
})

server.listen(PORT, () => {
  logger.info('[sidecar-role-pack] Server started', { port: PORT })
})

export { server }
