/**
 * MCP Server Initialization and Lifecycle
 *
 * Creates and configures the MCP server using @modelcontextprotocol/sdk.
 * Handles tool registration, request handling, and graceful shutdown.
 *
 * @see KNOW-0051 AC1, AC6, AC8 for server requirements
 * @see KNOW-0052 for search tools, timeouts, and correlation IDs
 */

import { randomUUID } from 'crypto'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { createMcpLogger } from './logger.js'
import { getToolDefinitions, TOOL_SCHEMA_VERSION } from './tool-schemas.js'
import { handleToolCall, type ToolHandlerDeps } from './tool-handlers.js'
import { normalizeRole, type AgentRole } from './access-control.js'

const logger = createMcpLogger('server')

/**
 * MCP Server version.
 */
export const MCP_SERVER_VERSION = '1.0.0'

/**
 * Server name for MCP discovery.
 */
export const MCP_SERVER_NAME = 'knowledge-base'

/**
 * Default timeout values for tools (in milliseconds).
 * Search tools have longer timeouts to account for OpenAI API latency.
 *
 * @see KNOW-0052 AC6 for timeout configuration
 */
export const DEFAULT_TIMEOUTS = {
  KB_SEARCH: 10000, // 10s - allows for OpenAI API latency
  KB_GET_RELATED: 5000, // 5s - database-only, should be fast
  KB_CRUD: 5000, // 5s - standard CRUD operations
} as const

/**
 * Maximum tool call depth for circular dependency detection.
 *
 * @see KNOW-0052 AC14 for circular dependency detection
 */
export const MAX_TOOL_CALL_DEPTH = 5

/**
 * Environment variable schema.
 */
export const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DB_POOL_SIZE: z.coerce.number().int().positive().max(20).default(5),
  // Search-specific timeouts (KNOW-0052 AC6)
  KB_SEARCH_TIMEOUT_MS: z.coerce.number().int().positive().default(DEFAULT_TIMEOUTS.KB_SEARCH),
  KB_GET_RELATED_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_TIMEOUTS.KB_GET_RELATED),
  // Slow query threshold (KNOW-0052 AC17)
  LOG_SLOW_QUERIES_MS: z.coerce.number().int().positive().default(1000),
  // Agent role for access control (KNOW-009)
  AGENT_ROLE: z.string().optional(),
})

/**
 * Generate a correlation ID for request tracing.
 *
 * @see KNOW-0052 AC7 for correlation ID requirements
 * @returns UUID v4 string
 */
export function generateCorrelationId(): string {
  return randomUUID()
}

/**
 * Tool invocation context for tracking nested calls.
 *
 * @see KNOW-0052 AC8 for tool composition support
 * @see KNOW-009 for agent role authorization
 */
export interface ToolCallContext {
  /** Correlation ID for tracing */
  correlation_id: string
  /** Tool call chain for circular dependency detection */
  tool_call_chain: string[]
  /** Start time for performance measurement */
  start_time: number
  /** Parent elapsed time for nested timeout calculation */
  parent_elapsed_ms?: number
  /** Agent role for access control (KNOW-009) */
  agent_role: AgentRole
}

export type EnvConfig = z.infer<typeof EnvSchema>

/**
 * Get agent role from environment variable.
 *
 * Reads AGENT_ROLE environment variable, validates it, and returns normalized role.
 * If not set or invalid, defaults to 'all' (fail-safe, blocks admin tools).
 *
 * @see KNOW-009 AC3, AC8, AC9 for role handling requirements
 *
 * @returns Validated agent role
 */
export function getAgentRole(): AgentRole {
  const envRole = process.env.AGENT_ROLE

  // Missing role - default to 'all' with warning
  if (!envRole) {
    logger.warn("AGENT_ROLE not set, defaulting to 'all' role")
    return 'all'
  }

  // Normalize and validate role
  const normalized = normalizeRole(envRole)

  // Invalid role - default to 'all' with error log
  if (!normalized) {
    logger.error('Invalid AGENT_ROLE, defaulting to all', {
      provided: envRole,
      valid_values: ['pm', 'dev', 'qa', 'all'],
    })
    return 'all'
  }

  logger.info('Agent role configured', { role: normalized })
  return normalized
}

/**
 * Validate environment variables at startup.
 *
 * @throws Error if required environment variables are missing
 * @returns Validated environment configuration
 */
export function validateEnvironment(): EnvConfig {
  logger.info('Validating environment variables')

  const result = EnvSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ')

    logger.error('Environment validation failed', { errors })
    throw new Error(`Environment validation failed: ${errors}`)
  }

  logger.info('Environment validation passed', {
    has_database_url: true,
    has_openai_key: true,
    shutdown_timeout_ms: result.data.SHUTDOWN_TIMEOUT_MS,
    log_level: result.data.LOG_LEVEL,
    db_pool_size: result.data.DB_POOL_SIZE,
    kb_search_timeout_ms: result.data.KB_SEARCH_TIMEOUT_MS,
    kb_get_related_timeout_ms: result.data.KB_GET_RELATED_TIMEOUT_MS,
    log_slow_queries_ms: result.data.LOG_SLOW_QUERIES_MS,
  })

  return result.data
}

/**
 * MCP Server instance wrapper.
 */
export interface McpServerInstance {
  server: Server
  transport: StdioServerTransport
  start: () => Promise<void>
  stop: () => Promise<void>
}

/**
 * Create and configure the MCP server.
 *
 * @param deps - Database and embedding client dependencies
 * @param agentRole - Optional agent role override (defaults to getAgentRole())
 * @returns Configured MCP server instance
 */
export function createMcpServer(deps: ToolHandlerDeps, agentRole?: AgentRole): McpServerInstance {
  // Get agent role from environment or use provided override
  const role = agentRole ?? getAgentRole()

  logger.info('Creating MCP server', {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    tool_schema_version: TOOL_SCHEMA_VERSION,
    agent_role: role,
  })

  // Create server instance
  const server = new Server(
    {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('ListToolsRequest received')

    const tools = getToolDefinitions()

    logger.debug('Returning tool definitions', { count: tools.length })

    return { tools }
  })

  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const toolName = request.params.name
    const toolArgs = request.params.arguments

    // Generate correlation ID for request tracing (KNOW-0052 AC7)
    const correlationId = generateCorrelationId()
    const startTime = Date.now()

    logger.debug('CallToolRequest received', {
      tool_name: toolName,
      has_arguments: toolArgs !== undefined,
      correlation_id: correlationId,
    })

    // Create tool call context for tracing and circular dependency detection
    const context: ToolCallContext = {
      correlation_id: correlationId,
      tool_call_chain: [toolName],
      start_time: startTime,
      agent_role: role,
    }

    const result = await handleToolCall(toolName, toolArgs, deps, context)

    const totalTimeMs = Date.now() - startTime

    logger.debug('CallToolRequest completed', {
      tool_name: toolName,
      is_error: result.isError ?? false,
      correlation_id: correlationId,
      total_time_ms: totalTimeMs,
    })

    // Return in MCP CallToolResult format
    return {
      content: result.content,
      isError: result.isError,
    } satisfies CallToolResult
  })

  // Create transport
  const transport = new StdioServerTransport()

  // Start function
  const start = async (): Promise<void> => {
    logger.info('Starting MCP server')

    await server.connect(transport)

    logger.info('MCP server started and listening on stdio')
  }

  // Stop function
  const stop = async (): Promise<void> => {
    logger.info('Stopping MCP server')

    await server.close()

    logger.info('MCP server stopped')
  }

  return {
    server,
    transport,
    start,
    stop,
  }
}

/**
 * Graceful shutdown state.
 */
interface ShutdownState {
  isShuttingDown: boolean
  shutdownPromise: Promise<void> | null
}

const shutdownState: ShutdownState = {
  isShuttingDown: false,
  shutdownPromise: null,
}

/**
 * Setup graceful shutdown handlers.
 *
 * @param mcpServer - MCP server instance to shut down
 * @param cleanup - Optional cleanup function for database connections
 * @param timeoutMs - Shutdown timeout in milliseconds
 */
export function setupShutdownHandlers(
  mcpServer: McpServerInstance,
  cleanup?: () => Promise<void>,
  timeoutMs: number = 30000,
): void {
  const handleShutdown = async (signal: string): Promise<void> => {
    // Prevent multiple shutdown attempts
    if (shutdownState.isShuttingDown) {
      logger.info('Shutdown already in progress', { signal })
      return
    }

    shutdownState.isShuttingDown = true
    logger.info('Graceful shutdown initiated', { signal, timeout_ms: timeoutMs })

    // Create shutdown promise with timeout
    shutdownState.shutdownPromise = new Promise<void>((resolve, reject) => {
      // Set timeout
      const timeoutId = setTimeout(() => {
        logger.warn('Shutdown timeout reached, forcing exit')
        reject(new Error('Shutdown timeout'))
      }, timeoutMs)

      // Perform async cleanup
      const performShutdown = async () => {
        try {
          // Stop MCP server (waits for in-flight requests)
          await mcpServer.stop()

          // Run cleanup (close database connections, etc.)
          if (cleanup) {
            logger.info('Running cleanup')
            await cleanup()
          }

          clearTimeout(timeoutId)
          logger.info('Graceful shutdown completed')
          resolve()
        } catch (error) {
          clearTimeout(timeoutId)
          logger.error('Error during shutdown', { error })
          reject(error)
        }
      }

      performShutdown()
    })

    try {
      await shutdownState.shutdownPromise
      process.exit(0)
    } catch (error) {
      process.exit(1)
    }
  }

  // Handle SIGTERM (Docker, Kubernetes, Claude Code)
  process.on('SIGTERM', () => handleShutdown('SIGTERM'))

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => handleShutdown('SIGINT'))

  // Handle uncaught exceptions
  process.on('uncaughtException', error => {
    logger.error('Uncaught exception', { error })
    handleShutdown('uncaughtException')
  })

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise: String(promise) })
    handleShutdown('unhandledRejection')
  })

  logger.info('Shutdown handlers registered', {
    signals: ['SIGTERM', 'SIGINT'],
    timeout_ms: timeoutMs,
  })
}

/**
 * Check if server is shutting down.
 */
export function isShuttingDown(): boolean {
  return shutdownState.isShuttingDown
}
