/**
 * HTTP Server for Cohesion Sidecar
 * WINT-4010: Create Cohesion Sidecar
 *
 * Starts a Node.js http server on PORT (default: 3092).
 * Uses Node.js built-in http module — no Hono or Express.
 *
 * Port allocation:
 *   - role-pack:     3090
 *   - context-pack:  3091
 *   - cohesion:      3092
 *
 * The db dependency is initialized at startup and injected into request handlers.
 * In production, this sidecar runs alongside the KB service within the VPC.
 */

import { createServer } from 'node:http'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { computeAudit } from './compute-audit.js'
import { computeCheck } from './compute-check.js'
import { handleCohesionRequest } from './routes/cohesion.js'
import type { CohesionAuditDeps, CohesionCheckDeps } from './routes/cohesion.js'
import type { DrizzleDb } from './compute-audit.js'

const PORT = parseInt(process.env.PORT ?? '3092', 10)

// Initialize deps with real db and compute functions.
// Cast to DrizzleDb: the real Drizzle NodePgDatabase satisfies our minimal structural type
// (DrizzleDb requires only select(), which NodePgDatabase provides). The cast is safe because
// we only use the select().from().innerJoin().where() chain in compute-audit/compute-check.
const deps: CohesionAuditDeps & CohesionCheckDeps = {
  db: db as unknown as DrizzleDb,
  computeAudit,
  computeCheck,
}

const server = createServer((req, res) => {
  handleCohesionRequest(req, res, deps).catch(error => {
    logger.warn('[cohesion] Unhandled error in request handler', {
      error: error instanceof Error ? error.message : String(error),
    })
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'Internal server error' }))
    }
  })
})

server.listen(PORT, () => {
  logger.info(`[cohesion] Server listening on port ${PORT}`)
})

export { server }
