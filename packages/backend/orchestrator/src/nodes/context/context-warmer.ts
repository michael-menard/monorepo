/**
 * context-warmer.ts
 *
 * Native LangGraph node for context cache operations.
 * Ports contextCacheGet, contextCachePut, contextCacheInvalidate MCP tool behavior.
 *
 * Operation dispatch pattern (state.cacheOperation):
 *   'get'        → retrieve cached context pack, populate contextPackContent
 *   'put'        → create or update context pack from state
 *   'invalidate' → soft/hard delete context pack(s)
 *
 * Graceful degradation: never throws on DB failure, returns null state fields.
 *
 * WINT-9090: Create contextWarmerNode and sessionManagerNode LangGraph Nodes
 *
 * @module nodes/context/context-warmer
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { SelectContextPack } from '@repo/knowledge-base'
import {
  ContextCacheGetInputSchema,
  ContextCachePutInputSchema,
  ContextCacheInvalidateInputSchema,
  type ContextCacheGetInput,
  type ContextCachePutInput,
  type ContextCacheInvalidateInput,
} from '@repo/mcp-tools/context-cache/__types__'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import type { GraphStateWithContext } from '../reality/retrieve-context.js'

// ============================================================================
// Input Schemas — re-exported from @repo/mcp-tools (AC-14: no duplication)
// ============================================================================

export const ContextWarmerGetInputSchema = ContextCacheGetInputSchema
export type ContextWarmerGetInput = ContextCacheGetInput

export const ContextWarmerPutInputSchema = ContextCachePutInputSchema
export type ContextWarmerPutInput = ContextCachePutInput

export const ContextWarmerInvalidateInputSchema = ContextCacheInvalidateInputSchema
export type ContextWarmerInvalidateInput = ContextCacheInvalidateInput

// ============================================================================
// Injectable DB function types (AC-10)
// ============================================================================

/**
 * Injectable DB function for cache get operations.
 * Used to inject a mock in tests.
 */
export type CacheGetFn = (input: ContextWarmerGetInput) => Promise<SelectContextPack | null>

/**
 * Injectable DB function for cache put operations.
 * Used to inject a mock in tests.
 */
export type CachePutFn = (input: ContextWarmerPutInput) => Promise<SelectContextPack | null>

/**
 * Injectable DB function for cache invalidation operations.
 * Used to inject a mock in tests.
 */
export type CacheInvalidateFn = (
  input: ContextWarmerInvalidateInput,
) => Promise<{ invalidatedCount: number }>

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for context warmer node configuration.
 */
export const ContextWarmerConfigSchema = z.object({
  /** Default TTL in seconds for new packs (default 7 days = 604800 seconds) */
  defaultTtl: z.number().int().positive().default(604800),
})

export type ContextWarmerConfig = z.infer<typeof ContextWarmerConfigSchema> & {
  /** Injectable DB get function (for testing — AC-10) */
  cacheGetFn?: CacheGetFn
  /** Injectable DB put function (for testing — AC-10) */
  cachePutFn?: CachePutFn
  /** Injectable DB invalidate function (for testing — AC-10) */
  cacheInvalidateFn?: CacheInvalidateFn
}

/**
 * Schema for context warmer result.
 */
export const ContextWarmerResultSchema = z.object({
  /** Operation performed */
  operation: z.enum(['get', 'put', 'invalidate']),
  /** Whether cache was hit (get only) */
  contextCacheHit: z.boolean(),
  /** Retrieved or saved context pack content */
  contextPackContent: z.record(z.unknown()).nullable(),
  /** Number of packs invalidated (invalidate only) */
  invalidatedCount: z.number().int().min(0),
  /** Error message if operation failed */
  error: z.string().nullable(),
})

export type ContextWarmerResult = z.infer<typeof ContextWarmerResultSchema>

// ============================================================================
// Extended Graph State
// ============================================================================

/**
 * Schema for extended graph state with context cache fields.
 * Extends GraphStateWithContext (from retrieve-context.ts) per AC-9.
 */
export const GraphStateWithContextCacheSchema = z.object({
  /** Operation to perform: 'get' | 'put' | 'invalidate' */
  cacheOperation: z.enum(['get', 'put', 'invalidate']).optional(),
  /** Pack type for get/put/invalidate */
  cachePackType: ContextCacheGetInputSchema.shape.packType.optional(),
  /** Pack key for get/put/invalidate */
  cachePackKey: z.string().optional(),
  /** Content to store (put only) */
  cacheContent: z.record(z.unknown()).optional(),
  /** TTL in seconds (put only) */
  cacheTtl: z.number().int().positive().optional(),
  /** Pack version (put only) */
  cacheVersion: z.number().int().optional(),
  /** olderThan date for invalidation (invalidate only) */
  cacheOlderThan: z.date().optional(),
  /** Hard delete flag (invalidate only) */
  cacheHardDelete: z.boolean().optional(),
  /** Result of context warmer operation */
  contextWarmerResult: ContextWarmerResultSchema.nullable().optional(),
  /** Whether cache was hit (convenience field) */
  contextCacheHit: z.boolean().optional(),
  /** Retrieved context pack content (convenience field) */
  contextPackContent: z.record(z.unknown()).nullable().optional(),
})

export type GraphStateWithContextCache = z.infer<typeof GraphStateWithContextCacheSchema> &
  GraphStateWithContext

// ============================================================================
// Default DB functions (dynamically loaded to avoid hard dep on @repo/db)
// ============================================================================

/**
 * Dynamically loads and calls contextCacheGet from @repo/mcp-tools or equivalent.
 * At runtime, @repo/db is available via the Lambda environment.
 */
async function defaultCacheGet(input: ContextWarmerGetInput): Promise<SelectContextPack | null> {
  const { contextCacheGet } = await import('@repo/mcp-tools/context-cache/context-cache-get.js')
  return contextCacheGet(input)
}

async function defaultCachePut(input: ContextWarmerPutInput): Promise<SelectContextPack | null> {
  const { contextCachePut } = await import('@repo/mcp-tools/context-cache/context-cache-put.js')
  return contextCachePut(input)
}

async function defaultCacheInvalidate(
  input: ContextWarmerInvalidateInput,
): Promise<{ invalidatedCount: number }> {
  const { contextCacheInvalidate } =
    await import('@repo/mcp-tools/context-cache/context-cache-invalidate.js')
  return contextCacheInvalidate(input)
}

// ============================================================================
// Node implementation
// ============================================================================

async function contextWarmerImpl(
  state: GraphStateWithContextCache,
  config: Partial<ContextWarmerConfig>,
): Promise<Partial<GraphStateWithContextCache>> {
  const operation = state.cacheOperation ?? 'get'

  // Resolve injectable functions — AC-10
  const cacheGetFn = config.cacheGetFn ?? defaultCacheGet
  const cachePutFn = config.cachePutFn ?? defaultCachePut
  const cacheInvalidateFn = config.cacheInvalidateFn ?? defaultCacheInvalidate

  if (operation === 'get') {
    if (!state.cachePackType || !state.cachePackKey) {
      logger.warn('[context-warmer] get: missing cachePackType or cachePackKey', {
        cachePackType: state.cachePackType,
        cachePackKey: state.cachePackKey,
      })
      const result: ContextWarmerResult = {
        operation: 'get',
        contextCacheHit: false,
        contextPackContent: null,
        invalidatedCount: 0,
        error: 'cachePackType and cachePackKey are required for get operation',
      }
      return { contextWarmerResult: result, contextCacheHit: false, contextPackContent: null }
    }

    try {
      const pack = await cacheGetFn({
        packType: state.cachePackType,
        packKey: state.cachePackKey,
      })

      if (!pack) {
        logger.info('[context-warmer] cache miss', {
          packType: state.cachePackType,
          packKey: state.cachePackKey,
        })
        const result: ContextWarmerResult = {
          operation: 'get',
          contextCacheHit: false,
          contextPackContent: null,
          invalidatedCount: 0,
          error: null,
        }
        return { contextWarmerResult: result, contextCacheHit: false, contextPackContent: null }
      }

      logger.info('[context-warmer] cache hit', {
        packType: state.cachePackType,
        packKey: state.cachePackKey,
        hitCount: pack.hitCount,
      })

      const content = pack.content as Record<string, unknown>
      const result: ContextWarmerResult = {
        operation: 'get',
        contextCacheHit: true,
        contextPackContent: content,
        invalidatedCount: 0,
        error: null,
      }
      return { contextWarmerResult: result, contextCacheHit: true, contextPackContent: content }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('[context-warmer] get failed', {
        error: errorMessage,
        packType: state.cachePackType,
        packKey: state.cachePackKey,
      })
      const result: ContextWarmerResult = {
        operation: 'get',
        contextCacheHit: false,
        contextPackContent: null,
        invalidatedCount: 0,
        error: errorMessage,
      }
      return { contextWarmerResult: result, contextCacheHit: false, contextPackContent: null }
    }
  }

  if (operation === 'put') {
    if (!state.cachePackType || !state.cachePackKey || !state.cacheContent) {
      logger.warn('[context-warmer] put: missing required fields', {
        cachePackType: state.cachePackType,
        cachePackKey: state.cachePackKey,
        hasContent: !!state.cacheContent,
      })
      const result: ContextWarmerResult = {
        operation: 'put',
        contextCacheHit: false,
        contextPackContent: null,
        invalidatedCount: 0,
        error: 'cachePackType, cachePackKey, and cacheContent are required for put operation',
      }
      return { contextWarmerResult: result, contextPackContent: null }
    }

    try {
      const defaultTtl = config.defaultTtl ?? 604800
      const pack = await cachePutFn({
        packType: state.cachePackType,
        packKey: state.cachePackKey,
        content: state.cacheContent,
        ttl: state.cacheTtl ?? defaultTtl,
        version: state.cacheVersion,
      })

      if (!pack) {
        const result: ContextWarmerResult = {
          operation: 'put',
          contextCacheHit: false,
          contextPackContent: null,
          invalidatedCount: 0,
          error: 'DB put returned null',
        }
        return { contextWarmerResult: result, contextPackContent: null }
      }

      logger.info('[context-warmer] cache put successful', {
        packType: state.cachePackType,
        packKey: state.cachePackKey,
        version: pack.version,
      })

      const content = pack.content as Record<string, unknown>
      const result: ContextWarmerResult = {
        operation: 'put',
        contextCacheHit: false,
        contextPackContent: content,
        invalidatedCount: 0,
        error: null,
      }
      return { contextWarmerResult: result, contextPackContent: content }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('[context-warmer] put failed', {
        error: errorMessage,
        packType: state.cachePackType,
        packKey: state.cachePackKey,
      })
      const result: ContextWarmerResult = {
        operation: 'put',
        contextCacheHit: false,
        contextPackContent: null,
        invalidatedCount: 0,
        error: errorMessage,
      }
      return { contextWarmerResult: result, contextPackContent: null }
    }
  }

  if (operation === 'invalidate') {
    try {
      const invalidateResult = await cacheInvalidateFn({
        packType: state.cachePackType,
        packKey: state.cachePackKey,
        olderThan: state.cacheOlderThan,
        hardDelete: state.cacheHardDelete ?? false,
      })

      logger.info('[context-warmer] invalidation complete', {
        invalidatedCount: invalidateResult.invalidatedCount,
        packType: state.cachePackType,
        packKey: state.cachePackKey,
      })

      const result: ContextWarmerResult = {
        operation: 'invalidate',
        contextCacheHit: false,
        contextPackContent: null,
        invalidatedCount: invalidateResult.invalidatedCount,
        error: null,
      }
      return { contextWarmerResult: result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('[context-warmer] invalidate failed', {
        error: errorMessage,
        packType: state.cachePackType,
        packKey: state.cachePackKey,
      })
      const result: ContextWarmerResult = {
        operation: 'invalidate',
        contextCacheHit: false,
        contextPackContent: null,
        invalidatedCount: 0,
        error: errorMessage,
      }
      return { contextWarmerResult: result }
    }
  }

  // Unknown operation — log and return no-op
  logger.warn('[context-warmer] unknown cacheOperation', { operation })
  const result: ContextWarmerResult = {
    operation: 'get',
    contextCacheHit: false,
    contextPackContent: null,
    invalidatedCount: 0,
    error: `Unknown operation: ${String(operation)}`,
  }
  return { contextWarmerResult: result, contextCacheHit: false, contextPackContent: null }
}

// ============================================================================
// Exported node factory functions (AC-1, AC-8)
// ============================================================================

/**
 * Context warmer node — default configuration.
 *
 * Reads cacheOperation from state and dispatches to get/put/invalidate logic.
 * Graceful degradation: never throws on DB failure, returns null state fields.
 *
 * @example
 * ```typescript
 * import { contextWarmerNode } from './nodes/context/context-warmer.js'
 *
 * // Cache get
 * const result = await contextWarmerNode({
 *   ...state,
 *   cacheOperation: 'get',
 *   cachePackType: 'codebase',
 *   cachePackKey: 'main',
 * })
 * console.log(`Cache hit: ${result.contextCacheHit}`)
 * ```
 */
export const contextWarmerNode = createToolNode(
  'context_warmer',
  async (state: GraphState): Promise<Partial<GraphStateWithContextCache>> => {
    return contextWarmerImpl(state as GraphStateWithContextCache, {})
  },
)

/**
 * Creates a context warmer node with custom configuration.
 *
 * @param config - Context warmer configuration (injectable DB functions for testing — AC-10)
 * @returns Configured node function
 *
 * @example
 * ```typescript
 * // With injectable mock DB functions for testing
 * const node = createContextWarmerNode({
 *   cacheGetFn: mockCacheGet,
 *   cachePutFn: mockCachePut,
 *   cacheInvalidateFn: mockCacheInvalidate,
 * })
 * ```
 */
export function createContextWarmerNode(config: Partial<ContextWarmerConfig> = {}) {
  return createToolNode(
    'context_warmer',
    async (state: GraphState): Promise<Partial<GraphStateWithContextCache>> => {
      return contextWarmerImpl(state as GraphStateWithContextCache, config)
    },
  )
}
