/**
 * MCP Tool Handler Implementations
 *
 * Thin wrapper functions around KNOW-003 CRUD operations and KNOW-004 search functions.
 * Each handler adds logging, error sanitization, performance measurement, and correlation IDs.
 *
 * @see KNOW-0051 AC3 for tool handler requirements
 * @see KNOW-0052 for search tools, correlation IDs, and timeouts
 * @see KNOW-0053 for admin tools (kb_bulk_import, kb_rebuild_embeddings, kb_stats, kb_health)
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { sql } from 'drizzle-orm'
import {
  kb_add,
  kb_get,
  kb_update,
  kb_delete,
  kb_list,
  KbAddInputSchema,
  KbGetInputSchema,
  KbUpdateInputSchema,
  KbDeleteInputSchema,
  KbListInputSchema,
  type KbAddDeps,
  type KbGetDeps,
  type KbUpdateDeps,
  type KbDeleteDeps,
  type KbListDeps,
} from '../crud-operations/index.js'
import {
  kb_search,
  kb_get_related,
  SearchInputSchema,
  GetRelatedInputSchema,
  type KbSearchDeps,
  type KbGetRelatedDeps,
} from '../search/index.js'
import { knowledgeEntries } from '../db/schema.js'
import { computeContentHash } from '../embedding-client/cache-manager.js'
import { createMcpLogger } from './logger.js'
import { errorToToolResult, type McpToolResult } from './error-handling.js'
import {
  type ToolCallContext,
  MAX_TOOL_CALL_DEPTH,
  DEFAULT_TIMEOUTS,
  EnvSchema,
  MCP_SERVER_VERSION,
} from './server.js'
import {
  KbBulkImportInputSchema,
  KbRebuildEmbeddingsInputSchema,
  KbStatsInputSchema,
  KbHealthInputSchema,
} from './tool-schemas.js'
import { checkAccess, cacheGet, cacheSet, type AgentRole } from './access-control.js'

const logger = createMcpLogger('tool-handlers')

/**
 * Server start time for uptime calculation.
 */
const SERVER_START_TIME = Date.now()

/**
 * Get server uptime in milliseconds.
 */
export function getServerUptimeMs(): number {
  return Date.now() - SERVER_START_TIME
}

/**
 * Get version from package.json (KNOW-039 AC13).
 * Reads from single source of truth instead of hardcoded constant.
 * Falls back to MCP_SERVER_VERSION constant if package.json cannot be read.
 */
export function getPackageVersion(): string {
  try {
    // Get the directory of this module
    const currentDir = path.dirname(fileURLToPath(import.meta.url))
    // Navigate up to package root (from dist/mcp-server/ to package root)
    const packageJsonPath = path.resolve(currentDir, '../../package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    return packageJson.version || MCP_SERVER_VERSION
  } catch {
    // Fall back to constant if package.json cannot be read
    return MCP_SERVER_VERSION
  }
}

/**
 * Get timeout configuration from environment.
 */
function getTimeoutConfig(): {
  kb_search_timeout_ms: number
  kb_get_related_timeout_ms: number
  log_slow_queries_ms: number
} {
  const env = EnvSchema.safeParse(process.env)
  if (env.success) {
    return {
      kb_search_timeout_ms: env.data.KB_SEARCH_TIMEOUT_MS,
      kb_get_related_timeout_ms: env.data.KB_GET_RELATED_TIMEOUT_MS,
      log_slow_queries_ms: env.data.LOG_SLOW_QUERIES_MS,
    }
  }
  return {
    kb_search_timeout_ms: DEFAULT_TIMEOUTS.KB_SEARCH,
    kb_get_related_timeout_ms: DEFAULT_TIMEOUTS.KB_GET_RELATED,
    log_slow_queries_ms: 1000,
  }
}

/**
 * Dependencies for tool handlers.
 * Combines all CRUD operation and search dependencies.
 */
export interface ToolHandlerDeps
  extends KbAddDeps,
    KbGetDeps,
    KbUpdateDeps,
    KbDeleteDeps,
    KbListDeps,
    KbSearchDeps,
    KbGetRelatedDeps {}

/**
 * Timeout error for tool execution.
 */
export class ToolTimeoutError extends Error {
  constructor(
    public toolName: string,
    public timeoutMs: number,
  ) {
    super(`Tool execution exceeded ${timeoutMs}ms timeout`)
    this.name = 'ToolTimeoutError'
  }
}

/**
 * Circular dependency error for tool composition.
 */
export class CircularDependencyError extends Error {
  constructor(
    public toolChain: string[],
    public attemptedTool: string,
  ) {
    super(`Circular dependency detected: ${[...toolChain, attemptedTool].join(' -> ')}`)
    this.name = 'CircularDependencyError'
  }
}

/**
 * Execute a function with timeout.
 *
 * @param fn - Async function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param toolName - Tool name for error message
 * @returns Result of the function
 * @throws ToolTimeoutError if timeout exceeded
 */
async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  toolName: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new ToolTimeoutError(toolName, timeoutMs))
    }, timeoutMs)

    fn()
      .then(result => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch(error => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

/**
 * Check for circular dependency in tool call chain.
 *
 * @param context - Tool call context with chain
 * @param toolName - Tool attempting to call
 * @throws CircularDependencyError if circular dependency detected
 */
function checkCircularDependency(context: ToolCallContext | undefined, toolName: string): void {
  if (!context) return

  // Check max depth
  if (context.tool_call_chain.length >= MAX_TOOL_CALL_DEPTH) {
    throw new CircularDependencyError(context.tool_call_chain, toolName)
  }

  // Check for circular reference
  if (context.tool_call_chain.includes(toolName)) {
    throw new CircularDependencyError(context.tool_call_chain, toolName)
  }
}

/**
 * Handle kb_add tool invocation.
 *
 * Creates a new knowledge entry with automatic embedding generation.
 *
 * @param input - Raw input from MCP request
 * @param deps - Database and embedding client dependencies
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with entry UUID or error
 */
export async function handleKbAdd(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  // Log invocation (sanitize content)
  const inputObj = input as Record<string, unknown>
  logger.info('kb_add tool invoked', {
    correlation_id: correlationId,
    role: inputObj?.role,
    tags: inputObj?.tags,
    content_length: typeof inputObj?.content === 'string' ? inputObj.content.length : 0,
  })

  try {
    // Validate input with Zod schema
    const validationStart = Date.now()
    const validated = KbAddInputSchema.parse(input)
    const protocolOverheadMs = Date.now() - validationStart

    // Call CRUD operation
    const domainLogicStart = Date.now()
    const entryId = await kb_add(validated, deps)
    const domainLogicTimeMs = Date.now() - domainLogicStart

    const totalTimeMs = Date.now() - startTime

    // Log success with performance metrics
    logger.info('kb_add succeeded', {
      correlation_id: correlationId,
      entry_id: entryId,
      total_time_ms: totalTimeMs,
      protocol_overhead_ms: protocolOverheadMs,
      domain_logic_time_ms: domainLogicTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: entryId,
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    // Log failure
    logger.error('kb_add failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_get tool invocation.
 *
 * Retrieves a knowledge entry by ID.
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with entry or null
 */
export async function handleKbGet(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  // Log invocation
  const inputObj = input as Record<string, unknown>
  logger.info('kb_get tool invoked', {
    correlation_id: correlationId,
    id: inputObj?.id,
  })

  try {
    // Validate input with Zod schema
    const validated = KbGetInputSchema.parse(input)

    // Call CRUD operation
    const entry = await kb_get(validated, deps)

    const queryTimeMs = Date.now() - startTime

    // Log success
    logger.info('kb_get succeeded', {
      correlation_id: correlationId,
      id: validated.id,
      found: entry !== null,
      query_time_ms: queryTimeMs,
    })

    // Return null as JSON string if not found
    if (entry === null) {
      return {
        content: [
          {
            type: 'text',
            text: 'null',
          },
        ],
      }
    }

    // Return entry without embedding (too large for response)
    const entryWithoutEmbedding = {
      id: entry.id,
      content: entry.content,
      role: entry.role,
      tags: entry.tags,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(entryWithoutEmbedding, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    // Log failure
    logger.error('kb_get failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_update tool invocation.
 *
 * Updates an existing knowledge entry.
 * Includes embedding_regenerated flag in response (KNOW-0053 AC8).
 *
 * @param input - Raw input from MCP request
 * @param deps - Database and embedding client dependencies
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with updated entry or error
 */
export async function handleKbUpdate(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  // Log invocation (sanitize content)
  const inputObj = input as Record<string, unknown>
  logger.info('kb_update tool invoked', {
    correlation_id: correlationId,
    id: inputObj?.id,
    has_content: inputObj?.content !== undefined,
    has_role: inputObj?.role !== undefined,
    has_tags: inputObj?.tags !== undefined,
    content_length: typeof inputObj?.content === 'string' ? inputObj.content.length : 0,
  })

  try {
    // Validate input with Zod schema
    const validated = KbUpdateInputSchema.parse(input)

    // Fetch existing entry to detect embedding regeneration (KNOW-0053 AC8)
    let embeddingRegenerated = false
    if (validated.content !== undefined) {
      const existingEntry = await kb_get({ id: validated.id }, deps)
      if (existingEntry) {
        const existingHash = computeContentHash(existingEntry.content)
        const newHash = computeContentHash(validated.content)
        embeddingRegenerated = existingHash !== newHash
      }
    }

    // Call CRUD operation
    const entry = await kb_update(validated, deps)

    const queryTimeMs = Date.now() - startTime

    // Log success
    logger.info('kb_update succeeded', {
      correlation_id: correlationId,
      id: validated.id,
      embedding_regenerated: embeddingRegenerated,
      query_time_ms: queryTimeMs,
    })

    // Return entry without embedding (too large for response)
    // Include embedding_regenerated flag (KNOW-0053 AC8)
    const entryWithoutEmbedding = {
      id: entry.id,
      content: entry.content,
      role: entry.role,
      tags: entry.tags,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      embedding_regenerated: embeddingRegenerated,
    }
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(entryWithoutEmbedding, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    // Log failure
    logger.error('kb_update failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_delete tool invocation.
 *
 * Deletes a knowledge entry by ID. Idempotent operation.
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with success confirmation
 */
export async function handleKbDelete(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  // Log invocation
  const inputObj = input as Record<string, unknown>
  logger.info('kb_delete tool invoked', {
    correlation_id: correlationId,
    id: inputObj?.id,
  })

  try {
    // Validate input with Zod schema
    const validated = KbDeleteInputSchema.parse(input)

    // Call CRUD operation
    await kb_delete(validated, deps)

    const queryTimeMs = Date.now() - startTime

    // Log success
    logger.info('kb_delete succeeded', {
      correlation_id: correlationId,
      id: validated.id,
      query_time_ms: queryTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: 'Deleted successfully',
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    // Log failure
    logger.error('kb_delete failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_list tool invocation.
 *
 * Lists knowledge entries with optional filtering.
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with array of entries
 */
export async function handleKbList(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  // Log invocation
  const inputObj = (input ?? {}) as Record<string, unknown>
  logger.info('kb_list tool invoked', {
    correlation_id: correlationId,
    role: inputObj?.role,
    tags: inputObj?.tags,
    limit: inputObj?.limit,
  })

  try {
    // Validate input with Zod schema (can be undefined)
    const validated = KbListInputSchema.parse(input)

    // Call CRUD operation
    const entries = await kb_list(validated, deps)

    const queryTimeMs = Date.now() - startTime

    // Log success
    logger.info('kb_list succeeded', {
      correlation_id: correlationId,
      count: entries.length,
      query_time_ms: queryTimeMs,
    })

    // Return entries without embeddings (too large for response)
    const entriesWithoutEmbeddings = entries.map(entry => ({
      id: entry.id,
      content: entry.content,
      role: entry.role,
      tags: entry.tags,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }))
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(entriesWithoutEmbeddings, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    // Log failure
    logger.error('kb_list failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_search tool invocation.
 *
 * Hybrid semantic + keyword search with RRF merging.
 *
 * @see KNOW-0052 AC1 for kb_search handler requirements
 *
 * @param input - Raw input from MCP request
 * @param deps - Database and embedding client dependencies
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with search results and metadata
 */
export async function handleKbSearch(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'
  const timeoutConfig = getTimeoutConfig()

  // Log invocation
  const inputObj = (input ?? {}) as Record<string, unknown>
  logger.info('kb_search tool invoked', {
    correlation_id: correlationId,
    query: inputObj?.query,
    role: inputObj?.role,
    tags: inputObj?.tags,
    limit: inputObj?.limit,
  })

  try {
    // Validate input with Zod schema
    const validationStart = Date.now()
    const validated = SearchInputSchema.parse(input)
    const protocolOverheadMs = Date.now() - validationStart

    // Execute search with timeout
    const domainLogicStart = Date.now()
    const result = await withTimeout(
      () => kb_search(validated, deps),
      timeoutConfig.kb_search_timeout_ms,
      'kb_search',
    )
    const domainLogicTimeMs = Date.now() - domainLogicStart

    const totalTimeMs = Date.now() - startTime

    // Log slow query at warn level if threshold exceeded
    if (totalTimeMs > timeoutConfig.log_slow_queries_ms) {
      logger.warn('kb_search slow query detected', {
        correlation_id: correlationId,
        total_time_ms: totalTimeMs,
        threshold_ms: timeoutConfig.log_slow_queries_ms,
        query: validated.query,
      })
    }

    // Log fallback mode at warn level
    if (result.metadata.fallback_mode) {
      logger.warn('kb_search using fallback mode (OpenAI API unavailable)', {
        correlation_id: correlationId,
        query: validated.query,
      })
    }

    // Log success with performance metrics (KNOW-0052 AC3, AC15)
    logger.info('kb_search succeeded', {
      correlation_id: correlationId,
      result_count: result.results.length,
      result_count_total: result.metadata.total,
      fallback_mode: result.metadata.fallback_mode,
      total_time_ms: totalTimeMs,
      protocol_overhead_ms: protocolOverheadMs,
      domain_logic_time_ms: domainLogicTimeMs,
      query_time_ms: result.metadata.query_time_ms,
    })

    // Build response with metadata including correlation_id (KNOW-0052 AC7)
    const response = {
      results: result.results,
      metadata: {
        ...result.metadata,
        correlation_id: correlationId,
      },
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    // Handle timeout error (KNOW-0052 AC6)
    if (error instanceof ToolTimeoutError) {
      logger.warn('kb_search timeout', {
        correlation_id: correlationId,
        timeout_ms: error.timeoutMs,
        elapsed_ms: queryTimeMs,
      })

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 'TIMEOUT',
              message: `Tool execution exceeded ${error.timeoutMs / 1000}s timeout`,
              correlation_id: correlationId,
            }),
          },
        ],
      }
    }

    // Log failure
    logger.error('kb_search failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_get_related tool invocation.
 *
 * Find entries related to a specific entry via parent/sibling/tag relationships.
 *
 * @see KNOW-0052 AC2 for kb_get_related handler requirements
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with related entries and metadata
 */
export async function handleKbGetRelated(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'
  const timeoutConfig = getTimeoutConfig()

  // Log invocation
  const inputObj = (input ?? {}) as Record<string, unknown>
  logger.info('kb_get_related tool invoked', {
    correlation_id: correlationId,
    entry_id: inputObj?.entry_id,
    limit: inputObj?.limit,
  })

  try {
    // Validate input with Zod schema
    const validationStart = Date.now()
    const validated = GetRelatedInputSchema.parse(input)
    const protocolOverheadMs = Date.now() - validationStart

    // Execute search with timeout
    const domainLogicStart = Date.now()
    const result = await withTimeout(
      () => kb_get_related(validated, deps),
      timeoutConfig.kb_get_related_timeout_ms,
      'kb_get_related',
    )
    const domainLogicTimeMs = Date.now() - domainLogicStart

    const totalTimeMs = Date.now() - startTime

    // Log slow query at warn level if threshold exceeded
    if (totalTimeMs > timeoutConfig.log_slow_queries_ms) {
      logger.warn('kb_get_related slow query detected', {
        correlation_id: correlationId,
        total_time_ms: totalTimeMs,
        threshold_ms: timeoutConfig.log_slow_queries_ms,
        entry_id: validated.entry_id,
      })
    }

    // Log success with performance metrics
    logger.info('kb_get_related succeeded', {
      correlation_id: correlationId,
      entry_id: validated.entry_id,
      result_count: result.results.length,
      relationship_types: result.metadata.relationship_types,
      total_time_ms: totalTimeMs,
      protocol_overhead_ms: protocolOverheadMs,
      domain_logic_time_ms: domainLogicTimeMs,
    })

    // Build response with metadata including correlation_id
    const response = {
      results: result.results,
      metadata: {
        ...result.metadata,
        correlation_id: correlationId,
      },
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    // Handle timeout error
    if (error instanceof ToolTimeoutError) {
      logger.warn('kb_get_related timeout', {
        correlation_id: correlationId,
        timeout_ms: error.timeoutMs,
        elapsed_ms: queryTimeMs,
      })

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 'TIMEOUT',
              message: `Tool execution exceeded ${error.timeoutMs / 1000}s timeout`,
              correlation_id: correlationId,
            }),
          },
        ],
      }
    }

    // Log failure
    logger.error('kb_get_related failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

// ============================================================================
// Admin Tool Handlers (KNOW-0053)
// ============================================================================

/**
 * Handle kb_bulk_import tool invocation.
 *
 * Bulk import knowledge entries with batch processing.
 *
 * @see KNOW-006 AC3, AC4 for bulk import requirements
 *
 * @param input - Raw input from MCP request
 * @param deps - Database and embedding client dependencies
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with import summary
 */
export async function handleKbBulkImport(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  // Log invocation at info level
  const inputObj = input as Record<string, unknown>
  const entryCount = Array.isArray(inputObj?.entries) ? inputObj.entries.length : 0
  logger.info('kb_bulk_import tool invoked', {
    correlation_id: correlationId,
    entry_count: entryCount,
    dry_run: inputObj?.dry_run,
    validate_only: inputObj?.validate_only,
  })

  // Call access control stub (future-proofs for KNOW-009)
  const agentRole: AgentRole = 'all' // Default role, will be from context in KNOW-009
  checkAccess('kb_bulk_import', agentRole)

  try {
    // Validate input with Zod schema
    const validated = KbBulkImportInputSchema.parse(input)

    // Import the bulk import function dynamically to avoid circular dependencies
    const { kbBulkImport } = await import('../seed/kb-bulk-import.js')

    // Execute bulk import
    const result = await kbBulkImport(
      {
        entries: validated.entries.map(entry => ({
          content: entry.content,
          role: entry.role,
          tags: entry.tags,
          source_file: entry.source_file,
        })),
        dry_run: validated.dry_run,
        validate_only: validated.validate_only,
      },
      deps,
    )

    const queryTimeMs = Date.now() - startTime

    logger.info('kb_bulk_import succeeded', {
      correlation_id: correlationId,
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
      dry_run: result.dry_run,
      duration_ms: queryTimeMs,
    })

    // Return result with correlation_id
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...result,
              correlation_id: correlationId,
            },
            null,
            2,
          ),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_bulk_import failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_rebuild_embeddings tool invocation.
 *
 * Full implementation for rebuilding embedding cache.
 * Supports both full rebuild (force: true) and incremental rebuild (force: false).
 *
 * @see KNOW-007 AC1-AC4 for implementation requirements
 *
 * @param input - Raw input from MCP request
 * @param deps - Database and embedding client dependencies
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with rebuild summary
 */
export async function handleKbRebuildEmbeddings(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  // Log invocation at info level
  const inputObj = (input ?? {}) as Record<string, unknown>
  logger.info('kb_rebuild_embeddings tool invoked', {
    correlation_id: correlationId,
    force: inputObj?.force,
    batch_size: inputObj?.batch_size,
    entry_ids_count: Array.isArray(inputObj?.entry_ids) ? inputObj.entry_ids.length : 'all',
    dry_run: inputObj?.dry_run,
  })

  // Call access control stub (future-proofs for KNOW-009)
  const agentRole: AgentRole = 'all' // Default role, will be from context in KNOW-009
  checkAccess('kb_rebuild_embeddings', agentRole)

  try {
    // Validate input with Zod schema
    const validated = KbRebuildEmbeddingsInputSchema.parse(input)

    // Import rebuild function dynamically to avoid circular dependencies
    const { rebuildEmbeddings } = await import('./rebuild-embeddings.js')

    // Execute rebuild
    const result = await rebuildEmbeddings(validated, deps)

    const queryTimeMs = Date.now() - startTime

    logger.info('kb_rebuild_embeddings succeeded', {
      correlation_id: correlationId,
      total_entries: result.total_entries,
      rebuilt: result.rebuilt,
      skipped: result.skipped,
      failed: result.failed,
      duration_ms: result.duration_ms,
      entries_per_second: result.entries_per_second,
      estimated_cost_usd: result.estimated_cost_usd,
      dry_run: result.dry_run,
      query_time_ms: queryTimeMs,
    })

    // Return result with correlation_id
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...result,
              correlation_id: correlationId,
            },
            null,
            2,
          ),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_rebuild_embeddings failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_stats tool invocation.
 *
 * Basic implementation: Database queries for statistics.
 *
 * @see KNOW-0053 AC3 for implementation requirements
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with statistics
 */
export async function handleKbStats(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  logger.info('kb_stats tool invoked', {
    correlation_id: correlationId,
  })

  // Call access control stub (future-proofs for KNOW-009)
  const agentRole: AgentRole = 'all'
  checkAccess('kb_stats', agentRole)

  // Check cache stub (future-proofs for KNOW-021)
  const cacheKey = 'kb_stats'
  const cached = cacheGet(cacheKey)
  if (cached) {
    logger.info('kb_stats cache hit', {
      correlation_id: correlationId,
      cached_at: cached.cached_at,
    })
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(cached.value, null, 2),
        },
      ],
    }
  }

  try {
    // Validate input (empty object)
    KbStatsInputSchema.parse(input)

    const { db } = deps

    // Query total entries
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(knowledgeEntries)

    const totalEntries = totalResult[0]?.count ?? 0

    // Query by role breakdown
    const roleResult = await db
      .select({
        role: knowledgeEntries.role,
        count: sql<number>`count(*)::int`,
      })
      .from(knowledgeEntries)
      .groupBy(knowledgeEntries.role)

    const byRole: Record<string, number> = {
      pm: 0,
      dev: 0,
      qa: 0,
      all: 0,
    }
    for (const row of roleResult) {
      if (row.role in byRole) {
        byRole[row.role] = row.count
      }
    }

    // Query total unique tags (KNOW-006 AC5)
    const totalTagsResult = await db.execute(sql`
      SELECT count(DISTINCT tag)::int as total_tags
      FROM knowledge_entries, unnest(tags) as tag
    `)
    const totalTags = (totalTagsResult.rows as Array<{ total_tags: number }>)[0]?.total_tags ?? 0

    // Query top tags (top 10 by count DESC)
    const tagsResult = await db.execute(sql`
      SELECT tag, count(*)::int as count
      FROM knowledge_entries, unnest(tags) as tag
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 10
    `)

    const topTags = (tagsResult.rows as Array<{ tag: string; count: number }>).map(row => ({
      tag: row.tag,
      count: row.count,
    }))

    // Query cache entries count (KNOW-006 AC5)
    const cacheResult = await db.execute(sql`
      SELECT count(*)::int as cache_entries
      FROM embedding_cache
    `)
    const cacheEntries =
      (cacheResult.rows as Array<{ cache_entries: number }>)[0]?.cache_entries ?? 0

    // Query database size in MB (KNOW-006 AC5)
    const dbSizeResult = await db.execute(sql`
      SELECT pg_database_size(current_database()) / 1048576.0 as database_size_mb
    `)
    const databaseSizeMb =
      Math.round(
        ((dbSizeResult.rows as Array<{ database_size_mb: number }>)[0]?.database_size_mb ?? 0) *
          100,
      ) / 100

    const queryTimeMs = Date.now() - startTime

    // Build response (KNOW-006 AC5 schema)
    const stats = {
      total_entries: totalEntries,
      by_role: byRole,
      total_tags: totalTags,
      top_tags: topTags,
      cache_entries: cacheEntries,
      database_size_mb: databaseSizeMb,
      query_time_ms: queryTimeMs,
      correlation_id: correlationId,
    }

    // Set cache stub (future-proofs for KNOW-021)
    cacheSet(cacheKey, stats, 60000) // 60s TTL

    logger.info('kb_stats succeeded', {
      correlation_id: correlationId,
      total_entries: totalEntries,
      query_time_ms: queryTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(stats, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_stats failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Health check status values.
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

/**
 * Individual health check result.
 */
export interface HealthCheckResult {
  status: 'pass' | 'fail'
  latency_ms?: number
  uptime_ms?: number
  error?: string
}

/**
 * Health check response.
 */
export interface HealthResponse {
  status: HealthStatus
  checks: {
    db: HealthCheckResult
    openai_api: HealthCheckResult
    mcp_server: HealthCheckResult
  }
  uptime_ms: number
  version: string
  correlation_id: string
}

/**
 * Health check latency thresholds (in ms).
 *
 * @see KNOW-0053 AC4 for threshold requirements
 */
const HEALTH_THRESHOLDS = {
  db: {
    healthy: 50,
    degraded: 200,
  },
  openai: {
    healthy: 500,
    degraded: 2000,
  },
} as const

/**
 * Handle kb_health tool invocation.
 *
 * Full implementation: Health checks for all subsystems.
 *
 * @see KNOW-0053 AC4 for implementation requirements
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with health status
 */
export async function handleKbHealth(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  logger.info('kb_health tool invoked', {
    correlation_id: correlationId,
  })

  // Call access control stub (future-proofs for KNOW-009)
  const agentRole: AgentRole = 'all'
  checkAccess('kb_health', agentRole)

  try {
    // Validate input (empty object)
    KbHealthInputSchema.parse(input)

    const { db } = deps

    // Initialize check results
    const checks: HealthResponse['checks'] = {
      db: { status: 'fail' },
      openai_api: { status: 'fail' },
      mcp_server: { status: 'pass', uptime_ms: getServerUptimeMs() },
    }

    // Check database connectivity
    const dbCheckStart = Date.now()
    try {
      await db.execute(sql`SELECT 1`)
      const dbLatency = Date.now() - dbCheckStart
      checks.db = {
        status: 'pass',
        latency_ms: dbLatency,
      }
    } catch (error) {
      const dbLatency = Date.now() - dbCheckStart
      checks.db = {
        status: 'fail',
        latency_ms: dbLatency,
        error: 'Database connection failed',
      }
    }

    // Check OpenAI API availability with real API call (KNOW-039 AC8)
    const openaiCheckStart = Date.now()
    const openaiApiKey = process.env.OPENAI_API_KEY

    if (!openaiApiKey) {
      const openaiLatency = Date.now() - openaiCheckStart
      checks.openai_api = {
        status: 'fail',
        latency_ms: openaiLatency,
        error: 'OPENAI_API_KEY not configured',
      }
    } else {
      // Make a real API call to validate the key (KNOW-039 AC5)
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })

        const openaiLatency = Date.now() - openaiCheckStart

        if (response.ok) {
          checks.openai_api = {
            status: 'pass',
            latency_ms: openaiLatency,
          }
        } else {
          checks.openai_api = {
            status: 'fail',
            latency_ms: openaiLatency,
            error: `API returned ${response.status}`,
          }
        }
      } catch (error) {
        const openaiLatency = Date.now() - openaiCheckStart
        const errorMessage =
          error instanceof Error
            ? error.name === 'TimeoutError'
              ? 'API request timeout'
              : 'API request failed'
            : 'API request failed'
        checks.openai_api = {
          status: 'fail',
          latency_ms: openaiLatency,
          error: errorMessage,
        }
      }
    }

    // Determine overall status
    let overallStatus: HealthStatus = 'healthy'

    // Database is critical - if it fails, we're unhealthy
    if (checks.db.status === 'fail') {
      overallStatus = 'unhealthy'
    } else if (checks.db.latency_ms && checks.db.latency_ms > HEALTH_THRESHOLDS.db.degraded) {
      overallStatus = 'unhealthy'
    } else if (checks.db.latency_ms && checks.db.latency_ms > HEALTH_THRESHOLDS.db.healthy) {
      overallStatus = 'degraded'
    }

    // OpenAI is non-critical for health (fallback mode exists)
    if (checks.openai_api.status === 'fail' && overallStatus === 'healthy') {
      overallStatus = 'degraded'
    }

    const uptimeMs = getServerUptimeMs()
    const queryTimeMs = Date.now() - startTime

    const response: HealthResponse = {
      status: overallStatus,
      checks,
      uptime_ms: uptimeMs,
      version: getPackageVersion(),
      correlation_id: correlationId,
    }

    logger.debug('kb_health check results', {
      correlation_id: correlationId,
      status: overallStatus,
      db_status: checks.db.status,
      db_latency_ms: checks.db.latency_ms,
      openai_status: checks.openai_api.status,
      uptime_ms: uptimeMs,
      query_time_ms: queryTimeMs,
    })

    logger.info('kb_health succeeded', {
      correlation_id: correlationId,
      status: overallStatus,
      query_time_ms: queryTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_health failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Tool handler type with context support.
 */
type ToolHandler = (
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
) => Promise<McpToolResult>

/**
 * Tool handler map for dispatching tool calls.
 */
export const toolHandlers: Record<string, ToolHandler> = {
  kb_add: handleKbAdd,
  kb_get: handleKbGet,
  kb_update: handleKbUpdate,
  kb_delete: handleKbDelete,
  kb_list: handleKbList,
  kb_search: handleKbSearch,
  kb_get_related: handleKbGetRelated,
  // Admin tools (KNOW-0053)
  kb_bulk_import: handleKbBulkImport,
  kb_rebuild_embeddings: handleKbRebuildEmbeddings,
  kb_stats: handleKbStats,
  kb_health: handleKbHealth,
}

/**
 * Handle a tool call by name.
 *
 * @param toolName - Name of the tool to invoke
 * @param input - Raw input from MCP request
 * @param deps - Database and embedding client dependencies
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result
 */
export async function handleToolCall(
  toolName: string,
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  // Check for circular dependency (KNOW-0052 AC14)
  try {
    checkCircularDependency(context, toolName)
  } catch (error) {
    if (error instanceof CircularDependencyError) {
      logger.error('Circular dependency detected', {
        correlation_id: correlationId,
        tool_chain: error.toolChain,
        attempted_tool: error.attemptedTool,
      })

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 'CIRCULAR_DEPENDENCY',
              message: error.message,
              correlation_id: correlationId,
            }),
          },
        ],
      }
    }
    throw error
  }

  const handler = toolHandlers[toolName]

  if (!handler) {
    logger.error('Unknown tool requested', {
      correlation_id: correlationId,
      tool_name: toolName,
    })
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            code: 'INTERNAL_ERROR',
            message: `Unknown tool: ${toolName}`,
            correlation_id: correlationId,
          }),
        },
      ],
    }
  }

  return handler(input, deps, context)
}
