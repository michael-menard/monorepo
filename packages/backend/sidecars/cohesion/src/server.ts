/**
 * HTTP Server for Cohesion Sidecar
 * WINT-4010: Create Cohesion Sidecar
 *
 * Starts a Node.js http server on PORT (default: 3092).
 * Uses Node.js built-in http module — no Hono or Express.
 *
 * Sidecar Port Registry:
 *   3090 — role-pack       (WINT-2010)
 *   3091 — context-pack    (WINT-2020)
 *   3092 — cohesion        (WINT-4010)
 *   3093 — rules-registry  (WINT-4020)
 *
 * AC-2: node:http createServer, PORT from process.env.PORT ?? '3092'
 */

import { createServer } from 'node:http'
import { logger } from '@repo/logger'
import { handleCohesionAuditRequest, handleCohesionCheckRequest } from './routes/cohesion.js'

const PORT = parseInt(process.env.PORT ?? '3092', 10)

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const method = req.method?.toUpperCase() ?? 'GET'
  const path = url.pathname

  if (method === 'POST' && path === '/cohesion/audit') {
    handleCohesionAuditRequest(req, res).catch(error => {
      logger.warn('[cohesion] Unhandled error in audit handler', {
        error: error instanceof Error ? error.message : String(error),
      })
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'Internal server error' }))
      }
    })
    return
  }

  if (method === 'POST' && path === '/cohesion/check') {
    handleCohesionCheckRequest(req, res).catch(error => {
      logger.warn('[cohesion] Unhandled error in check handler', {
        error: error instanceof Error ? error.message : String(error),
      })
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'Internal server error' }))
      }
    })
    return
  }

  // AC-5: Method not allowed
  if (method !== 'POST' && (path === '/cohesion/audit' || path === '/cohesion/check')) {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }))
    return
  }

  // AC-5: Not found
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: false, error: 'Not found' }))
})

server.listen(PORT, () => {
  logger.info(`[cohesion] Server listening on port ${PORT}`)
})

export { server }
