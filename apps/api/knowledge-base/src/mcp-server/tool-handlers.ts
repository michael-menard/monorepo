/**
 * MCP Tool Handler Implementations
 *
 * Thin wrapper functions around KNOW-003 CRUD operations and KNOW-004 search functions.
 * Each handler adds logging, error sanitization, performance measurement, and correlation IDs.
 *
 * @see KNOW-0051 AC3 for tool handler requirements
 * @see KNOW-0052 for search tools, correlation IDs, and timeouts
 */

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
import { createMcpLogger } from './logger.js'
import { errorToToolResult, type McpToolResult } from './error-handling.js'
import {
  type ToolCallContext,
  MAX_TOOL_CALL_DEPTH,
  DEFAULT_TIMEOUTS,
  EnvSchema,
} from './server.js'

const logger = createMcpLogger('tool-handlers')

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
async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number, toolName: string): Promise<T> {
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

    // Call CRUD operation
    const entry = await kb_update(validated, deps)

    const queryTimeMs = Date.now() - startTime

    // Log success
    logger.info('kb_update succeeded', {
      correlation_id: correlationId,
      id: validated.id,
      query_time_ms: queryTimeMs,
    })

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
