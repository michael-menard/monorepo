/**
 * HTTP Server for HiTL Interview Sidecar
 * WINT-5010: Create HiTL Interview Sidecar
 *
 * AC-1: Starts on PORT ?? '3094'
 *
 * Sidecar Port Registry:
 *   3090 — role-pack       (WINT-2010)
 *   3091 — context-pack    (WINT-2020)
 *   3092 — cohesion        (WINT-4010)
 *   3093 — rules-registry  (WINT-4020)
 *   3094 — hitl-interview  (WINT-5010)
 */

import { createServer } from 'node:http'
import { logger } from '@repo/logger'
import { handleHitlInterviewRequest } from './http-handler.js'

const PORT = parseInt(process.env['PORT'] ?? '3094', 10)

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const method = req.method?.toUpperCase() ?? 'GET'
  const path = url.pathname

  if (method === 'POST' && path === '/hitl-interview') {
    handleHitlInterviewRequest(req, res).catch(error => {
      logger.warn('[hitl-interview] Unhandled error in handler', {
        error: error instanceof Error ? error.message : String(error),
      })
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'Internal server error' }))
      }
    })
    return
  }

  if (method !== 'POST' && path === '/hitl-interview') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }))
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: false, error: 'Not found' }))
})

server.listen(PORT, () => {
  logger.info('[hitl-interview] Server started', { port: PORT })
})

export { server }
