/**
 * MCP Tool Schema Definitions
 *
 * Generates MCP tool schemas from existing Zod schemas using zod-to-json-schema.
 * This ensures a single source of truth for all input validation.
 *
 * @see KNOW-0051 AC2 for tool schema requirements
 * @see KNOW-0052 for search tools (kb_search, kb_get_related)
 * @see KNOW-0053 for admin tools (kb_bulk_import, kb_rebuild_embeddings, kb_stats, kb_health)
 */

import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import {
  KbAddInputSchema,
  KbGetInputSchema,
  KbUpdateInputSchema,
  KbDeleteInputSchema,
  KbListInputSchema,
} from '../crud-operations/schemas.js'
import { SearchInputSchema, GetRelatedInputSchema } from '../search/index.js'

// ============================================================================
// Admin Tool Input Schemas (KNOW-0053)
// ============================================================================

/**
 * Entry schema for kb_bulk_import tool.
 *
 * @see KNOW-006 AC1 for entry requirements
 */
export const BulkImportEntrySchema = z.object({
  /** Knowledge content text (1-30000 characters) */
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(30000, 'Content cannot exceed 30000 characters'),

  /** Role this knowledge is relevant for */
  role: z.enum(['pm', 'dev', 'qa', 'all']),

  /** Optional tags for categorization (max 50 tags) */
  tags: z.array(z.string()).max(50).optional(),

  /** Source file path for traceability */
  source_file: z.string().optional(),
})

/**
 * Input schema for kb_bulk_import tool.
 *
 * @see KNOW-006 AC3 for bulk import requirements
 */
export const KbBulkImportInputSchema = z.object({
  /** Array of entries to import (max 1000) */
  entries: z
    .array(BulkImportEntrySchema)
    .max(1000, 'Cannot import more than 1000 entries per call'),

  /** Dry run mode - validates without writing to database */
  dry_run: z.boolean().optional().default(false),

  /** Validate only mode - validates structure without generating embeddings */
  validate_only: z.boolean().optional().default(false),
})
export type KbBulkImportInput = z.infer<typeof KbBulkImportInputSchema>

/**
 * Input schema for kb_rebuild_embeddings tool.
 *
 * Supports both full rebuild (force: true) and incremental rebuild (force: false).
 *
 * @see KNOW-007 AC1-AC4 for implementation requirements
 */
export const KbRebuildEmbeddingsInputSchema = z.object({
  /** Force full rebuild, regenerating all embeddings (default: false for incremental) */
  force: z.boolean().optional().default(false),

  /** Batch size for processing (default: 50, min: 1, max: 1000) */
  batch_size: z
    .number()
    .int()
    .min(1, 'batch_size must be at least 1')
    .max(1000, 'batch_size cannot exceed 1000')
    .optional()
    .default(50),

  /** Optional array of entry IDs to rebuild. If omitted, rebuilds all entries. */
  entry_ids: z.array(z.string().uuid()).optional(),

  /** Dry run mode - estimate cost without actually rebuilding */
  dry_run: z.boolean().optional().default(false),
})
export type KbRebuildEmbeddingsInput = z.infer<typeof KbRebuildEmbeddingsInputSchema>

/**
 * Input schema for kb_stats tool.
 *
 * @see KNOW-0053 AC3 for implementation requirements
 */
export const KbStatsInputSchema = z.object({}).optional()
export type KbStatsInput = z.infer<typeof KbStatsInputSchema>

/**
 * Input schema for kb_health tool.
 *
 * @see KNOW-0053 AC4 for implementation requirements
 */
export const KbHealthInputSchema = z.object({}).optional()
export type KbHealthInput = z.infer<typeof KbHealthInputSchema>

/**
 * MCP Tool definition interface.
 */
export interface McpToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

/**
 * Tool schema versioning policy:
 * - Patch: Description/documentation changes only
 * - Minor: New optional fields added
 * - Major: Breaking changes (required field changes, type changes)
 *
 * Current version: 1.0.0
 */
export const TOOL_SCHEMA_VERSION = '1.0.0'

/**
 * Convert Zod schema to MCP-compatible JSON Schema.
 * Removes $schema property as MCP SDK handles schema version.
 */
function zodToMcpSchema(zodSchema: unknown): Record<string, unknown> {
  const jsonSchema = zodToJsonSchema(zodSchema as Parameters<typeof zodToJsonSchema>[0], {
    // Use draft-07 for compatibility
    $refStrategy: 'none',
    // Don't include $schema property
    target: 'jsonSchema7',
  })

  // Remove $schema property if present
  if (typeof jsonSchema === 'object' && jsonSchema !== null) {
    const schemaObj = jsonSchema as Record<string, unknown>
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { $schema, ...rest } = schemaObj
    return rest
  }

  return jsonSchema as Record<string, unknown>
}

/**
 * kb_add tool definition.
 *
 * Adds a new knowledge entry with automatic embedding generation.
 */
export const kbAddToolDefinition: McpToolDefinition = {
  name: 'kb_add',
  description: `Add a new knowledge entry to the knowledge base.

The entry will automatically have an embedding generated for semantic search.

Parameters:
- content (required): The knowledge content text (1-30000 characters)
- role (required): The role this knowledge is relevant for ('pm', 'dev', 'qa', or 'all')
- tags (optional): Array of tags for categorization

Returns: UUID string of the created entry

Example:
{
  "content": "Always use Zod schemas for runtime validation in TypeScript",
  "role": "dev",
  "tags": ["typescript", "best-practice", "validation"]
}`,
  inputSchema: zodToMcpSchema(KbAddInputSchema),
}

/**
 * kb_get tool definition.
 *
 * Retrieves a knowledge entry by ID.
 */
export const kbGetToolDefinition: McpToolDefinition = {
  name: 'kb_get',
  description: `Retrieve a knowledge entry by its ID.

Returns the full entry including content, role, tags, and timestamps.
Returns null if the entry does not exist (not an error).

Parameters:
- id (required): UUID of the knowledge entry to retrieve

Returns: Full knowledge entry object or null

Example:
{
  "id": "123e4567-e89b-12d3-a456-426614174000"
}`,
  inputSchema: zodToMcpSchema(KbGetInputSchema),
}

/**
 * kb_update tool definition.
 *
 * Updates an existing knowledge entry.
 */
export const kbUpdateToolDefinition: McpToolDefinition = {
  name: 'kb_update',
  description: `Update an existing knowledge entry.

At least one field (content, role, or tags) must be provided.
If content is updated and differs from existing content, a new embedding is generated.

Parameters:
- id (required): UUID of the knowledge entry to update
- content (optional): New content text (triggers re-embedding if different)
- role (optional): New role ('pm', 'dev', 'qa', or 'all')
- tags (optional): New tags array (null clears tags, undefined leaves unchanged)

Returns: Updated knowledge entry object

Throws: NOT_FOUND error if entry does not exist

Example (update content):
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "content": "Updated best practice content"
}

Example (update tags only):
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "tags": ["new-tag"]
}`,
  inputSchema: zodToMcpSchema(KbUpdateInputSchema),
}

/**
 * kb_delete tool definition.
 *
 * Deletes a knowledge entry by ID.
 */
export const kbDeleteToolDefinition: McpToolDefinition = {
  name: 'kb_delete',
  description: `Delete a knowledge entry by its ID.

This operation is idempotent: deleting a non-existent entry succeeds without error.

Parameters:
- id (required): UUID of the knowledge entry to delete

Returns: void (no content)

Example:
{
  "id": "123e4567-e89b-12d3-a456-426614174000"
}`,
  inputSchema: zodToMcpSchema(KbDeleteInputSchema),
}

/**
 * kb_list tool definition.
 *
 * Lists knowledge entries with optional filters.
 */
export const kbListToolDefinition: McpToolDefinition = {
  name: 'kb_list',
  description: `List knowledge entries with optional filtering.

Returns entries ordered by creation date (newest first).

Parameters:
- role (optional): Filter by role ('pm', 'dev', 'qa', or 'all')
- tags (optional): Filter by tags (entries with ANY matching tag are returned)
- limit (optional): Maximum number of results (1-100, default 10)

Returns: Array of knowledge entries (may be empty)

Example (list all):
{}

Example (list dev entries):
{
  "role": "dev",
  "limit": 20
}

Example (list entries with specific tags):
{
  "tags": ["typescript", "best-practice"],
  "limit": 50
}`,
  inputSchema: zodToMcpSchema(KbListInputSchema),
}

/**
 * kb_search tool definition.
 *
 * Hybrid semantic + keyword search with RRF merging.
 *
 * @see KNOW-0052 AC1 for kb_search requirements
 */
export const kbSearchToolDefinition: McpToolDefinition = {
  name: 'kb_search',
  description: `Search the knowledge base using hybrid semantic + keyword search.

Uses vector similarity (pgvector) combined with PostgreSQL full-text search,
merged using Reciprocal Rank Fusion (RRF) for optimal relevance ranking.

Gracefully falls back to keyword-only search when OpenAI API is unavailable.
Check metadata.fallback_mode to detect when fallback is active.

Parameters:
- query (required): Natural language search query (1+ characters)
- role (optional): Filter by role ('pm', 'dev', 'qa', or 'all')
- tags (optional): Filter by tags (entries with ANY matching tag are returned)
- entry_type (optional): Filter by entry type ('fact', 'summary', or 'template')
- limit (optional): Maximum number of results (1-50, default 10)
- min_confidence (optional): Minimum relevance threshold (0-1, default 0)
- explain (optional): Include debug timing info in response

Returns: Object with results array and metadata (total, fallback_mode, query_time_ms, correlation_id)

Note: Maximum 50 results per query. Refine query for more specific results.

Example (basic search):
{
  "query": "How to order routes in vercel.json"
}

Example (filtered search):
{
  "query": "validation best practices",
  "role": "dev",
  "tags": ["typescript"],
  "limit": 20
}`,
  inputSchema: zodToMcpSchema(SearchInputSchema),
}

/**
 * kb_get_related tool definition.
 *
 * Find entries related to a specific entry.
 *
 * @see KNOW-0052 AC2 for kb_get_related requirements
 */
export const kbGetRelatedToolDefinition: McpToolDefinition = {
  name: 'kb_get_related',
  description: `Find entries related to a specific knowledge entry.

Finds related entries via:
1. Parent entry (if entry has a parent_id)
2. Sibling entries (entries with the same parent_id)
3. Tag overlap entries (entries with 2+ shared tags)

Results are ordered by relationship priority: parent > sibling > tag_overlap.
Returns empty array if entry not found (not an error).

Parameters:
- entry_id (required): UUID of the entry to find related entries for
- limit (optional): Maximum number of results (1-20, default 5)

Returns: Object with results array and metadata (total, relationship_types, correlation_id)

Example:
{
  "entry_id": "123e4567-e89b-12d3-a456-426614174000",
  "limit": 10
}`,
  inputSchema: zodToMcpSchema(GetRelatedInputSchema),
}

// ============================================================================
// Admin Tool Definitions (KNOW-0053)
// ============================================================================

/**
 * kb_bulk_import tool definition.
 *
 * Bulk import knowledge entries with batch processing.
 *
 * @see KNOW-006 AC3, AC4 for bulk import requirements
 */
export const kbBulkImportToolDefinition: McpToolDefinition = {
  name: 'kb_bulk_import',
  description: `Bulk import knowledge entries to the knowledge base.

Imports multiple entries with automatic embedding generation using batch processing.
Supports dry-run mode for validation without writes.

Parameters:
- entries (required): Array of entries to import (max 1000 per call)
  - content (required): Knowledge content text (1-30000 characters)
  - role (required): Role ('pm', 'dev', 'qa', or 'all')
  - tags (optional): Array of tags (max 50 per entry)
  - source_file (optional): Source file path for traceability
- dry_run (optional): If true, validates without writing (default: false)
- validate_only (optional): If true, validates structure without generating embeddings (default: false)

Returns: Import summary with counts and errors
{
  "total": 100,
  "succeeded": 95,
  "failed": 5,
  "errors": [{ "index": 0, "reason": "..." }],
  "duration_ms": 5000,
  "estimated_cost_usd": 0.02
}

Performance: <5 seconds per 10 entries including embedding generation.

Example (basic import):
{
  "entries": [
    { "content": "Knowledge fact 1", "role": "dev", "tags": ["pattern"] },
    { "content": "Knowledge fact 2", "role": "all" }
  ]
}

Example (dry run):
{
  "entries": [...],
  "dry_run": true
}`,
  inputSchema: zodToMcpSchema(KbBulkImportInputSchema),
}

/**
 * kb_rebuild_embeddings tool definition.
 *
 * Full implementation for batch rebuilding embeddings.
 *
 * @see KNOW-007 AC1-AC4 for implementation requirements
 */
export const kbRebuildEmbeddingsToolDefinition: McpToolDefinition = {
  name: 'kb_rebuild_embeddings',
  description: `Rebuild embeddings for knowledge entries.

Supports two modes:
- Incremental (default): Only rebuild entries missing from cache
- Full rebuild (force: true): Regenerate all embeddings

Use cases:
- Model upgrade: Set force=true to regenerate with new model
- Cache corruption: Set force=true for full rebuild
- Routine maintenance: Use default (force=false) to catch gaps

Parameters:
- force (optional): Force full rebuild (default: false for incremental)
- batch_size (optional): Entries per batch (default: 50, min: 1, max: 1000)
- entry_ids (optional): Array of entry UUIDs to rebuild. If omitted, processes all entries.
- dry_run (optional): Estimate cost without rebuilding (default: false)

Returns: Rebuild summary with statistics
{
  "total_entries": 500,
  "rebuilt": 50,
  "skipped": 450,
  "failed": 0,
  "errors": [],
  "duration_ms": 15000,
  "estimated_cost_usd": 0.00015,
  "entries_per_second": 3.33,
  "dry_run": false
}

Performance: ~0.3s per entry including embedding generation.

Example (incremental rebuild - default):
{}

Example (full rebuild):
{
  "force": true,
  "batch_size": 100
}

Example (rebuild specific entries):
{
  "entry_ids": ["123e4567-e89b-12d3-a456-426614174000"],
  "force": true
}

Example (dry run to estimate cost):
{
  "force": true,
  "dry_run": true
}`,
  inputSchema: zodToMcpSchema(KbRebuildEmbeddingsInputSchema),
}

/**
 * kb_stats tool definition.
 *
 * Basic implementation: Database queries for statistics.
 *
 * @see KNOW-0053 AC3 for implementation requirements
 */
export const kbStatsToolDefinition: McpToolDefinition = {
  name: 'kb_stats',
  description: `Get knowledge base statistics.

Returns aggregate statistics about the knowledge base including:
- Total entry count
- Breakdown by role (pm, dev, qa, all)
- Breakdown by entry type (if column exists)
- Top 10 most common tags

Performance target: < 1s for datasets up to 10,000 entries.

Parameters: None

Returns: Statistics object with counts and breakdowns

Example:
{}

Response:
{
  "total_entries": 150,
  "by_role": { "pm": 40, "dev": 60, "qa": 30, "all": 20 },
  "top_tags": [{ "tag": "validation", "count": 25 }, ...]
}`,
  inputSchema: zodToMcpSchema(KbStatsInputSchema),
}

/**
 * kb_health tool definition.
 *
 * Full implementation: Health checks for all subsystems.
 *
 * @see KNOW-0053 AC4 for implementation requirements
 */
export const kbHealthToolDefinition: McpToolDefinition = {
  name: 'kb_health',
  description: `Get MCP server health status.

Performs health checks on:
- Database connectivity (SELECT 1 query)
- OpenAI API availability (env check + optional ping)
- MCP server status (uptime, version)

Status values:
- "healthy": All checks pass
- "degraded": Some checks fail (non-critical)
- "unhealthy": Critical checks fail (database)

Latency thresholds:
- Database: <50ms healthy, 50-200ms degraded, >200ms unhealthy
- OpenAI: <500ms healthy, 500-2000ms degraded, >2000ms unhealthy

Performance target: < 500ms total.

Parameters: None

Returns: Health status object with individual check results

Example:
{}

Response:
{
  "status": "healthy",
  "checks": {
    "db": { "status": "pass", "latency_ms": 5 },
    "openai_api": { "status": "pass", "latency_ms": 200 },
    "mcp_server": { "status": "pass", "uptime_ms": 3600000 }
  },
  "uptime_ms": 3600000,
  "version": "1.0.0"
}`,
  inputSchema: zodToMcpSchema(KbHealthInputSchema),
}

// ============================================================================
// Audit Tool Definitions (KNOW-018)
// ============================================================================

/**
 * Input schema for kb_audit_by_entry tool.
 *
 * @see KNOW-018 AC6 for query by entry requirements
 */
export const KbAuditByEntryInputSchema = z.object({
  /** UUID of the entry to query audit logs for */
  entry_id: z.string().uuid(),

  /** Maximum number of results (default 100, max 1000) */
  limit: z.number().int().min(1).max(1000).optional().default(100),

  /** Number of results to skip (default 0) */
  offset: z.number().int().min(0).optional().default(0),
})
export type KbAuditByEntryInput = z.infer<typeof KbAuditByEntryInputSchema>

/**
 * Input schema for kb_audit_query tool.
 *
 * @see KNOW-018 AC7-AC8 for time range and filter requirements
 */
export const KbAuditQueryInputSchema = z
  .object({
    /** Start of time range (ISO 8601) */
    start_date: z.coerce.date(),

    /** End of time range (ISO 8601) */
    end_date: z.coerce.date(),

    /** Filter by operation type (optional) */
    operation: z.enum(['add', 'update', 'delete']).optional(),

    /** Maximum number of results (default 100, max 1000) */
    limit: z.number().int().min(1).max(1000).optional().default(100),

    /** Number of results to skip (default 0) */
    offset: z.number().int().min(0).optional().default(0),
  })
  .refine(data => data.end_date >= data.start_date, {
    message: 'end_date must be after start_date',
    path: ['end_date'],
  })
export type KbAuditQueryInput = z.infer<typeof KbAuditQueryInputSchema>

/**
 * Input schema for kb_audit_retention_cleanup tool.
 *
 * @see KNOW-018 AC9-AC10 for retention requirements
 */
export const KbAuditRetentionInputSchema = z.object({
  /** Delete logs older than this many days (default 90, min 1) */
  retention_days: z.number().int().min(1).optional().default(90),

  /** If true, report count without deleting (default false) */
  dry_run: z.boolean().optional().default(false),
})
export type KbAuditRetentionInput = z.infer<typeof KbAuditRetentionInputSchema>

/**
 * kb_audit_by_entry tool definition.
 *
 * Query audit logs for a specific knowledge entry.
 *
 * @see KNOW-018 AC6 for query by entry requirements
 */
export const kbAuditByEntryToolDefinition: McpToolDefinition = {
  name: 'kb_audit_by_entry',
  description: `Get full audit history for a specific knowledge base entry.

Returns all audit events for the specified entry, sorted by timestamp (oldest first).
Use this to trace the complete history of changes to an entry.

Parameters:
- entry_id (required): UUID of the entry to query audit logs for
- limit (optional): Maximum results to return (default 100, max 1000)
- offset (optional): Number of results to skip for pagination (default 0)

Returns: Object with results array and metadata
{
  "results": [
    {
      "id": "audit-uuid",
      "entry_id": "entry-uuid",
      "operation": "add|update|delete",
      "previous_value": {...} | null,
      "new_value": {...} | null,
      "timestamp": "2026-01-25T10:30:00Z",
      "user_context": {...} | null
    }
  ],
  "metadata": {
    "total": 5,
    "limit": 100,
    "offset": 0,
    "correlation_id": "..."
  }
}

Example:
{
  "entry_id": "123e4567-e89b-12d3-a456-426614174000"
}

Example with pagination:
{
  "entry_id": "123e4567-e89b-12d3-a456-426614174000",
  "limit": 10,
  "offset": 20
}`,
  inputSchema: zodToMcpSchema(KbAuditByEntryInputSchema),
}

/**
 * kb_audit_query tool definition.
 *
 * Query audit logs by time range with optional filters.
 *
 * @see KNOW-018 AC7-AC8 for time range and filter requirements
 */
export const kbAuditQueryToolDefinition: McpToolDefinition = {
  name: 'kb_audit_query',
  description: `Query audit logs by time range and optional filters.

Returns audit events within the specified date range, sorted by timestamp (newest first).
Use this for compliance reporting, security investigations, or usage analysis.

Parameters:
- start_date (required): Start of time range (ISO 8601 format)
- end_date (required): End of time range (ISO 8601 format, must be after start_date)
- operation (optional): Filter by operation type ('add', 'update', or 'delete')
- limit (optional): Maximum results to return (default 100, max 1000)
- offset (optional): Number of results to skip for pagination (default 0)

Returns: Object with results array and metadata
{
  "results": [...],
  "metadata": {
    "total": 150,
    "limit": 100,
    "offset": 0,
    "correlation_id": "..."
  }
}

Example (query January 2026):
{
  "start_date": "2026-01-01T00:00:00Z",
  "end_date": "2026-01-31T23:59:59Z"
}

Example (filter by operation type):
{
  "start_date": "2026-01-01T00:00:00Z",
  "end_date": "2026-01-31T23:59:59Z",
  "operation": "delete"
}`,
  inputSchema: zodToMcpSchema(KbAuditQueryInputSchema),
}

/**
 * kb_audit_retention_cleanup tool definition.
 *
 * Manually trigger retention policy cleanup.
 *
 * @see KNOW-018 AC9-AC10 for retention requirements
 */
export const kbAuditRetentionToolDefinition: McpToolDefinition = {
  name: 'kb_audit_retention_cleanup',
  description: `Manually trigger audit log retention policy cleanup (admin tool).

Deletes audit log entries older than the specified retention period.
Uses batch deletion (10k rows at a time) to avoid long table locks.

Parameters:
- retention_days (optional): Delete logs older than this many days (default 90, min 1)
- dry_run (optional): If true, report count without deleting (default false)

Returns: Cleanup result with statistics
{
  "deleted_count": 5000,
  "retention_days": 90,
  "cutoff_date": "2025-10-24T00:00:00Z",
  "dry_run": false,
  "duration_ms": 2500,
  "batches_processed": 1,
  "correlation_id": "..."
}

Example (dry run to see count):
{
  "dry_run": true
}

Example (cleanup with custom retention):
{
  "retention_days": 30
}

Example (default cleanup):
{}`,
  inputSchema: zodToMcpSchema(KbAuditRetentionInputSchema),
}

/**
 * All MCP tool definitions.
 */
export const toolDefinitions: McpToolDefinition[] = [
  kbAddToolDefinition,
  kbGetToolDefinition,
  kbUpdateToolDefinition,
  kbDeleteToolDefinition,
  kbListToolDefinition,
  kbSearchToolDefinition,
  kbGetRelatedToolDefinition,
  // Admin tools (KNOW-0053)
  kbBulkImportToolDefinition,
  kbRebuildEmbeddingsToolDefinition,
  kbStatsToolDefinition,
  kbHealthToolDefinition,
  // Audit tools (KNOW-018)
  kbAuditByEntryToolDefinition,
  kbAuditQueryToolDefinition,
  kbAuditRetentionToolDefinition,
]

/**
 * Get all tool definitions for MCP ListToolsRequest.
 */
export function getToolDefinitions(): McpToolDefinition[] {
  return toolDefinitions
}

/**
 * Get a specific tool definition by name.
 */
export function getToolDefinition(name: string): McpToolDefinition | undefined {
  return toolDefinitions.find(tool => tool.name === name)
}

/**
 * Get all tool names.
 */
export function getToolNames(): string[] {
  return toolDefinitions.map(tool => tool.name)
}
