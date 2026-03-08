/**
 * HTTP Server for Rules Registry Sidecar
 * WINT-4020: Create Rules Registry Sidecar
 *
 * Starts a Node.js http server on PORT (default: 3093).
 * Uses Node.js built-in http module — no Hono or Express.
 *
 * Sidecar Port Registry:
 *   3090 — role-pack       (WINT-2010)
 *   3091 — context-pack    (WINT-2020)
 *   3092 — cohesion        (WINT-4010)
 *   3093 — rules-registry  (WINT-4020)
 *
 * AC-9: Port 3093, process.env.PORT override, port table comment.
 */

import { createServer } from 'node:http'
import { logger } from '@repo/logger'
import { handleRulesRegistryRequest } from './http-handler.js'

const PORT = parseInt(process.env.PORT ?? '3093', 10)

const server = createServer((req, res) => {
  handleRulesRegistryRequest(req, res).catch(error => {
    logger.warn('[sidecar-rules-registry] Unhandled error in request handler', {
      error: error instanceof Error ? error.message : String(error),
    })
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'Internal server error' }))
    }
  })
})

server.listen(PORT, () => {
  logger.info(`[sidecar-rules-registry] Server listening on port ${PORT}`)
})

export { server }
