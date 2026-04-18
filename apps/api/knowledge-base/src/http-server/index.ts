/**
 * KB HTTP Server Entry Point
 *
 * Bootstraps the KB HTTP server that exposes the MCP StreamableHTTP transport
 * and a /health endpoint, gated by Cognito JWT auth and bound to a specific
 * network interface (intended: Tailscale / loopback — never 0.0.0.0).
 *
 * Usage:
 *   tsx src/http-server/index.ts
 *
 * Environment variables (in addition to those required by the stdio MCP server):
 *   COGNITO_USER_POOL_ID  - Cognito user pool ID (required; via @repo/api-core)
 *   COGNITO_CLIENT_ID     - Cognito app client ID used as JWT audience (required)
 *   COGNITO_REGION        - AWS region for the pool (default: us-east-1)
 *   ALLOWED_COGNITO_SUB   - Comma-separated list of allowed Cognito subs
 *   KB_MCP_HTTP_PORT      - TCP port to listen on (default: 4000)
 *   KB_MCP_HTTP_BIND      - Interface IP to bind to (default: 127.0.0.1).
 *                           Set this to your tailscale0 IP to expose over Tailscale.
 *   AUTH_BYPASS           - (dev only) bypass Cognito, use DEV_USER_ID as sub.
 *                           NODE_ENV=production will refuse to honor this.
 *
 * @see EXKB-04 — bind to Tailscale interface only
 */

import { serve } from '@hono/node-server'
import {
  getDbClient,
  closeDbClient,
  testConnection,
  startHealthCheck,
  stopHealthCheck,
} from '../db/client.js'
import { createEmbeddingClient } from '../embedding-client/index.js'
import { createMcpLogger } from '../mcp-server/logger.js'
import {
  createMcpServerCore,
  validateEnvironment,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
} from '../mcp-server/server.js'
import { createKbHttpApp } from './server.js'

const logger = createMcpLogger('http-main')

const DEFAULT_PORT = 4000
const DEFAULT_BIND = '127.0.0.1'

function requireCognitoEnv(): void {
  const missing: string[] = []
  if (!process.env.COGNITO_USER_POOL_ID) missing.push('COGNITO_USER_POOL_ID')
  if (!process.env.COGNITO_CLIENT_ID) missing.push('COGNITO_CLIENT_ID')
  if (!process.env.ALLOWED_COGNITO_SUB) missing.push('ALLOWED_COGNITO_SUB')

  // AUTH_BYPASS makes the first two optional in dev
  const bypass = process.env.AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production'

  if (missing.length > 0 && !bypass) {
    throw new Error(
      `Missing required environment variables for KB HTTP server: ${missing.join(', ')}. ` +
        'Set AUTH_BYPASS=true (non-production only) to run without Cognito.',
    )
  }

  if (bypass) {
    logger.warn('AUTH_BYPASS enabled — Cognito verification is disabled', {
      dev_user_id: process.env.DEV_USER_ID ?? 'dev-user',
    })
  }
}

async function main(): Promise<void> {
  logger.info('Starting Knowledge Base HTTP Server', {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    node_version: process.version,
    pid: process.pid,
  })

  // Validate the stdio-server env (DATABASE_URL etc.) AND the HTTP-specific env
  const env = validateEnvironment()
  requireCognitoEnv()

  // Connectivity checks
  const connResult = await testConnection()
  if (!connResult.success) {
    throw new Error(`Database connectivity check failed: ${connResult.error}`)
  }
  createEmbeddingClient() // throws on invalid config

  // Build shared deps + MCP core
  const db = getDbClient()
  const embeddingClient = createEmbeddingClient()
  const mcpServer = createMcpServerCore({ db, embeddingClient })

  startHealthCheck()

  const app = createKbHttpApp({ mcpServer })

  const port = Number(process.env.KB_MCP_HTTP_PORT ?? DEFAULT_PORT)
  const hostname = process.env.KB_MCP_HTTP_BIND ?? DEFAULT_BIND

  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid KB_MCP_HTTP_PORT: ${process.env.KB_MCP_HTTP_PORT}`)
  }

  const server = serve(
    {
      fetch: app.fetch,
      port,
      hostname,
    },
    info => {
      logger.info('KB HTTP server listening', {
        bind: `${info.address}:${info.port}`,
        family: info.family,
      })
    },
  )

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info('Shutdown initiated', { signal })
    stopHealthCheck()
    server.close(() => {
      logger.info('HTTP server closed')
    })
    try {
      await mcpServer.close()
    } catch (err) {
      logger.warn('Error closing MCP server', { error: err })
    }
    await closeDbClient()
    process.exit(0)
  }

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })

  logger.info('KB HTTP Server ready', {
    bind: `${hostname}:${port}`,
    shutdown_timeout_ms: env.SHUTDOWN_TIMEOUT_MS,
  })
}

main().catch(error => {
  logger.error('Fatal error during KB HTTP server startup', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })
  process.exit(1)
})
