/**
 * HTTP Server for Context Pack Sidecar
 * WINT-2020: Create Context Pack Sidecar
 *
 * Starts a Node.js http server on PORT (default: 3091).
 * Uses Node.js built-in http module — no Hono or Express.
 *
 * The KB search function is injected at startup via environment-based initialization.
 * In production, this sidecar runs alongside the KB service and uses its db + embeddingClient.
 * For local dev, it degrades gracefully when KB DB is unavailable (returns empty sections).
 */

import { createServer } from 'node:http'
import { logger } from '@repo/logger'
import { handleContextPackRequest } from './routes/context-pack.js'
import type { AssembleContextPackDeps, KbSearchResult } from './assemble-context-pack.js'

const PORT = parseInt(process.env.PORT ?? '3091', 10)

/**
 * Create a no-op KB search function for graceful degradation.
 * Returns empty results when KB is unavailable.
 */
function createNoOpKbSearch(): AssembleContextPackDeps['kbSearch'] {
  return async (_input): Promise<KbSearchResult> => {
    return { results: [], metadata: { total: 0, fallback_mode: true } }
  }
}

/**
 * Initialize KB search deps from environment.
 * Falls back to no-op when KB is unavailable.
 */
async function initKbSearchDeps(): Promise<AssembleContextPackDeps> {
  try {
    // Dynamically import kb_search from the knowledge-base package at runtime
    // This avoids a hard compile-time dependency on apps/api/knowledge-base
    const kbSearchModule = await import(
      /* @vite-ignore */
      process.env.KB_SEARCH_MODULE ?? '@repo/kb-search'
    ).catch(() => null)

    if (kbSearchModule?.kb_search) {
      logger.info('[context-pack] KB search module loaded')
      return { kbSearch: kbSearchModule.kb_search }
    }
  } catch {
    // ignore
  }

  logger.warn('[context-pack] KB search unavailable, using no-op fallback')
  return { kbSearch: createNoOpKbSearch() }
}

let deps: AssembleContextPackDeps | null = null

const server = createServer((req, res) => {
  const resolvedDeps = deps ?? { kbSearch: createNoOpKbSearch() }

  handleContextPackRequest(req, res, resolvedDeps).catch(error => {
    logger.warn('[context-pack] Unhandled error in request handler', {
      error: error instanceof Error ? error.message : String(error),
    })
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'Internal server error' }))
    }
  })
})

// Initialize deps asynchronously, start listening after
initKbSearchDeps().then(resolvedDeps => {
  deps = resolvedDeps

  server.listen(PORT, () => {
    logger.info(`[context-pack] Server listening on port ${PORT}`)
  })
})

export { server }
