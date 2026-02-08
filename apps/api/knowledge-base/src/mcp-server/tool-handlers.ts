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
import {
  AuditLogger,
  queryAuditByEntry,
  queryAuditByTimeRange,
  runRetentionCleanup,
  parseAuditConfig,
  type AuditUserContext,
} from '../audit/index.js'
import { knowledgeEntries } from '../db/schema.js'
import { computeContentHash } from '../embedding-client/cache-manager.js'
import {
  kb_add_task,
  kb_get_task,
  kb_update_task,
  kb_list_tasks,
} from '../crud-operations/task-operations.js'
import {
  kb_triage_tasks,
  kb_promote_task,
  kb_list_promotable_tasks,
  kb_cleanup_stale_tasks,
  KbTriageTasksInputSchema,
  KbPromoteTaskInputSchema,
  KbListPromotableTasksInputSchema,
  KbCleanupStaleTasksInputSchema,
  kb_queue_deferred_write,
  kb_list_deferred_writes,
  kb_process_deferred_writes,
  KbQueueDeferredWriteInputSchema,
  KbListDeferredWritesInputSchema,
  KbProcessDeferredWritesInputSchema,
} from '../crud-operations/index.js'
import {
  kb_get_work_state,
  kb_update_work_state,
  kb_archive_work_state,
} from '../crud-operations/work-state-operations.js'
import {
  kb_write_artifact,
  kb_read_artifact,
  kb_list_artifacts,
  KbWriteArtifactInputSchema,
  KbReadArtifactInputSchema,
  KbListArtifactsInputSchema,
} from '../crud-operations/artifact-operations.js'
import {
  kb_get_story,
  kb_list_stories,
  kb_update_story_status,
  kb_get_next_story,
  KbGetStoryInputSchema,
  KbListStoriesInputSchema,
  KbUpdateStoryStatusInputSchema,
  KbGetNextStoryInputSchema,
} from '../crud-operations/story-crud-operations.js'
import { kb_log_tokens, KbLogTokensInputSchema } from '../crud-operations/token-operations.js'
import {
  kb_get_token_summary,
  kb_get_bottleneck_analysis,
  kb_get_churn_analysis,
  KbGetTokenSummaryInputSchema,
  KbGetBottleneckAnalysisInputSchema,
  KbGetChurnAnalysisInputSchema,
} from '../crud-operations/analytics-operations.js'
import {
  kb_sync_working_set,
  KbSyncWorkingSetInputSchema,
  kb_generate_working_set,
  KbGenerateWorkingSetInputSchema,
  kb_inherit_constraints,
  KbInheritConstraintsInputSchema,
  kb_archive_working_set,
  KbArchiveWorkingSetInputSchema,
} from '../working-set/index.js'
import { checkAccess, cacheGet, cacheSet, type AgentRole, type ToolName } from './access-control.js'
import { AuthorizationError, errorToToolResult, type McpToolResult } from './error-handling.js'
import { createMcpLogger } from './logger.js'
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
  KbAuditByEntryInputSchema,
  KbAuditQueryInputSchema,
  KbAuditRetentionInputSchema,
  // Bucket A typed entry tools (KBMEM-004)
  KbAddDecisionInputSchema,
  KbAddConstraintInputSchema,
  KbAddLessonInputSchema,
  KbAddRunbookInputSchema,
  // Bucket B work state tools (KBMEM-006)
  KbGetWorkStateInputSchema,
  KbUpdateWorkStateInputSchema,
  KbArchiveWorkStateInputSchema,
  // Bucket C task tools (KBMEM-005)
  KbAddTaskInputSchema,
  KbGetTaskInputSchema,
  KbUpdateTaskInputSchema,
  KbListTasksInputSchema,
} from './tool-schemas.js'
// Bucket C task operations (KBMEM-005)
// Bucket C task triage and lifecycle (KBMEM-018, 019, 020)
// Deferred writes (KBMEM-022)
// Bucket B work state operations (KBMEM-006)
// Bucket B working set sync (KBMEM-008), fallback (KBMEM-011), constraint inheritance (KBMEM-016), and archive (KBMEM-021)

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
 * Enforce authorization for a tool call.
 *
 * Checks if the agent role has permission to access the tool.
 * Throws AuthorizationError if access is denied.
 *
 * @param toolName - Name of the tool being accessed
 * @param context - Tool call context containing agent role
 * @throws AuthorizationError if access is denied
 *
 * @see KNOW-009 for authorization implementation
 */
function enforceAuthorization(toolName: ToolName, context: ToolCallContext | undefined): void {
  // Default to 'all' role if no context (fail-safe, blocks admin tools)
  const agentRole: AgentRole = context?.agent_role ?? 'all'
  const result = checkAccess(toolName, agentRole)

  if (!result.allowed) {
    throw new AuthorizationError(toolName, 'pm', agentRole)
  }
}

/**
 * Handle kb_add tool invocation.
 *
 * Creates a new knowledge entry with automatic embedding generation.
 * Also creates audit log entry for the add operation (KNOW-018).
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
    // Authorization check (KNOW-009) - FIRST operation
    enforceAuthorization('kb_add', context)
    // Validate input with Zod schema
    const validationStart = Date.now()
    const validated = KbAddInputSchema.parse(input)
    const protocolOverheadMs = Date.now() - validationStart

    // Call CRUD operation
    const domainLogicStart = Date.now()
    const entryId = await kb_add(validated, deps)
    const domainLogicTimeMs = Date.now() - domainLogicStart

    // Audit logging (KNOW-018): Log the add operation
    const auditConfig = parseAuditConfig()
    if (auditConfig.enabled) {
      // Fetch the created entry for audit snapshot
      const createdEntry = await kb_get({ id: entryId }, deps)
      if (createdEntry) {
        const auditLogger = new AuditLogger({ db: deps.db })
        const userContext: AuditUserContext = { correlation_id: correlationId }
        await auditLogger.logAdd(entryId, createdEntry, userContext)
      }
    }

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
    // Authorization check (KNOW-009) - FIRST operation
    enforceAuthorization('kb_get', context)
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
 * Also creates audit log entry for the update operation (KNOW-018).
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
    // Authorization check (KNOW-009) - FIRST operation
    enforceAuthorization('kb_update', context)
    // Validate input with Zod schema
    const validated = KbUpdateInputSchema.parse(input)

    // Fetch existing entry BEFORE update for audit logging (KNOW-018) and embedding regeneration check
    const existingEntry = await kb_get({ id: validated.id }, deps)

    // Detect embedding regeneration (KNOW-0053 AC8)
    let embeddingRegenerated = false
    if (validated.content !== undefined && existingEntry) {
      const existingHash = computeContentHash(existingEntry.content)
      const newHash = computeContentHash(validated.content)
      embeddingRegenerated = existingHash !== newHash
    }

    // Call CRUD operation
    const entry = await kb_update(validated, deps)

    // Audit logging (KNOW-018): Log the update operation with before/after snapshots
    const auditConfig = parseAuditConfig()
    if (auditConfig.enabled && existingEntry) {
      const auditLogger = new AuditLogger({ db: deps.db })
      const userContext: AuditUserContext = { correlation_id: correlationId }
      await auditLogger.logUpdate(validated.id, existingEntry, entry, userContext)
    }

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
 * Also creates audit log entry for the delete operation (KNOW-018).
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
    // Authorization check (KNOW-009) - FIRST operation (admin-only tool)
    enforceAuthorization('kb_delete', context)
    // Validate input with Zod schema
    const validated = KbDeleteInputSchema.parse(input)

    // Fetch existing entry BEFORE delete for audit logging (KNOW-018)
    const existingEntry = await kb_get({ id: validated.id }, deps)

    // Call CRUD operation
    await kb_delete(validated, deps)

    // Audit logging (KNOW-018): Log the delete operation with deleted entry snapshot
    const auditConfig = parseAuditConfig()
    if (auditConfig.enabled && existingEntry) {
      const auditLogger = new AuditLogger({ db: deps.db })
      const userContext: AuditUserContext = { correlation_id: correlationId }
      await auditLogger.logDelete(validated.id, existingEntry, userContext)
    }

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
    // Authorization check (KNOW-009) - FIRST operation
    enforceAuthorization('kb_list', context)
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
    // Authorization check (KNOW-009) - FIRST operation
    enforceAuthorization('kb_search', context)
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
    // Authorization check (KNOW-009) - FIRST operation
    enforceAuthorization('kb_get_related', context)
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

  try {
    // Authorization check (KNOW-009) - FIRST operation (admin-only tool)
    enforceAuthorization('kb_bulk_import', context)
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

  try {
    // Authorization check (KNOW-009) - FIRST operation (admin-only tool)
    enforceAuthorization('kb_rebuild_embeddings', context)
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

  try {
    // Authorization check (KNOW-009) - FIRST operation
    enforceAuthorization('kb_stats', context)
  } catch (error) {
    return errorToToolResult(error)
  }

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

  try {
    // Authorization check (KNOW-009) - FIRST operation
    enforceAuthorization('kb_health', context)
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

// ============================================================================
// Audit Tool Handlers (KNOW-018)
// ============================================================================

/**
 * Handle kb_audit_by_entry tool invocation.
 *
 * Query audit logs for a specific knowledge entry.
 *
 * @see KNOW-018 AC6 for query by entry requirements
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with audit log entries
 */
export async function handleKbAuditByEntry(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  // Log invocation
  const inputObj = input as Record<string, unknown>
  logger.info('kb_audit_by_entry tool invoked', {
    correlation_id: correlationId,
    entry_id: inputObj?.entry_id,
    limit: inputObj?.limit,
    offset: inputObj?.offset,
  })

  try {
    // Authorization check (KNOW-009) - FIRST operation
    // Note: Audit tools are not in the original 11 tools scope, treating as read-only (allow all roles)
    // This is a placeholder - if these tools need restrictions, add them to ACCESS_MATRIX
    // Validate input with Zod schema
    const validated = KbAuditByEntryInputSchema.parse(input)

    // Execute query
    const result = await queryAuditByEntry(validated, { db: deps.db }, correlationId)

    const queryTimeMs = Date.now() - startTime

    logger.info('kb_audit_by_entry succeeded', {
      correlation_id: correlationId,
      entry_id: validated.entry_id,
      result_count: result.results.length,
      total: result.metadata.total,
      query_time_ms: queryTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_audit_by_entry failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_audit_query tool invocation.
 *
 * Query audit logs by time range with optional filters.
 *
 * @see KNOW-018 AC7-AC8 for time range and filter requirements
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with audit log entries
 */
export async function handleKbAuditQuery(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  // Log invocation
  const inputObj = input as Record<string, unknown>
  logger.info('kb_audit_query tool invoked', {
    correlation_id: correlationId,
    start_date: inputObj?.start_date,
    end_date: inputObj?.end_date,
    operation: inputObj?.operation,
    limit: inputObj?.limit,
    offset: inputObj?.offset,
  })

  try {
    // Authorization check (KNOW-009) - FIRST operation
    // Note: Audit tools are not in the original 11 tools scope, treating as read-only (allow all roles)
    // This is a placeholder - if these tools need restrictions, add them to ACCESS_MATRIX
    // Validate input with Zod schema
    const validated = KbAuditQueryInputSchema.parse(input)

    // Execute query
    const result = await queryAuditByTimeRange(validated, { db: deps.db }, correlationId)

    const queryTimeMs = Date.now() - startTime

    logger.info('kb_audit_query succeeded', {
      correlation_id: correlationId,
      start_date: validated.start_date.toISOString(),
      end_date: validated.end_date.toISOString(),
      operation: validated.operation,
      result_count: result.results.length,
      total: result.metadata.total,
      query_time_ms: queryTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_audit_query failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_audit_retention_cleanup tool invocation.
 *
 * Manually trigger retention policy cleanup.
 *
 * @see KNOW-018 AC9-AC10 for retention requirements
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with cleanup statistics
 */
export async function handleKbAuditRetentionCleanup(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  // Log invocation
  const inputObj = (input ?? {}) as Record<string, unknown>
  logger.info('kb_audit_retention_cleanup tool invoked', {
    correlation_id: correlationId,
    retention_days: inputObj?.retention_days,
    dry_run: inputObj?.dry_run,
  })

  try {
    // Authorization check (KNOW-009) - FIRST operation
    // Note: Audit retention cleanup is destructive, but not in original 11 tools scope
    // This is a placeholder - if this tool needs restrictions, add it to ACCESS_MATRIX
    // Validate input with Zod schema
    const validated = KbAuditRetentionInputSchema.parse(input)

    // Execute cleanup
    const result = await runRetentionCleanup(validated, { db: deps.db }, correlationId)

    const queryTimeMs = Date.now() - startTime

    logger.info('kb_audit_retention_cleanup succeeded', {
      correlation_id: correlationId,
      deleted_count: result.deleted_count,
      retention_days: result.retention_days,
      dry_run: result.dry_run,
      batches_processed: result.batches_processed,
      query_time_ms: queryTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_audit_retention_cleanup failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

// ============================================================================
// Bucket A Typed Entry Tool Handlers (KBMEM-004)
// ============================================================================

/**
 * Generate markdown content for a decision (ADR).
 */
function formatDecisionContent(input: {
  title: string
  context: string
  decision: string
  consequences?: string
}): string {
  let content = `# Decision: ${input.title}\n\n`
  content += `## Context\n\n${input.context}\n\n`
  content += `## Decision\n\n${input.decision}\n`

  if (input.consequences) {
    content += `\n## Consequences\n\n${input.consequences}\n`
  }

  return content
}

/**
 * Generate markdown content for a constraint.
 */
function formatConstraintContent(input: {
  constraint: string
  rationale: string
  scope: string
  source?: string
}): string {
  let content = `# Constraint\n\n${input.constraint}\n\n`
  content += `## Rationale\n\n${input.rationale}\n\n`
  content += `**Scope:** ${input.scope}\n`

  if (input.source) {
    content += `**Source:** ${input.source}\n`
  }

  return content
}

/**
 * Generate markdown content for a lesson.
 */
function formatLessonContent(input: {
  title: string
  what_happened: string
  why?: string
  resolution: string
  category: string
}): string {
  let content = `# Lesson: ${input.title}\n\n`
  content += `## What Happened\n\n${input.what_happened}\n\n`

  if (input.why) {
    content += `## Why\n\n${input.why}\n\n`
  }

  content += `## Resolution\n\n${input.resolution}\n\n`
  content += `**Category:** ${input.category}\n`

  return content
}

/**
 * Generate markdown content for a runbook.
 */
function formatRunbookContent(input: {
  title: string
  purpose: string
  prerequisites?: string[]
  steps: string[]
  notes?: string
}): string {
  let content = `# Runbook: ${input.title}\n\n`
  content += `## Purpose\n\n${input.purpose}\n\n`

  if (input.prerequisites && input.prerequisites.length > 0) {
    content += `## Prerequisites\n\n`
    for (const prereq of input.prerequisites) {
      content += `- ${prereq}\n`
    }
    content += '\n'
  }

  content += `## Steps\n\n`
  for (let i = 0; i < input.steps.length; i++) {
    content += `${i + 1}. ${input.steps[i]}\n`
  }

  if (input.notes) {
    content += `\n## Notes\n\n${input.notes}\n`
  }

  return content
}

/**
 * Handle kb_add_decision tool invocation.
 *
 * Creates an Architecture Decision Record (ADR) entry.
 *
 * @see KBMEM-004 for implementation requirements
 */
export async function handleKbAddDecision(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_add_decision tool invoked', {
    correlation_id: correlationId,
    title: inputObj?.title,
    role: inputObj?.role,
  })

  try {
    enforceAuthorization('kb_add', context) // Uses kb_add permissions
    const validated = KbAddDecisionInputSchema.parse(input)

    // Format content for optimal embedding
    const content = formatDecisionContent(validated)

    // Build tags array (auto-add 'adr', 'decision')
    const tags = new Set<string>(['adr', 'decision'])
    if (validated.tags) {
      for (const tag of validated.tags) {
        tags.add(tag)
      }
    }

    // Create entry via kb_add
    const entryId = await kb_add(
      {
        content,
        role: validated.role,
        entry_type: 'decision',
        story_id: validated.story_id,
        tags: Array.from(tags),
      },
      deps,
    )

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_add_decision succeeded', {
      correlation_id: correlationId,
      entry_id: entryId,
      total_time_ms: totalTimeMs,
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

    logger.error('kb_add_decision failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_add_constraint tool invocation.
 *
 * Creates a constraint entry with scope.
 *
 * @see KBMEM-004 for implementation requirements
 */
export async function handleKbAddConstraint(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_add_constraint tool invoked', {
    correlation_id: correlationId,
    scope: inputObj?.scope,
    role: inputObj?.role,
  })

  try {
    enforceAuthorization('kb_add', context) // Uses kb_add permissions
    const validated = KbAddConstraintInputSchema.parse(input)

    // Format content for optimal embedding
    const content = formatConstraintContent(validated)

    // Build tags array (auto-add 'constraint', scope)
    const tags = new Set<string>(['constraint', `scope:${validated.scope}`])
    if (validated.tags) {
      for (const tag of validated.tags) {
        tags.add(tag)
      }
    }

    // Create entry via kb_add
    const entryId = await kb_add(
      {
        content,
        role: validated.role,
        entry_type: 'constraint',
        story_id: validated.story_id,
        tags: Array.from(tags),
      },
      deps,
    )

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_add_constraint succeeded', {
      correlation_id: correlationId,
      entry_id: entryId,
      scope: validated.scope,
      total_time_ms: totalTimeMs,
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

    logger.error('kb_add_constraint failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_add_lesson tool invocation.
 *
 * Creates a lessons learned entry.
 *
 * @see KBMEM-004 for implementation requirements
 */
export async function handleKbAddLesson(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_add_lesson tool invoked', {
    correlation_id: correlationId,
    title: inputObj?.title,
    category: inputObj?.category,
    role: inputObj?.role,
  })

  try {
    enforceAuthorization('kb_add', context) // Uses kb_add permissions
    const validated = KbAddLessonInputSchema.parse(input)

    // Format content for optimal embedding
    const content = formatLessonContent(validated)

    // Build tags array (auto-add 'lesson', category)
    const tags = new Set<string>(['lesson', `category:${validated.category}`])
    if (validated.tags) {
      for (const tag of validated.tags) {
        tags.add(tag)
      }
    }

    // Create entry via kb_add
    const entryId = await kb_add(
      {
        content,
        role: validated.role,
        entry_type: 'lesson',
        story_id: validated.story_id,
        tags: Array.from(tags),
      },
      deps,
    )

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_add_lesson succeeded', {
      correlation_id: correlationId,
      entry_id: entryId,
      category: validated.category,
      total_time_ms: totalTimeMs,
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

    logger.error('kb_add_lesson failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_add_runbook tool invocation.
 *
 * Creates a runbook/procedure entry.
 *
 * @see KBMEM-004 for implementation requirements
 */
export async function handleKbAddRunbook(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_add_runbook tool invoked', {
    correlation_id: correlationId,
    title: inputObj?.title,
    role: inputObj?.role,
  })

  try {
    enforceAuthorization('kb_add', context) // Uses kb_add permissions
    const validated = KbAddRunbookInputSchema.parse(input)

    // Format content for optimal embedding
    const content = formatRunbookContent(validated)

    // Build tags array (auto-add 'runbook', 'procedure')
    const tags = new Set<string>(['runbook', 'procedure'])
    if (validated.tags) {
      for (const tag of validated.tags) {
        tags.add(tag)
      }
    }

    // Create entry via kb_add
    const entryId = await kb_add(
      {
        content,
        role: validated.role,
        entry_type: 'runbook',
        story_id: validated.story_id,
        tags: Array.from(tags),
      },
      deps,
    )

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_add_runbook succeeded', {
      correlation_id: correlationId,
      entry_id: entryId,
      steps_count: validated.steps.length,
      total_time_ms: totalTimeMs,
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

    logger.error('kb_add_runbook failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

// ============================================================================
// Bucket C Task Tool Handlers (KBMEM-005)
// ============================================================================

/**
 * Handle kb_add_task tool invocation.
 *
 * Creates a new task in the backlog.
 *
 * @see KBMEM-005 for implementation requirements
 */
export async function handleKbAddTask(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_add_task tool invoked', {
    correlation_id: correlationId,
    title: inputObj?.title,
    task_type: inputObj?.task_type,
  })

  try {
    const validated = KbAddTaskInputSchema.parse(input)

    const taskId = await kb_add_task(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_add_task succeeded', {
      correlation_id: correlationId,
      task_id: taskId,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: taskId,
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_add_task failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_get_task tool invocation.
 *
 * Retrieves a task by ID.
 *
 * @see KBMEM-005 for implementation requirements
 */
export async function handleKbGetTask(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_get_task tool invoked', {
    correlation_id: correlationId,
    id: inputObj?.id,
  })

  try {
    const validated = KbGetTaskInputSchema.parse(input)

    const task = await kb_get_task(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_get_task succeeded', {
      correlation_id: correlationId,
      found: task !== null,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: task ? JSON.stringify(task, null, 2) : 'null',
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_get_task failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_update_task tool invocation.
 *
 * Updates an existing task.
 *
 * @see KBMEM-005 for implementation requirements
 */
export async function handleKbUpdateTask(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_update_task tool invoked', {
    correlation_id: correlationId,
    id: inputObj?.id,
  })

  try {
    const validated = KbUpdateTaskInputSchema.parse(input)

    const task = await kb_update_task(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_update_task succeeded', {
      correlation_id: correlationId,
      task_id: task.id,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(task, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_update_task failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_list_tasks tool invocation.
 *
 * Lists tasks with optional filters.
 *
 * @see KBMEM-005 for implementation requirements
 */
export async function handleKbListTasks(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = (input ?? {}) as Record<string, unknown>
  logger.info('kb_list_tasks tool invoked', {
    correlation_id: correlationId,
    status: inputObj?.status,
    task_type: inputObj?.task_type,
    limit: inputObj?.limit,
  })

  try {
    const validated = KbListTasksInputSchema.parse(input)

    const result = await kb_list_tasks(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_list_tasks succeeded', {
      correlation_id: correlationId,
      count: result.tasks.length,
      total: result.total,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_list_tasks failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

// ============================================================================
// Bucket C Task Triage Handler (KBMEM-018)
// ============================================================================

/**
 * Handle kb_triage_tasks tool invocation.
 *
 * Triages tasks with auto-priority heuristics.
 *
 * @see KBMEM-018 for implementation requirements
 */
export async function handleKbTriageTasks(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = (input ?? {}) as Record<string, unknown>
  logger.info('kb_triage_tasks tool invoked', {
    correlation_id: correlationId,
    status: inputObj?.status,
    task_type: inputObj?.task_type,
    dry_run: inputObj?.dry_run,
    limit: inputObj?.limit,
  })

  try {
    const validated = KbTriageTasksInputSchema.parse(input)

    const result = await kb_triage_tasks(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_triage_tasks succeeded', {
      correlation_id: correlationId,
      analyzed: result.analyzed,
      updated: result.updated,
      unchanged: result.unchanged,
      dry_run: result.dry_run,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_triage_tasks failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

// ============================================================================
// Bucket C Task Promotion Handlers (KBMEM-019)
// ============================================================================

/**
 * Handle kb_promote_task tool invocation.
 *
 * Promotes a task to a story.
 *
 * @see KBMEM-019 for implementation requirements
 */
export async function handleKbPromoteTask(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_promote_task tool invoked', {
    correlation_id: correlationId,
    task_id: inputObj?.task_id,
    promoted_to_story: inputObj?.promoted_to_story,
    force: inputObj?.force,
  })

  try {
    const validated = KbPromoteTaskInputSchema.parse(input)

    const result = await kb_promote_task(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_promote_task succeeded', {
      correlation_id: correlationId,
      success: result.success,
      task_id: result.task_id,
      promoted_to_story: result.promoted_to_story,
      forced: result.forced,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_promote_task failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_list_promotable_tasks tool invocation.
 *
 * Lists tasks that are candidates for promotion.
 *
 * @see KBMEM-019 for implementation requirements
 */
export async function handleKbListPromotableTasks(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = (input ?? {}) as Record<string, unknown>
  logger.info('kb_list_promotable_tasks tool invoked', {
    correlation_id: correlationId,
    limit: inputObj?.limit,
    include_partial_matches: inputObj?.include_partial_matches,
  })

  try {
    const validated = KbListPromotableTasksInputSchema.parse(input)

    const result = await kb_list_promotable_tasks(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_list_promotable_tasks succeeded', {
      correlation_id: correlationId,
      count: result.tasks.length,
      total: result.total,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_list_promotable_tasks failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

// ============================================================================
// Bucket C Stale Task Cleanup Handler (KBMEM-020)
// ============================================================================

/**
 * Handle kb_cleanup_stale_tasks tool invocation.
 *
 * Finds and optionally cleans up stale tasks.
 *
 * @see KBMEM-020 for implementation requirements
 */
export async function handleKbCleanupStaleTasks(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = (input ?? {}) as Record<string, unknown>
  logger.info('kb_cleanup_stale_tasks tool invoked', {
    correlation_id: correlationId,
    dry_run: inputObj?.dry_run,
    auto_close_low_priority: inputObj?.auto_close_low_priority,
    limit: inputObj?.limit,
  })

  try {
    const validated = KbCleanupStaleTasksInputSchema.parse(input)

    const result = await kb_cleanup_stale_tasks(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_cleanup_stale_tasks succeeded', {
      correlation_id: correlationId,
      total_stale: result.total_stale,
      closed: result.closed,
      needs_attention: result.needs_attention,
      dry_run: result.dry_run,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_cleanup_stale_tasks failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

// ============================================================================
// Deferred Writes Tool Handlers (KBMEM-022)
// ============================================================================

/**
 * Handle kb_queue_deferred_write tool invocation.
 *
 * Queue a failed write for later processing.
 *
 * @see KBMEM-022 for implementation requirements
 */
export async function handleKbQueueDeferredWrite(
  input: unknown,
  _deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_queue_deferred_write tool invoked', {
    correlation_id: correlationId,
    operation: inputObj?.operation,
    story_id: inputObj?.story_id,
  })

  try {
    const validated = KbQueueDeferredWriteInputSchema.parse(input)

    const result = await kb_queue_deferred_write(validated)

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_queue_deferred_write succeeded', {
      correlation_id: correlationId,
      id: result.id,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_queue_deferred_write failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_list_deferred_writes tool invocation.
 *
 * List pending deferred writes.
 *
 * @see KBMEM-022 for implementation requirements
 */
export async function handleKbListDeferredWrites(
  input: unknown,
  _deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = (input ?? {}) as Record<string, unknown>
  logger.info('kb_list_deferred_writes tool invoked', {
    correlation_id: correlationId,
    operation: inputObj?.operation,
    story_id: inputObj?.story_id,
    limit: inputObj?.limit,
  })

  try {
    const validated = KbListDeferredWritesInputSchema.parse(input)

    const result = await kb_list_deferred_writes(validated)

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_list_deferred_writes succeeded', {
      correlation_id: correlationId,
      count: result.writes.length,
      total: result.total,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_list_deferred_writes failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_process_deferred_writes tool invocation.
 *
 * Process pending deferred writes.
 *
 * @see KBMEM-022 for implementation requirements
 */
export async function handleKbProcessDeferredWrites(
  input: unknown,
  _deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = (input ?? {}) as Record<string, unknown>
  logger.info('kb_process_deferred_writes tool invoked', {
    correlation_id: correlationId,
    dry_run: inputObj?.dry_run,
    operation: inputObj?.operation,
    story_id: inputObj?.story_id,
    limit: inputObj?.limit,
  })

  try {
    const validated = KbProcessDeferredWritesInputSchema.parse(input)

    // Note: This handler doesn't have access to a processor callback
    // since we can't inject the KB operations dynamically.
    // In practice, a separate CLI command or scheduled job would handle processing.
    const result = await kb_process_deferred_writes(validated)

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_process_deferred_writes succeeded', {
      correlation_id: correlationId,
      total: result.total,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      dry_run: result.dry_run,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_process_deferred_writes failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

// ============================================================================
// Bucket B Work State Tool Handlers (KBMEM-006)
// ============================================================================

/**
 * Handle kb_get_work_state tool invocation.
 *
 * Gets work state for a story.
 *
 * @see KBMEM-006 for implementation requirements
 */
export async function handleKbGetWorkState(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_get_work_state tool invoked', {
    correlation_id: correlationId,
    story_id: inputObj?.story_id,
  })

  try {
    const validated = KbGetWorkStateInputSchema.parse(input)

    const workState = await kb_get_work_state(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_get_work_state succeeded', {
      correlation_id: correlationId,
      found: workState !== null,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: workState ? JSON.stringify(workState, null, 2) : 'null',
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_get_work_state failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_update_work_state tool invocation.
 *
 * Updates or creates work state for a story (upsert).
 *
 * @see KBMEM-006 for implementation requirements
 */
export async function handleKbUpdateWorkState(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_update_work_state tool invoked', {
    correlation_id: correlationId,
    story_id: inputObj?.story_id,
    phase: inputObj?.phase,
  })

  try {
    const validated = KbUpdateWorkStateInputSchema.parse(input)

    const workState = await kb_update_work_state(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_update_work_state succeeded', {
      correlation_id: correlationId,
      story_id: workState.story_id,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(workState, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_update_work_state failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_archive_work_state tool invocation.
 *
 * Archives work state for a completed story.
 *
 * @see KBMEM-006 for implementation requirements
 */
export async function handleKbArchiveWorkState(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_archive_work_state tool invoked', {
    correlation_id: correlationId,
    story_id: inputObj?.story_id,
  })

  try {
    const validated = KbArchiveWorkStateInputSchema.parse(input)

    const result = await kb_archive_work_state(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_archive_work_state succeeded', {
      correlation_id: correlationId,
      archived: result.archived,
      history_id: result.history_id,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_archive_work_state failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_sync_working_set tool invocation.
 *
 * Syncs working-set.md file to/from KB.
 *
 * @see KBMEM-008 for implementation requirements
 */
export async function handleKbSyncWorkingSet(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_sync_working_set tool invoked', {
    correlation_id: correlationId,
    story_id: inputObj?.story_id,
    direction: inputObj?.direction,
  })

  try {
    const validated = KbSyncWorkingSetInputSchema.parse(input)

    const result = await kb_sync_working_set(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_sync_working_set succeeded', {
      correlation_id: correlationId,
      success: result.success,
      story_id: result.story_id,
      direction: result.direction,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_sync_working_set failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_generate_working_set tool invocation.
 *
 * Generates working-set.md from KB when file is missing.
 *
 * @see KBMEM-011 for implementation requirements
 */
export async function handleKbGenerateWorkingSet(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_generate_working_set tool invoked', {
    correlation_id: correlationId,
    story_id: inputObj?.story_id,
    epic_id: inputObj?.epic_id,
  })

  try {
    const validated = KbGenerateWorkingSetInputSchema.parse(input)

    const result = await kb_generate_working_set(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_generate_working_set succeeded', {
      correlation_id: correlationId,
      success: result.success,
      story_id: result.story_id,
      source: result.source,
      constraints_count: result.summary.constraints_count,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_generate_working_set failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_inherit_constraints tool invocation.
 *
 * Inherits constraints from project and epic scopes with conflict detection.
 *
 * @see KBMEM-016 for implementation requirements
 */
export async function handleKbInheritConstraints(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_inherit_constraints tool invoked', {
    correlation_id: correlationId,
    story_id: inputObj?.story_id,
    epic_id: inputObj?.epic_id,
  })

  try {
    const validated = KbInheritConstraintsInputSchema.parse(input)

    const result = await kb_inherit_constraints(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_inherit_constraints succeeded', {
      correlation_id: correlationId,
      success: result.success,
      story_id: result.story_id,
      epic_id: result.epic_id,
      total_constraints: result.summary.total,
      conflicts_resolved: result.summary.conflicts_resolved,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_inherit_constraints failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_archive_working_set tool invocation.
 *
 * Archives working-set.md content on story completion.
 *
 * @see KBMEM-021 for implementation requirements
 */
export async function handleKbArchiveWorkingSet(
  input: unknown,
  _deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_archive_working_set tool invoked', {
    correlation_id: correlationId,
    story_id: inputObj?.story_id,
  })

  try {
    const validated = KbArchiveWorkingSetInputSchema.parse(input)

    const result = await kb_archive_working_set(validated)

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_archive_working_set succeeded', {
      correlation_id: correlationId,
      story_id: result.story_id,
      content_length: result.content_length,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_archive_working_set failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

// ============================================================================
// Artifact Tools (DB-First Artifact Storage)
// ============================================================================

/**
 * Handle kb_write_artifact tool invocation.
 *
 * Write (create or update) a workflow artifact to the database.
 * Uses upsert behavior based on story_id + artifact_type + iteration.
 */
export async function handleKbWriteArtifact(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_write_artifact tool invoked', {
    correlation_id: correlationId,
    story_id: inputObj?.story_id,
    artifact_type: inputObj?.artifact_type,
    iteration: inputObj?.iteration,
  })

  try {
    // Authorization check
    enforceAuthorization('kb_write_artifact', context)

    const validated = KbWriteArtifactInputSchema.parse(input)

    const result = await kb_write_artifact(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_write_artifact succeeded', {
      correlation_id: correlationId,
      story_id: result.story_id,
      artifact_type: result.artifact_type,
      artifact_id: result.id,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_write_artifact failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_read_artifact tool invocation.
 *
 * Read a workflow artifact from the database.
 */
export async function handleKbReadArtifact(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_read_artifact tool invoked', {
    correlation_id: correlationId,
    story_id: inputObj?.story_id,
    artifact_type: inputObj?.artifact_type,
    iteration: inputObj?.iteration,
  })

  try {
    // Authorization check
    enforceAuthorization('kb_read_artifact', context)

    const validated = KbReadArtifactInputSchema.parse(input)

    const result = await kb_read_artifact(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_read_artifact succeeded', {
      correlation_id: correlationId,
      story_id: validated.story_id,
      artifact_type: validated.artifact_type,
      found: result !== null,
      total_time_ms: totalTimeMs,
    })

    // Return null as JSON string if not found
    if (result === null) {
      return {
        content: [
          {
            type: 'text',
            text: 'null',
          },
        ],
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_read_artifact failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

/**
 * Handle kb_list_artifacts tool invocation.
 *
 * List artifacts for a story with optional filters.
 */
export async function handleKbListArtifacts(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_list_artifacts tool invoked', {
    correlation_id: correlationId,
    story_id: inputObj?.story_id,
    phase: inputObj?.phase,
    artifact_type: inputObj?.artifact_type,
  })

  try {
    // Authorization check
    enforceAuthorization('kb_list_artifacts', context)

    const validated = KbListArtifactsInputSchema.parse(input)

    const result = await kb_list_artifacts(validated, { db: deps.db })

    const totalTimeMs = Date.now() - startTime

    logger.info('kb_list_artifacts succeeded', {
      correlation_id: correlationId,
      story_id: validated.story_id,
      count: result.total,
      total_time_ms: totalTimeMs,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const queryTimeMs = Date.now() - startTime

    logger.error('kb_list_artifacts failed', {
      correlation_id: correlationId,
      error,
      query_time_ms: queryTimeMs,
    })

    return errorToToolResult(error)
  }
}

// ============================================================================
// Story Status Handlers
// ============================================================================

/**
 * Handle kb_get_story tool invocation.
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with story or null
 */
export async function handleKbGetStory(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_get_story tool invoked', {
    correlation_id: correlationId,
    story_id: inputObj?.story_id,
  })

  try {
    enforceAuthorization('kb_get_story' as ToolName, context)
    const validated = KbGetStoryInputSchema.parse(input)
    const result = await kb_get_story({ db: deps.db }, validated)

    const queryTimeMs = Date.now() - startTime
    logger.info('kb_get_story succeeded', {
      correlation_id: correlationId,
      story_id: validated.story_id,
      found: result.story !== null,
      query_time_ms: queryTimeMs,
    })

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (error) {
    logger.error('kb_get_story failed', { correlation_id: correlationId, error })
    return errorToToolResult(error)
  }
}

/**
 * Handle kb_list_stories tool invocation.
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with stories array
 */
export async function handleKbListStories(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_list_stories tool invoked', {
    correlation_id: correlationId,
    feature: inputObj?.feature,
    state: inputObj?.state,
    phase: inputObj?.phase,
  })

  try {
    enforceAuthorization('kb_list_stories' as ToolName, context)
    const validated = KbListStoriesInputSchema.parse(input)
    const result = await kb_list_stories({ db: deps.db }, validated)

    const queryTimeMs = Date.now() - startTime
    logger.info('kb_list_stories succeeded', {
      correlation_id: correlationId,
      count: result.stories.length,
      total: result.total,
      query_time_ms: queryTimeMs,
    })

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (error) {
    logger.error('kb_list_stories failed', { correlation_id: correlationId, error })
    return errorToToolResult(error)
  }
}

/**
 * Handle kb_update_story_status tool invocation.
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with updated story
 */
export async function handleKbUpdateStoryStatus(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_update_story_status tool invoked', {
    correlation_id: correlationId,
    story_id: inputObj?.story_id,
    state: inputObj?.state,
    phase: inputObj?.phase,
  })

  try {
    enforceAuthorization('kb_update_story_status' as ToolName, context)
    const validated = KbUpdateStoryStatusInputSchema.parse(input)
    const result = await kb_update_story_status({ db: deps.db }, validated)

    const queryTimeMs = Date.now() - startTime
    logger.info('kb_update_story_status succeeded', {
      correlation_id: correlationId,
      story_id: validated.story_id,
      updated: result.updated,
      query_time_ms: queryTimeMs,
    })

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (error) {
    logger.error('kb_update_story_status failed', { correlation_id: correlationId, error })
    return errorToToolResult(error)
  }
}

/**
 * Handle kb_get_next_story tool invocation.
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with next available story
 */
export async function handleKbGetNextStory(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_get_next_story tool invoked', {
    correlation_id: correlationId,
    epic: inputObj?.epic,
    feature: inputObj?.feature,
    include_backlog: inputObj?.include_backlog,
  })

  try {
    enforceAuthorization('kb_get_next_story' as ToolName, context)
    const validated = KbGetNextStoryInputSchema.parse(input)
    const result = await kb_get_next_story({ db: deps.db }, validated)

    const queryTimeMs = Date.now() - startTime
    logger.info('kb_get_next_story succeeded', {
      correlation_id: correlationId,
      epic: validated.epic,
      found: result.story !== null,
      story_id: result.story?.storyId,
      candidates_count: result.candidates_count,
      query_time_ms: queryTimeMs,
    })

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (error) {
    logger.error('kb_get_next_story failed', { correlation_id: correlationId, error })
    return errorToToolResult(error)
  }
}

// ============================================================================
// Token Logging Handler
// ============================================================================

/**
 * Handle kb_log_tokens tool invocation.
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with logged entry ID and cumulative total
 */
export async function handleKbLogTokens(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_log_tokens tool invoked', {
    correlation_id: correlationId,
    story_id: inputObj?.story_id,
    phase: inputObj?.phase,
    input_tokens: inputObj?.input_tokens,
    output_tokens: inputObj?.output_tokens,
  })

  try {
    enforceAuthorization('kb_log_tokens' as ToolName, context)
    const validated = KbLogTokensInputSchema.parse(input)
    const result = await kb_log_tokens({ db: deps.db }, validated)

    const queryTimeMs = Date.now() - startTime
    logger.info('kb_log_tokens succeeded', {
      correlation_id: correlationId,
      story_id: validated.story_id,
      id: result.id,
      cumulative: result.cumulative,
      query_time_ms: queryTimeMs,
    })

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (error) {
    logger.error('kb_log_tokens failed', { correlation_id: correlationId, error })
    return errorToToolResult(error)
  }
}

// ============================================================================
// Analytics Handlers
// ============================================================================

/**
 * Handle kb_get_token_summary tool invocation.
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with token summary
 */
export async function handleKbGetTokenSummary(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_get_token_summary tool invoked', {
    correlation_id: correlationId,
    group_by: inputObj?.group_by,
    feature: inputObj?.feature,
  })

  try {
    enforceAuthorization('kb_get_token_summary' as ToolName, context)
    const validated = KbGetTokenSummaryInputSchema.parse(input)
    const result = await kb_get_token_summary({ db: deps.db }, validated)

    const queryTimeMs = Date.now() - startTime
    logger.info('kb_get_token_summary succeeded', {
      correlation_id: correlationId,
      group_by: validated.group_by,
      result_count: result.results.length,
      total_tokens: result.total,
      query_time_ms: queryTimeMs,
    })

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (error) {
    logger.error('kb_get_token_summary failed', { correlation_id: correlationId, error })
    return errorToToolResult(error)
  }
}

/**
 * Handle kb_get_bottleneck_analysis tool invocation.
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with bottleneck analysis
 */
export async function handleKbGetBottleneckAnalysis(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_get_bottleneck_analysis tool invoked', {
    correlation_id: correlationId,
    stuck_threshold_days: inputObj?.stuck_threshold_days,
    feature: inputObj?.feature,
  })

  try {
    enforceAuthorization('kb_get_bottleneck_analysis' as ToolName, context)
    const validated = KbGetBottleneckAnalysisInputSchema.parse(input)
    const result = await kb_get_bottleneck_analysis({ db: deps.db }, validated)

    const queryTimeMs = Date.now() - startTime
    logger.info('kb_get_bottleneck_analysis succeeded', {
      correlation_id: correlationId,
      stuck_stories_count: result.stuck_stories.length,
      phase_distribution_count: result.phase_distribution.length,
      query_time_ms: queryTimeMs,
    })

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (error) {
    logger.error('kb_get_bottleneck_analysis failed', { correlation_id: correlationId, error })
    return errorToToolResult(error)
  }
}

/**
 * Handle kb_get_churn_analysis tool invocation.
 *
 * @param input - Raw input from MCP request
 * @param deps - Database dependency
 * @param context - Tool call context with correlation ID
 * @returns MCP tool result with churn analysis
 */
export async function handleKbGetChurnAnalysis(
  input: unknown,
  deps: ToolHandlerDeps,
  context?: ToolCallContext,
): Promise<McpToolResult> {
  const startTime = Date.now()
  const correlationId = context?.correlation_id ?? 'no-correlation-id'

  const inputObj = input as Record<string, unknown>
  logger.info('kb_get_churn_analysis tool invoked', {
    correlation_id: correlationId,
    min_iterations: inputObj?.min_iterations,
    feature: inputObj?.feature,
  })

  try {
    enforceAuthorization('kb_get_churn_analysis' as ToolName, context)
    const validated = KbGetChurnAnalysisInputSchema.parse(input)
    const result = await kb_get_churn_analysis({ db: deps.db }, validated)

    const queryTimeMs = Date.now() - startTime
    logger.info('kb_get_churn_analysis succeeded', {
      correlation_id: correlationId,
      high_churn_stories_count: result.high_churn_stories.length,
      feature_averages_count: result.feature_averages.length,
      query_time_ms: queryTimeMs,
    })

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (error) {
    logger.error('kb_get_churn_analysis failed', { correlation_id: correlationId, error })
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
  // Bucket A typed entry tools (KBMEM-004)
  kb_add_decision: handleKbAddDecision,
  kb_add_constraint: handleKbAddConstraint,
  kb_add_lesson: handleKbAddLesson,
  kb_add_runbook: handleKbAddRunbook,
  // Bucket B work state tools (KBMEM-006)
  kb_get_work_state: handleKbGetWorkState,
  kb_update_work_state: handleKbUpdateWorkState,
  kb_archive_work_state: handleKbArchiveWorkState,
  // Bucket B working set sync (KBMEM-008)
  kb_sync_working_set: handleKbSyncWorkingSet,
  // Bucket B working set fallback (KBMEM-011)
  kb_generate_working_set: handleKbGenerateWorkingSet,
  // Bucket B constraint inheritance (KBMEM-016)
  kb_inherit_constraints: handleKbInheritConstraints,
  // Bucket B working set archive (KBMEM-021)
  kb_archive_working_set: handleKbArchiveWorkingSet,
  // Bucket C task tools (KBMEM-005)
  kb_add_task: handleKbAddTask,
  kb_get_task: handleKbGetTask,
  kb_update_task: handleKbUpdateTask,
  kb_list_tasks: handleKbListTasks,
  // Bucket C task triage (KBMEM-018)
  kb_triage_tasks: handleKbTriageTasks,
  // Bucket C task promotion (KBMEM-019)
  kb_promote_task: handleKbPromoteTask,
  kb_list_promotable_tasks: handleKbListPromotableTasks,
  // Bucket C stale task cleanup (KBMEM-020)
  kb_cleanup_stale_tasks: handleKbCleanupStaleTasks,
  // Deferred writes (KBMEM-022)
  kb_queue_deferred_write: handleKbQueueDeferredWrite,
  kb_list_deferred_writes: handleKbListDeferredWrites,
  kb_process_deferred_writes: handleKbProcessDeferredWrites,
  // Admin tools (KNOW-0053)
  kb_bulk_import: handleKbBulkImport,
  kb_rebuild_embeddings: handleKbRebuildEmbeddings,
  kb_stats: handleKbStats,
  kb_health: handleKbHealth,
  // Audit tools (KNOW-018)
  kb_audit_by_entry: handleKbAuditByEntry,
  kb_audit_query: handleKbAuditQuery,
  kb_audit_retention_cleanup: handleKbAuditRetentionCleanup,
  // Artifact tools (DB-first artifact storage)
  kb_write_artifact: handleKbWriteArtifact,
  kb_read_artifact: handleKbReadArtifact,
  kb_list_artifacts: handleKbListArtifacts,
  // Story status tools
  kb_get_story: handleKbGetStory,
  kb_list_stories: handleKbListStories,
  kb_update_story_status: handleKbUpdateStoryStatus,
  kb_get_next_story: handleKbGetNextStory,
  // Token logging tools
  kb_log_tokens: handleKbLogTokens,
  // Analytics tools
  kb_get_token_summary: handleKbGetTokenSummary,
  kb_get_bottleneck_analysis: handleKbGetBottleneckAnalysis,
  kb_get_churn_analysis: handleKbGetChurnAnalysis,
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
