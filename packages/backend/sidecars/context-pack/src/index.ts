/**
 * Context Pack Sidecar Service — Public API
 * WINT-2020: Create Context Pack Sidecar
 *
 * Exports the core assembly function and all Zod schemas.
 * The MCP tool wrapper imports assembleContextPack directly (ARCH-001).
 */

// Core assembly function
export { assembleContextPack } from './assemble-context-pack.js'

// Types for dependency injection
export type {
  KbSearchFn,
  KbSearchResult,
  KbSearchResultEntry,
  AssembleContextPackDeps,
} from './assemble-context-pack.js'

// Schemas and types
export {
  ContextPackRoleSchema,
  ContextPackRequestSchema,
  ContextPackResponseSchema,
  ContextPackHttpResponseSchema,
  KbFactEntrySchema,
  DEFAULT_TTL,
  DEFAULT_MAX_TOKENS,
  CACHE_KEY_FORMAT,
  estimateTokens,
  type ContextPackRole,
  type ContextPackRequest,
  type ContextPackResponse,
  type ContextPackHttpResponse,
  type KbFactEntry,
} from './__types__/index.js'
