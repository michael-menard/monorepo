/**
 * MCP Server Entry Point
 *
 * Main entry point for the Knowledge Base MCP server process.
 * Bootstraps the server with all required dependencies.
 *
 * @see KNOW-0051 for MCP server requirements
 *
 * Usage:
 *   node dist/mcp-server/index.js
 *
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string (required)
 *   OPENAI_API_KEY - OpenAI API key for embeddings (required)
 *   SHUTDOWN_TIMEOUT_MS - Graceful shutdown timeout (default: 30000)
 *   LOG_LEVEL - Log level: debug, info, warn, error (default: info)
 *   DB_POOL_SIZE - Database connection pool size (default: 5)
 */

import { getDbClient, closeDbClient, testConnection } from '../db/client.js'
import { createEmbeddingClient } from '../embedding-client/index.js'
import { createMcpLogger } from './logger.js'
import {
  createMcpServer,
  validateEnvironment,
  setupShutdownHandlers,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
} from './server.js'

const logger = createMcpLogger('main')

/**
 * Verify database connectivity at startup.
 *
 * @throws Error if database connection fails
 */
async function verifyDatabaseConnectivity(): Promise<void> {
  logger.info('Verifying database connectivity')

  const result = await testConnection()

  if (!result.success) {
    logger.error('Database connectivity check failed', { error: result.error })
    throw new Error(`Database connectivity check failed: ${result.error}`)
  }

  logger.info('Database connectivity verified')
}

/**
 * Verify OpenAI API connectivity at startup.
 *
 * Note: This is a simple health check - we just verify the client can be created
 * with valid credentials. We don't make an actual API call to avoid cost.
 *
 * @throws Error if embedding client initialization fails
 */
function verifyOpenAIConnectivity(): void {
  logger.info('Verifying OpenAI API configuration')

  // createEmbeddingClient will throw if OPENAI_API_KEY is missing
  createEmbeddingClient()

  logger.info('OpenAI API configuration verified')
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  logger.info('Starting Knowledge Base MCP Server', {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    node_version: process.version,
    pid: process.pid,
  })

  // Step 1: Validate environment variables
  const env = validateEnvironment()

  // Step 2: Verify connectivity
  await verifyDatabaseConnectivity()
  verifyOpenAIConnectivity()

  // Step 3: Initialize dependencies
  logger.info('Initializing dependencies')

  const db = getDbClient()
  const embeddingClient = createEmbeddingClient()

  // Step 4: Create MCP server
  const mcpServer = createMcpServer({ db, embeddingClient })

  // Step 5: Setup shutdown handlers
  const cleanup = async (): Promise<void> => {
    logger.info('Closing database connections')
    await closeDbClient()
  }

  setupShutdownHandlers(mcpServer, cleanup, env.SHUTDOWN_TIMEOUT_MS)

  // Step 6: Start server
  await mcpServer.start()

  logger.info('Knowledge Base MCP Server ready', {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    tools: ['kb_add', 'kb_get', 'kb_update', 'kb_delete', 'kb_list'],
  })
}

/**
 * Handle fatal errors during startup.
 */
function handleFatalError(error: unknown): void {
  logger.error('Fatal error during startup', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })

  process.exit(1)
}

// Run main
main().catch(handleFatalError)
