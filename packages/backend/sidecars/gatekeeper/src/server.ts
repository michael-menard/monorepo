/**
 * HTTP Server for Gatekeeper Sidecar
 * WINT-3010: Create Gatekeeper Sidecar
 *
 * Starts a Node.js http server on PORT (default: 3094).
 * Uses Node.js built-in http module — no Hono or Express.
 *
 * Sidecar Port Registry:
 *   3090 — role-pack       (WINT-2010)
 *   3091 — context-pack    (WINT-2020)
 *   3092 — cohesion        (WINT-4010)
 *   3093 — rules-registry  (WINT-4020)
 *   3094 — gatekeeper      (WINT-3010)
 *
 * AC-2: node:http createServer, PORT from process.env.PORT ?? '3094'
 * AC-13: Port comment block lists all 5 sidecar ports
 */

import { createServer } from 'node:http'
import { logger } from '@repo/logger'
import { handleGateCheckRequest } from './routes/gate.js'

const PORT = parseInt(process.env.PORT ?? '3094', 10)

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers?.host ?? 'localhost'}`)
  const method = req.method?.toUpperCase() ?? 'GET'
  const path = url.pathname

  if (method === 'POST' && path === '/gate/check') {
    handleGateCheckRequest(req, res).catch(error => {
      logger.warn('[gatekeeper] Unhandled error in gate check handler', {
        error: error instanceof Error ? error.message : String(error),
      })
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'Internal server error' }))
      }
    })
    return
  }

  // AC-12: Method not allowed for known paths with wrong method
  if (method !== 'POST' && path === '/gate/check') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }))
    return
  }

  // AC-12: Not found for unknown paths
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: false, error: 'Not found' }))
})

server.listen(PORT, () => {
  logger.info(`[gatekeeper] Server listening on port ${PORT}`)
})

export { server }
