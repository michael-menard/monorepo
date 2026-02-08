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
import {
  KbGetStoryInputSchema,
  KbListStoriesInputSchema,
  KbUpdateStoryStatusInputSchema,
  KbGetNextStoryInputSchema,
  type KbGetStoryInput,
  type KbListStoriesInput,
  type KbUpdateStoryStatusInput,
  type KbGetNextStoryInput,
} from '../crud-operations/story-crud-operations.js'
import {
  KbLogTokensInputSchema,
  type KbLogTokensInput,
} from '../crud-operations/token-operations.js'
import {
  KbGetTokenSummaryInputSchema,
  KbGetBottleneckAnalysisInputSchema,
  KbGetChurnAnalysisInputSchema,
  type KbGetTokenSummaryInput,
  type KbGetBottleneckAnalysisInput,
  type KbGetChurnAnalysisInput,
} from '../crud-operations/analytics-operations.js'
// Re-export schemas and types for external use
export {
  KbGetStoryInputSchema,
  KbListStoriesInputSchema,
  KbUpdateStoryStatusInputSchema,
  KbGetNextStoryInputSchema,
  KbLogTokensInputSchema,
  KbGetTokenSummaryInputSchema,
  KbGetBottleneckAnalysisInputSchema,
  KbGetChurnAnalysisInputSchema,
}
export type {
  KbGetStoryInput,
  KbListStoriesInput,
  KbUpdateStoryStatusInput,
  KbGetNextStoryInput,
  KbLogTokensInput,
  KbGetTokenSummaryInput,
  KbGetBottleneckAnalysisInput,
  KbGetChurnAnalysisInput,
}

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
- entry_type (optional): Type of entry ('note', 'decision', 'constraint', 'runbook', 'lesson'). Default: 'note'
- story_id (optional): Story ID this entry is linked to (e.g., 'WISH-2045')
- tags (optional): Array of tags for categorization

Returns: UUID string of the created entry

Example (basic note):
{
  "content": "Always use Zod schemas for runtime validation in TypeScript",
  "role": "dev",
  "tags": ["typescript", "best-practice", "validation"]
}

Example (decision with story link):
{
  "content": "# Decision: Use server-side image processing\\n\\n## Context\\nClient-side processing is too slow...\\n\\n## Decision\\nProcess images on the server using Sharp.",
  "role": "dev",
  "entry_type": "decision",
  "story_id": "WISH-2045",
  "tags": ["architecture", "images", "adr"]
}

Example (lesson learned):
{
  "content": "# Lesson: HEIC orientation metadata\\n\\n## What happened\\nImages displayed rotated...\\n\\n## Resolution\\nPreserve EXIF orientation during conversion.",
  "role": "dev",
  "entry_type": "lesson",
  "story_id": "WISH-2045",
  "tags": ["images", "heic", "lesson"]
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
- entry_type (optional): Filter by entry type ('note', 'decision', 'constraint', 'runbook', 'lesson')
- story_id (optional): Filter by story ID (e.g., 'WISH-2045')
- tags (optional): Filter by tags (entries with ANY matching tag are returned)
- verified (optional): Filter by verification status (true/false)
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
}

Example (list all decisions):
{
  "entry_type": "decision"
}

Example (list constraints for a story):
{
  "entry_type": "constraint",
  "story_id": "WISH-2045"
}

Example (list unverified entries):
{
  "verified": false,
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
- entry_type (optional): Filter by entry type ('note', 'decision', 'constraint', 'runbook', 'lesson')
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
}

Example (search for decisions):
{
  "query": "image processing architecture",
  "entry_type": "decision",
  "role": "dev"
}

Example (search for constraints):
{
  "query": "project constraints",
  "entry_type": "constraint"
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
// Bucket A Typed Entry Tools (KBMEM-004)
// ============================================================================

/**
 * Input schema for kb_add_decision tool.
 *
 * Creates a well-structured decision/ADR entry with optimal embedding content.
 *
 * @see KBMEM-004 for implementation requirements
 */
export const KbAddDecisionInputSchema = z.object({
  /** Title of the decision (e.g., "Use server-side image processing") */
  title: z.string().min(1, 'Title cannot be empty').max(200, 'Title cannot exceed 200 characters'),

  /** Context: What is the issue or problem being addressed? */
  context: z
    .string()
    .min(1, 'Context cannot be empty')
    .max(5000, 'Context cannot exceed 5000 characters'),

  /** Decision: What was decided? */
  decision: z
    .string()
    .min(1, 'Decision cannot be empty')
    .max(5000, 'Decision cannot exceed 5000 characters'),

  /** Consequences: What are the positive and negative outcomes? (optional) */
  consequences: z.string().max(5000, 'Consequences cannot exceed 5000 characters').optional(),

  /** Role this decision is relevant for */
  role: z.enum(['pm', 'dev', 'qa', 'all']).default('dev'),

  /** Optional story ID this decision is linked to */
  story_id: z.string().optional().nullable(),

  /** Optional tags for categorization (auto-adds 'adr', 'decision') */
  tags: z.array(z.string()).optional(),
})
export type KbAddDecisionInput = z.infer<typeof KbAddDecisionInputSchema>

/**
 * Input schema for kb_add_constraint tool.
 *
 * Creates a constraint entry with scope and rationale.
 *
 * @see KBMEM-004 for implementation requirements
 */
export const KbAddConstraintInputSchema = z.object({
  /** The constraint text (e.g., "Always use Zod schemas for types") */
  constraint: z
    .string()
    .min(1, 'Constraint cannot be empty')
    .max(2000, 'Constraint cannot exceed 2000 characters'),

  /** Why this constraint exists */
  rationale: z
    .string()
    .min(1, 'Rationale cannot be empty')
    .max(3000, 'Rationale cannot exceed 3000 characters'),

  /** Scope of the constraint */
  scope: z.enum(['project', 'epic', 'story']).default('project'),

  /** Source of the constraint (e.g., "CLAUDE.md", "ADR-001") */
  source: z.string().max(200, 'Source cannot exceed 200 characters').optional(),

  /** Role this constraint is relevant for */
  role: z.enum(['pm', 'dev', 'qa', 'all']).default('all'),

  /** Optional story ID this constraint is linked to (required if scope is 'story') */
  story_id: z.string().optional().nullable(),

  /** Optional tags for categorization (auto-adds 'constraint', scope) */
  tags: z.array(z.string()).optional(),
})
export type KbAddConstraintInput = z.infer<typeof KbAddConstraintInputSchema>

/**
 * Input schema for kb_add_lesson tool.
 *
 * Creates a lessons learned entry with structured format.
 *
 * @see KBMEM-004 for implementation requirements
 */
export const KbAddLessonInputSchema = z.object({
  /** Title of the lesson (e.g., "HEIC orientation metadata must be preserved") */
  title: z.string().min(1, 'Title cannot be empty').max(200, 'Title cannot exceed 200 characters'),

  /** What happened - the situation or problem encountered */
  what_happened: z
    .string()
    .min(1, 'What happened cannot be empty')
    .max(3000, 'What happened cannot exceed 3000 characters'),

  /** Why it happened - root cause analysis */
  why: z.string().max(3000, 'Why cannot exceed 3000 characters').optional(),

  /** How it was resolved */
  resolution: z
    .string()
    .min(1, 'Resolution cannot be empty')
    .max(3000, 'Resolution cannot exceed 3000 characters'),

  /** Category of the lesson */
  category: z
    .enum([
      'edge-cases',
      'performance',
      'security',
      'testing',
      'architecture',
      'workflow',
      'tooling',
      'other',
    ])
    .default('other'),

  /** Role this lesson is relevant for */
  role: z.enum(['pm', 'dev', 'qa', 'all']).default('dev'),

  /** Optional story ID this lesson came from */
  story_id: z.string().optional().nullable(),

  /** Optional tags for categorization (auto-adds 'lesson', category) */
  tags: z.array(z.string()).optional(),
})
export type KbAddLessonInput = z.infer<typeof KbAddLessonInputSchema>

/**
 * Input schema for kb_add_runbook tool.
 *
 * Creates a runbook/procedure entry with steps.
 *
 * @see KBMEM-004 for implementation requirements
 */
export const KbAddRunbookInputSchema = z.object({
  /** Title of the runbook (e.g., "Database migration procedure") */
  title: z.string().min(1, 'Title cannot be empty').max(200, 'Title cannot exceed 200 characters'),

  /** Purpose/description of the runbook */
  purpose: z
    .string()
    .min(1, 'Purpose cannot be empty')
    .max(2000, 'Purpose cannot exceed 2000 characters'),

  /** Prerequisites (optional) */
  prerequisites: z.array(z.string().max(500)).optional(),

  /** Steps to follow */
  steps: z.array(z.string().max(1000)).min(1, 'At least one step is required'),

  /** Notes or warnings (optional) */
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional(),

  /** Role this runbook is relevant for */
  role: z.enum(['pm', 'dev', 'qa', 'all']).default('dev'),

  /** Optional story ID this runbook is linked to */
  story_id: z.string().optional().nullable(),

  /** Optional tags for categorization (auto-adds 'runbook', 'procedure') */
  tags: z.array(z.string()).optional(),
})
export type KbAddRunbookInput = z.infer<typeof KbAddRunbookInputSchema>

/**
 * kb_add_decision tool definition.
 *
 * Creates an Architecture Decision Record (ADR) entry.
 */
export const kbAddDecisionToolDefinition: McpToolDefinition = {
  name: 'kb_add_decision',
  description: `Add an Architecture Decision Record (ADR) to the knowledge base.

Creates a well-structured decision entry with optimal embedding for semantic search.
Content is auto-formatted as a markdown ADR with Context, Decision, and Consequences sections.

Parameters:
- title (required): Title of the decision (max 200 chars)
- context (required): What is the issue or problem being addressed? (max 5000 chars)
- decision (required): What was decided? (max 5000 chars)
- consequences (optional): What are the positive/negative outcomes? (max 5000 chars)
- role (optional): Role this is relevant for (default: 'dev')
- story_id (optional): Story ID this decision is linked to
- tags (optional): Additional tags (auto-adds 'adr', 'decision')

Returns: UUID string of the created entry

Example:
{
  "title": "Use server-side image processing for HEIC conversion",
  "context": "Client-side HEIC conversion using JavaScript libraries is too slow, taking 5-10 seconds per image on mobile devices.",
  "decision": "Process HEIC images on the server using Sharp library with libvips backend.",
  "consequences": "Faster conversion (<1s), but increases server load and bandwidth costs.",
  "story_id": "WISH-2045",
  "tags": ["images", "performance"]
}`,
  inputSchema: zodToMcpSchema(KbAddDecisionInputSchema),
}

/**
 * kb_add_constraint tool definition.
 *
 * Creates a constraint entry with scope.
 */
export const kbAddConstraintToolDefinition: McpToolDefinition = {
  name: 'kb_add_constraint',
  description: `Add a constraint to the knowledge base.

Creates a constraint entry with scope and rationale. Constraints are rules that must be followed
at the project, epic, or story level.

Parameters:
- constraint (required): The constraint text (max 2000 chars)
- rationale (required): Why this constraint exists (max 3000 chars)
- scope (optional): 'project', 'epic', or 'story' (default: 'project')
- source (optional): Source of constraint (e.g., 'CLAUDE.md', 'ADR-001')
- role (optional): Role this is relevant for (default: 'all')
- story_id (optional): Story ID if scope is 'story'
- tags (optional): Additional tags (auto-adds 'constraint', scope)

Returns: UUID string of the created entry

Example (project constraint):
{
  "constraint": "Always use Zod schemas for runtime type validation",
  "rationale": "Provides runtime validation and automatic TypeScript type inference from a single source of truth",
  "scope": "project",
  "source": "CLAUDE.md"
}

Example (story constraint):
{
  "constraint": "HEIC conversion must preserve EXIF orientation",
  "rationale": "Without EXIF preservation, images display rotated on some devices",
  "scope": "story",
  "story_id": "WISH-2045",
  "source": "QA finding"
}`,
  inputSchema: zodToMcpSchema(KbAddConstraintInputSchema),
}

/**
 * kb_add_lesson tool definition.
 *
 * Creates a lessons learned entry.
 */
export const kbAddLessonToolDefinition: McpToolDefinition = {
  name: 'kb_add_lesson',
  description: `Add a lessons learned entry to the knowledge base.

Creates a structured lesson entry capturing what happened, why, and how it was resolved.
Useful for capturing edge cases, debugging insights, and team knowledge.

Parameters:
- title (required): Title of the lesson (max 200 chars)
- what_happened (required): The situation or problem encountered (max 3000 chars)
- why (optional): Root cause analysis (max 3000 chars)
- resolution (required): How it was resolved (max 3000 chars)
- category (optional): 'edge-cases', 'performance', 'security', 'testing', 'architecture', 'workflow', 'tooling', 'other' (default: 'other')
- role (optional): Role this is relevant for (default: 'dev')
- story_id (optional): Story ID this lesson came from
- tags (optional): Additional tags (auto-adds 'lesson', category)

Returns: UUID string of the created entry

Example:
{
  "title": "HEIC images display rotated after conversion",
  "what_happened": "Users reported that some HEIC images appeared rotated 90 degrees after upload and conversion to JPEG.",
  "why": "Sharp library was stripping EXIF orientation metadata during conversion by default.",
  "resolution": "Added rotate() call before conversion to apply EXIF orientation, then strip metadata.",
  "category": "edge-cases",
  "story_id": "WISH-2045"
}`,
  inputSchema: zodToMcpSchema(KbAddLessonInputSchema),
}

/**
 * kb_add_runbook tool definition.
 *
 * Creates a runbook/procedure entry.
 */
export const kbAddRunbookToolDefinition: McpToolDefinition = {
  name: 'kb_add_runbook',
  description: `Add a runbook/procedure to the knowledge base.

Creates a step-by-step procedure entry for operational tasks.
Useful for documenting deployment procedures, troubleshooting guides, and maintenance tasks.

Parameters:
- title (required): Title of the runbook (max 200 chars)
- purpose (required): Purpose/description of the runbook (max 2000 chars)
- prerequisites (optional): Array of prerequisites
- steps (required): Array of steps to follow (at least 1)
- notes (optional): Additional notes or warnings (max 2000 chars)
- role (optional): Role this is relevant for (default: 'dev')
- story_id (optional): Story ID this runbook is linked to
- tags (optional): Additional tags (auto-adds 'runbook', 'procedure')

Returns: UUID string of the created entry

Example:
{
  "title": "Database migration procedure",
  "purpose": "Steps to safely run database migrations in production",
  "prerequisites": [
    "SSH access to production bastion",
    "Database backup completed within last hour"
  ],
  "steps": [
    "Put application in maintenance mode",
    "Take a backup: pg_dump -Fc production > backup.dump",
    "Run migrations: pnpm migrate:up",
    "Verify schema: pnpm migrate:status",
    "Remove maintenance mode",
    "Monitor error rates for 15 minutes"
  ],
  "notes": "If migration fails, restore from backup immediately. Do not attempt to fix forward.",
  "tags": ["database", "production"]
}`,
  inputSchema: zodToMcpSchema(KbAddRunbookInputSchema),
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

// ============================================================================
// Bucket C Task Tools (KBMEM-005)
// ============================================================================

// Import task schemas from task-operations
import {
  KbAddTaskInputSchema,
  KbGetTaskInputSchema,
  KbUpdateTaskInputSchema,
  KbListTasksInputSchema,
} from '../crud-operations/task-operations.js'

// Re-export for external use
export {
  KbAddTaskInputSchema,
  KbGetTaskInputSchema,
  KbUpdateTaskInputSchema,
  KbListTasksInputSchema,
}
export type {
  KbAddTaskInput,
  KbGetTaskInput,
  KbUpdateTaskInput,
  KbListTasksInput,
} from '../crud-operations/task-operations.js'

// Import task triage and lifecycle schemas (KBMEM-018, 019, 020)
import {
  KbTriageTasksInputSchema,
  KbPromoteTaskInputSchema,
  KbListPromotableTasksInputSchema,
  KbCleanupStaleTasksInputSchema,
} from '../crud-operations/index.js'

// Re-export task lifecycle schemas
export {
  KbTriageTasksInputSchema,
  KbPromoteTaskInputSchema,
  KbListPromotableTasksInputSchema,
  KbCleanupStaleTasksInputSchema,
}
export type {
  KbTriageTasksInput,
  KbPromoteTaskInput,
  KbListPromotableTasksInput,
  KbCleanupStaleTasksInput,
} from '../crud-operations/index.js'

// Import deferred writes schemas (KBMEM-022)
import {
  KbQueueDeferredWriteInputSchema,
  KbListDeferredWritesInputSchema,
  KbProcessDeferredWritesInputSchema,
} from '../crud-operations/index.js'

// Re-export deferred writes schemas
export {
  KbQueueDeferredWriteInputSchema,
  KbListDeferredWritesInputSchema,
  KbProcessDeferredWritesInputSchema,
}
export type {
  KbQueueDeferredWriteInput,
  KbListDeferredWritesInput,
  KbProcessDeferredWritesInput,
  DeferredOperationType,
  DeferredWriteEntry,
} from '../crud-operations/index.js'

// Import artifact operations schemas (DB-first artifact storage)
import {
  KbWriteArtifactInputSchema,
  KbReadArtifactInputSchema,
  KbListArtifactsInputSchema,
} from '../crud-operations/index.js'

// Re-export artifact schemas
export { KbWriteArtifactInputSchema, KbReadArtifactInputSchema, KbListArtifactsInputSchema }
export type {
  KbWriteArtifactInput,
  KbReadArtifactInput,
  KbListArtifactsInput,
} from '../crud-operations/index.js'

/**
 * kb_add_task tool definition.
 *
 * Creates a new task in the backlog.
 *
 * @see KBMEM-005 for implementation requirements
 */
export const kbAddTaskToolDefinition: McpToolDefinition = {
  name: 'kb_add_task',
  description: `Add a new task to the backlog (Bucket C).

Tasks capture follow-ups, bugs, improvements, tech debt, and feature ideas
discovered during story implementation.

Parameters:
- title (required): Task title (max 500 chars)
- description (optional): Detailed description (max 10000 chars)
- source_story_id (optional): Story where this task was discovered
- source_phase (optional): Workflow phase when discovered (impl, review, qa)
- source_agent (optional): Agent that created this task
- task_type (required): 'follow_up', 'improvement', 'bug', 'tech_debt', or 'feature_idea'
- priority (optional): 'p0' (critical), 'p1' (high), 'p2' (medium), 'p3' (low)
- tags (optional): Tags for categorization
- estimated_effort (optional): 'xs' (<1h), 's' (1-4h), 'm' (4-8h), 'l' (1-2d), 'xl' (2-5d)

Returns: UUID string of the created task

Example (bug discovered during QA):
{
  "title": "Image upload fails for files > 10MB",
  "description": "Upload timeout occurs for large HEIC files",
  "source_story_id": "WISH-2045",
  "source_phase": "qa",
  "task_type": "bug",
  "priority": "p1"
}

Example (tech debt):
{
  "title": "Refactor image processing to use Sharp pipeline",
  "task_type": "tech_debt",
  "estimated_effort": "m",
  "tags": ["images", "refactor"]
}`,
  inputSchema: zodToMcpSchema(KbAddTaskInputSchema),
}

/**
 * kb_get_task tool definition.
 *
 * Retrieves a task by ID.
 */
export const kbGetTaskToolDefinition: McpToolDefinition = {
  name: 'kb_get_task',
  description: `Get a task by its ID.

Returns the full task including all fields.
Returns null if the task does not exist.

Parameters:
- id (required): UUID of the task to retrieve

Returns: Full task object or null

Example:
{
  "id": "123e4567-e89b-12d3-a456-426614174000"
}`,
  inputSchema: zodToMcpSchema(KbGetTaskInputSchema),
}

/**
 * kb_update_task tool definition.
 *
 * Updates an existing task.
 */
export const kbUpdateTaskToolDefinition: McpToolDefinition = {
  name: 'kb_update_task',
  description: `Update an existing task.

At least one field must be provided for update.
Setting status to 'done' or 'wont_do' auto-sets completed_at timestamp.
Setting promoted_to_story auto-sets status to 'promoted'.

Note: Soft-delete is achieved by setting status to 'wont_do'.

Parameters:
- id (required): UUID of the task to update
- title (optional): New title
- description (optional): New description (null clears)
- priority (optional): New priority
- status (optional): 'open', 'triaged', 'in_progress', 'blocked', 'done', 'wont_do', 'promoted'
- blocked_by (optional): UUID of blocking task
- related_kb_entries (optional): Array of related KB entry UUIDs
- promoted_to_story (optional): Story ID if promoted
- tags (optional): New tags (null clears)
- estimated_effort (optional): New effort estimate

Returns: Updated task object

Example (triage task):
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "priority": "p1",
  "status": "triaged",
  "estimated_effort": "m"
}

Example (complete task):
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "done"
}

Example (soft-delete):
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "wont_do"
}`,
  inputSchema: zodToMcpSchema(KbUpdateTaskInputSchema),
}

/**
 * kb_list_tasks tool definition.
 *
 * Lists tasks with optional filters.
 */
export const kbListTasksToolDefinition: McpToolDefinition = {
  name: 'kb_list_tasks',
  description: `List tasks with optional filtering.

Returns tasks ordered by creation date (newest first).
Supports pagination via limit and offset.

Parameters:
- status (optional): Filter by status
- task_type (optional): Filter by task type
- priority (optional): Filter by priority
- source_story_id (optional): Filter by source story
- tags (optional): Filter by tags (ANY match)
- stale_days (optional): Filter stale tasks (open for more than N days)
- blocked_only (optional): Include only blocked tasks
- limit (optional): Maximum results (1-100, default 20)
- offset (optional): Offset for pagination (default 0)

Returns: Object with tasks array and total count
{
  "tasks": [...],
  "total": 42
}

Example (list all open tasks):
{
  "status": "open"
}

Example (list stale bugs):
{
  "status": "open",
  "task_type": "bug",
  "stale_days": 14
}

Example (list tasks from a story):
{
  "source_story_id": "WISH-2045"
}

Example (paginated list):
{
  "limit": 10,
  "offset": 20
}`,
  inputSchema: zodToMcpSchema(KbListTasksInputSchema),
}

/**
 * kb_triage_tasks tool definition.
 *
 * Triage tasks with auto-priority heuristics (KBMEM-018).
 */
export const kbTriageTasksToolDefinition: McpToolDefinition = {
  name: 'kb_triage_tasks',
  description: `Triage tasks with auto-priority heuristics (Bucket C).

Automatically assigns priorities based on:
- Task type (bug > follow_up > tech_debt > improvement > feature_idea)
- Source phase (qa > review > impl)
- Age (older tasks get higher priority)

Parameters:
- status (optional): Filter by status (default: 'open')
- task_type (optional): Filter by task type
- source_story_id (optional): Filter by source story
- dry_run (optional): Calculate without updating (default: false)
- limit (optional): Max tasks to triage (default: 50, max: 200)

Returns: Triage result with task details and suggested priorities
{
  "success": true,
  "analyzed": 10,
  "updated": 7,
  "unchanged": 3,
  "dry_run": false,
  "tasks": [
    {
      "id": "uuid",
      "title": "...",
      "score": 35,
      "current_priority": "p3",
      "suggested_priority": "p0",
      "score_breakdown": { "task_type_weight": 20, "source_phase_weight": 15, "age_weight": 0 }
    }
  ],
  "summary": { "p0": 2, "p1": 3, "p2": 3, "p3": 2 }
}

Example (triage open tasks):
{
  "status": "open"
}

Example (dry run):
{
  "dry_run": true
}`,
  inputSchema: zodToMcpSchema(KbTriageTasksInputSchema),
}

/**
 * kb_promote_task tool definition.
 *
 * Promote a task to a story (KBMEM-019).
 */
export const kbPromoteTaskToolDefinition: McpToolDefinition = {
  name: 'kb_promote_task',
  description: `Promote a task to a story (Bucket C).

Promotion criteria:
- Status must be 'triaged' or 'in_progress'
- Priority must be P0 or P1
- Estimated effort must be M, L, or XL

Use force=true to override criteria.

Parameters:
- task_id (required): UUID of task to promote
- promoted_to_story (required): Story ID to link to
- force (optional): Override criteria (default: false)

Returns: Promotion result
{
  "success": true,
  "task_id": "uuid",
  "promoted_to_story": "WISH-2100",
  "forced": false,
  "warnings": [],
  "message": "Task promoted to story WISH-2100"
}

Example:
{
  "task_id": "123e4567-e89b-12d3-a456-426614174000",
  "promoted_to_story": "WISH-2100"
}

Example (force promotion):
{
  "task_id": "123e4567-e89b-12d3-a456-426614174000",
  "promoted_to_story": "WISH-2100",
  "force": true
}`,
  inputSchema: zodToMcpSchema(KbPromoteTaskInputSchema),
}

/**
 * kb_list_promotable_tasks tool definition.
 *
 * List tasks that are candidates for promotion (KBMEM-019).
 */
export const kbListPromotableTasksToolDefinition: McpToolDefinition = {
  name: 'kb_list_promotable_tasks',
  description: `List tasks that are candidates for story promotion (Bucket C).

Returns tasks that meet promotion criteria:
- Status: triaged or in_progress
- Priority: P0 or P1
- Effort: M, L, or XL

Parameters:
- limit (optional): Max results (default: 20, max: 100)
- include_partial_matches (optional): Include tasks meeting some but not all criteria (default: false)

Returns: Promotable tasks
{
  "success": true,
  "tasks": [
    {
      "id": "uuid",
      "title": "...",
      "task_type": "bug",
      "priority": "p1",
      "estimated_effort": "m",
      "status": "triaged",
      "meets_all_criteria": true,
      "criteria_met": { "status": true, "priority": true, "effort": true }
    }
  ],
  "total": 5
}

Example:
{}

Example (include partial matches):
{
  "include_partial_matches": true
}`,
  inputSchema: zodToMcpSchema(KbListPromotableTasksInputSchema),
}

/**
 * kb_cleanup_stale_tasks tool definition.
 *
 * Find and optionally cleanup stale tasks (KBMEM-020).
 */
export const kbCleanupStaleTasksToolDefinition: McpToolDefinition = {
  name: 'kb_cleanup_stale_tasks',
  description: `Find and optionally cleanup stale tasks (Bucket C).

Stale thresholds (configurable):
- Open tasks: 30 days
- Triaged tasks: 60 days
- Blocked tasks: 14 days

High priority (P0, P1) and blocked tasks are flagged for attention, not auto-closed.
Low priority (P3) tasks can be auto-closed if enabled.

Parameters:
- dry_run (optional): List without updating (default: true for safety)
- auto_close_low_priority (optional): Auto-close P3 stale tasks (default: false)
- open_threshold_days (optional): Custom threshold for open tasks
- triaged_threshold_days (optional): Custom threshold for triaged tasks
- blocked_threshold_days (optional): Custom threshold for blocked tasks
- limit (optional): Max results (default: 100, max: 500)

Returns: Cleanup result
{
  "success": true,
  "dry_run": true,
  "total_stale": 15,
  "closed": 5,
  "needs_attention": 3,
  "tasks": [
    {
      "id": "uuid",
      "title": "...",
      "status": "open",
      "priority": "p3",
      "age_days": 45,
      "stale_reason": "Open for 45 days (threshold: 30)",
      "action": "closed"
    }
  ],
  "thresholds": { "open_days": 30, "triaged_days": 60, "blocked_days": 14 }
}

Example (dry run):
{}

Example (auto-close low priority):
{
  "dry_run": false,
  "auto_close_low_priority": true
}

Example (custom thresholds):
{
  "open_threshold_days": 14,
  "blocked_threshold_days": 7
}`,
  inputSchema: zodToMcpSchema(KbCleanupStaleTasksInputSchema),
}

// ============================================================================
// Deferred Writes Tools (KBMEM-022)
// ============================================================================

/**
 * kb_queue_deferred_write tool definition.
 *
 * Queue a failed write for later processing.
 *
 * @see KBMEM-022 for implementation requirements
 */
export const kbQueueDeferredWriteToolDefinition: McpToolDefinition = {
  name: 'kb_queue_deferred_write',
  description: `Queue a failed KB write for later processing (KBMEM-022).

When a KB write fails due to connection issues, queue it for later retry.
Writes are stored in _implementation/DEFERRED-KB-WRITES.yaml.

Parameters:
- operation (required): The operation that failed (kb_add, kb_add_decision, etc.)
- payload (required): The original payload that was being written
- error (required): Error message from the failed attempt
- story_id (optional): Story ID for context
- agent (optional): Agent that attempted the write

Returns: Queue result
{
  "success": true,
  "id": "uuid",
  "message": "Queued deferred write for kb_add_lesson"
}

Example:
{
  "operation": "kb_add_lesson",
  "payload": {
    "title": "HEIC orientation metadata",
    "story_id": "WISH-2045",
    "category": "architecture",
    "what_happened": "...",
    "resolution": "..."
  },
  "error": "Connection timeout",
  "story_id": "WISH-2045",
  "agent": "dev-implement-learnings"
}`,
  inputSchema: zodToMcpSchema(KbQueueDeferredWriteInputSchema),
}

/**
 * kb_list_deferred_writes tool definition.
 *
 * List pending deferred writes.
 *
 * @see KBMEM-022 for implementation requirements
 */
export const kbListDeferredWritesToolDefinition: McpToolDefinition = {
  name: 'kb_list_deferred_writes',
  description: `List pending deferred KB writes (KBMEM-022).

Shows writes that failed and are queued for retry.

Parameters:
- limit (optional): Maximum writes to return (default: 50, max: 200)
- operation (optional): Filter by operation type
- story_id (optional): Filter by story ID

Returns: List of deferred writes
{
  "success": true,
  "total": 5,
  "writes": [
    {
      "id": "uuid",
      "operation": "kb_add_lesson",
      "payload": {...},
      "timestamp": "2026-02-04T10:00:00Z",
      "error": "Connection timeout",
      "retry_count": 0,
      "story_id": "WISH-2045"
    }
  ],
  "message": "Found 5 deferred writes (5 total)"
}

Example:
{}

Example (filter by operation):
{
  "operation": "kb_add_task"
}

Example (filter by story):
{
  "story_id": "WISH-2045"
}`,
  inputSchema: zodToMcpSchema(KbListDeferredWritesInputSchema),
}

/**
 * kb_process_deferred_writes tool definition.
 *
 * Process pending deferred writes.
 *
 * @see KBMEM-022 for implementation requirements
 */
export const kbProcessDeferredWritesToolDefinition: McpToolDefinition = {
  name: 'kb_process_deferred_writes',
  description: `Process pending deferred KB writes (KBMEM-022).

Attempts to replay failed writes. Successful writes are removed from queue.
Failed writes have their retry count incremented (max 5 retries).

Parameters:
- dry_run (optional): List writes without processing (default: false)
- limit (optional): Maximum writes to process (default: 50, max: 200)
- operation (optional): Only process specific operation type
- story_id (optional): Only process writes for specific story

Returns: Process result
{
  "success": true,
  "dry_run": false,
  "total": 5,
  "processed": 5,
  "succeeded": 4,
  "failed": 1,
  "writes": [
    { "id": "uuid", "operation": "kb_add_lesson", "status": "success" },
    { "id": "uuid", "operation": "kb_add_task", "status": "failed", "error": "..." }
  ],
  "message": "Processed 5 deferred writes: 4 succeeded, 1 failed"
}

Example (dry run):
{
  "dry_run": true
}

Example (process all):
{}

Example (process specific story):
{
  "story_id": "WISH-2045"
}`,
  inputSchema: zodToMcpSchema(KbProcessDeferredWritesInputSchema),
}

// ============================================================================
// Bucket B Work State Tools (KBMEM-006)
// ============================================================================

// Import work state schemas from work-state-operations
import {
  KbGetWorkStateInputSchema,
  KbUpdateWorkStateInputSchema,
  KbArchiveWorkStateInputSchema,
} from '../crud-operations/work-state-operations.js'

// Import working set sync schemas (KBMEM-008)
import {
  KbSyncWorkingSetInputSchema,
  KbGenerateWorkingSetInputSchema,
  KbInheritConstraintsInputSchema,
  KbArchiveWorkingSetInputSchema,
} from '../working-set/index.js'

// Re-export for external use
export { KbGetWorkStateInputSchema, KbUpdateWorkStateInputSchema, KbArchiveWorkStateInputSchema }
export type {
  KbGetWorkStateInput,
  KbUpdateWorkStateInput,
  KbArchiveWorkStateInput,
} from '../crud-operations/work-state-operations.js'
export {
  KbSyncWorkingSetInputSchema,
  KbGenerateWorkingSetInputSchema,
  KbInheritConstraintsInputSchema,
}
export type {
  KbSyncWorkingSetInput,
  SyncResult,
  KbGenerateWorkingSetInput,
  GenerateWorkingSetResult,
  KbInheritConstraintsInput,
  InheritConstraintsResult,
  KbArchiveWorkingSetInput,
  ArchiveWorkingSetResult,
} from '../working-set/index.js'

/**
 * kb_get_work_state tool definition.
 *
 * Gets work state for a story.
 *
 * @see KBMEM-006 for implementation requirements
 */
export const kbGetWorkStateToolDefinition: McpToolDefinition = {
  name: 'kb_get_work_state',
  description: `Get work state for a story (Bucket B).

Returns the current work state including constraints, recent actions,
next steps, and blockers. Returns null if no work state exists.

Parameters:
- story_id (required): Story ID to get work state for (e.g., 'WISH-2045')

Returns: Work state object or null
{
  "id": "uuid",
  "story_id": "WISH-2045",
  "branch": "feature/wish-2045-heic-support",
  "phase": "implementation",
  "constraints": [{ "constraint": "...", "source": "...", "priority": 1 }],
  "recent_actions": [{ "action": "...", "completed": true, "timestamp": "..." }],
  "next_steps": ["..."],
  "blockers": [{ "title": "...", "description": "...", "waiting_on": "..." }],
  "kb_references": { "heic_decision": "kb-uuid" },
  "created_at": "...",
  "updated_at": "..."
}

Example:
{
  "story_id": "WISH-2045"
}`,
  inputSchema: zodToMcpSchema(KbGetWorkStateInputSchema),
}

/**
 * kb_update_work_state tool definition.
 *
 * Updates or creates work state for a story (upsert).
 */
export const kbUpdateWorkStateToolDefinition: McpToolDefinition = {
  name: 'kb_update_work_state',
  description: `Update or create work state for a story (Bucket B, upsert).

Creates new work state if none exists, otherwise updates existing.
Use this to sync state from /.agent/working-set.md to KB.

Parameters:
- story_id (required): Story ID this work state belongs to
- branch (optional): Git branch associated with this story
- phase (optional): Current workflow phase
- constraints (optional): Constraints for this story (replaces existing)
- recent_actions (optional): Recent actions taken (replaces existing)
- next_steps (optional): Planned next steps (replaces existing)
- blockers (optional): Active blockers (replaces existing)
- kb_references (optional): KB entry references (merges with existing)

Phase values:
- 'planning', 'in-elaboration', 'ready-to-work', 'implementation',
  'ready-for-code-review', 'review', 'ready-for-qa', 'in-qa',
  'verification', 'uat', 'complete'

Returns: Updated/created work state object

Example (initial setup):
{
  "story_id": "WISH-2045",
  "branch": "feature/wish-2045-heic-support",
  "phase": "implementation",
  "constraints": [
    { "constraint": "Use Zod for validation", "source": "CLAUDE.md", "priority": 1 }
  ],
  "next_steps": ["Implement HEIC conversion", "Add unit tests"]
}

Example (update phase):
{
  "story_id": "WISH-2045",
  "phase": "review"
}

Example (add blocker):
{
  "story_id": "WISH-2045",
  "blockers": [
    { "title": "Waiting for API key", "waiting_on": "DevOps" }
  ]
}`,
  inputSchema: zodToMcpSchema(KbUpdateWorkStateInputSchema),
}

/**
 * kb_archive_work_state tool definition.
 *
 * Archives work state for a completed story.
 */
export const kbArchiveWorkStateToolDefinition: McpToolDefinition = {
  name: 'kb_archive_work_state',
  description: `Archive work state for a completed story (Bucket B).

Moves the work state to the history table and removes from active table.
Use this when a story is complete and work state should be preserved for reference.

Parameters:
- story_id (required): Story ID to archive work state for

Returns: Archive result
{
  "archived": true,
  "history_id": "uuid",
  "message": "Work state for WISH-2045 archived successfully"
}

If no work state exists:
{
  "archived": false,
  "history_id": null,
  "message": "No work state found for story: WISH-2045"
}

Example:
{
  "story_id": "WISH-2045"
}`,
  inputSchema: zodToMcpSchema(KbArchiveWorkStateInputSchema),
}

/**
 * kb_sync_working_set tool definition.
 *
 * Syncs working-set.md file to/from KB (KBMEM-008).
 */
export const kbSyncWorkingSetToolDefinition: McpToolDefinition = {
  name: 'kb_sync_working_set',
  description: `Sync working-set.md file to/from KB (Bucket B).

Bidirectional sync between the /.agent/working-set.md file and the KB work_state table.

Parameters:
- story_id (required): Story ID to sync
- content (optional): Working set markdown content (required for 'to_kb' direction)
- direction (optional): 'to_kb' (file → DB) or 'from_kb' (DB → file). Default: 'to_kb'

Returns: Sync result
{
  "success": true,
  "story_id": "WISH-2045",
  "direction": "to_kb",
  "content": "# Working Set...", // Only for from_kb direction
  "summary": {
    "constraints_count": 5,
    "actions_count": 3,
    "next_steps_count": 2,
    "blockers_count": 0,
    "kb_references_count": 1
  },
  "message": "Working set synced to KB for story WISH-2045"
}

Example (sync file to KB):
{
  "story_id": "WISH-2045",
  "content": "# Working Set\\n\\n## Current Context\\n...",
  "direction": "to_kb"
}

Example (generate file from KB):
{
  "story_id": "WISH-2045",
  "direction": "from_kb"
}`,
  inputSchema: zodToMcpSchema(KbSyncWorkingSetInputSchema),
}

/**
 * kb_generate_working_set tool definition.
 *
 * Generates working-set.md from KB when file is missing (KBMEM-011).
 */
export const kbGenerateWorkingSetToolDefinition: McpToolDefinition = {
  name: 'kb_generate_working_set',
  description: `Generate working-set.md content from KB data (Bucket B fallback).

Use this when a working-set.md file doesn't exist but you need to bootstrap
a session. Pulls data from KB work_state (if exists) and constraints.

Constraint merging priority: story > epic > project

Parameters:
- story_id (required): Story ID to generate working set for
- branch (optional): Git branch name (used if not in KB)
- phase (optional): Current phase (used if not in KB)
- include_project_constraints (optional): Include project-level constraints (default: true)
- include_epic_constraints (optional): Include epic-level constraints (default: true)
- epic_id (optional): Epic ID for epic-level constraint lookup
- max_constraints (optional): Maximum constraints to include (1-10, default: 5)

Returns: Generation result
{
  "success": true,
  "story_id": "WISH-2045",
  "content": "# Working Set\\n\\n...",
  "source": "kb_work_state" | "constraints_only" | "minimal",
  "summary": {
    "constraints_count": 5,
    "project_constraints": 2,
    "epic_constraints": 1,
    "story_constraints": 2,
    "actions_count": 3,
    "next_steps_count": 2,
    "blockers_count": 0
  },
  "message": "Working set generated from kb_work_state for WISH-2045"
}

Example (full generation):
{
  "story_id": "WISH-2045",
  "branch": "feat/wish-2045-heic",
  "phase": "implementation",
  "epic_id": "WISH-2000"
}

Example (minimal):
{
  "story_id": "WISH-2045"
}`,
  inputSchema: zodToMcpSchema(KbGenerateWorkingSetInputSchema),
}

/**
 * kb_inherit_constraints tool definition.
 *
 * Inherits constraints from project and epic scopes with conflict detection (KBMEM-016).
 */
export const kbInheritConstraintsToolDefinition: McpToolDefinition = {
  name: 'kb_inherit_constraints',
  description: `Inherit constraints from project and epic scopes to a story (KBMEM-016).

Uses constraint inheritance priority: story > epic > project.
Automatically detects epic ID from story ID naming patterns if not provided.
Detects conflicts between constraints at different scopes and logs resolutions.

Parameters:
- story_id (required): Story ID to inherit constraints for
- epic_id (optional): Epic ID (auto-detected from story ID if not provided)
- include_project (optional): Include project-level constraints (default: true)
- include_epic (optional): Include epic-level constraints (default: true)
- max_per_scope (optional): Maximum constraints per scope (1-10, default: 5)
- log_conflicts (optional): Whether to log conflict resolutions (default: true)

Returns: Inheritance result
{
  "success": true,
  "story_id": "WISH-2045",
  "epic_id": "WISH",
  "constraints": [...],
  "conflicts": [
    {
      "overridden": { "constraint": "...", "scope": "project" },
      "winner": { "constraint": "...", "scope": "story" },
      "reason": "Conflicting keywords: 'always' vs 'never' on topic: timeout, config"
    }
  ],
  "summary": {
    "total": 8,
    "from_story": 3,
    "from_epic": 2,
    "from_project": 3,
    "conflicts_resolved": 1
  },
  "message": "Inherited 8 constraints for WISH-2045 (epic: WISH), 1 conflicts resolved"
}

Example (auto-detect epic):
{
  "story_id": "WISH-2045"
}

Example (explicit epic):
{
  "story_id": "WISH-2045",
  "epic_id": "WISH-2000"
}

Example (story constraints only):
{
  "story_id": "WISH-2045",
  "include_project": false,
  "include_epic": false
}`,
  inputSchema: zodToMcpSchema(KbInheritConstraintsInputSchema),
}

/**
 * kb_archive_working_set tool definition.
 *
 * Archives working-set.md content on story completion (KBMEM-021).
 */
export const kbArchiveWorkingSetToolDefinition: McpToolDefinition = {
  name: 'kb_archive_working_set',
  description: `Archive working-set.md content on story completion (KBMEM-021).

When a story completes, archives the working-set.md content to a persistent archive file.
This preserves the session state for future reference and debugging.

Parameters:
- story_id (required): Story ID being archived
- content (required): Working set markdown content to archive
- archive_path (optional): Path relative to _implementation/ (default: 'WORKING-SET-ARCHIVE.md')
- include_timestamp (optional): Include timestamp header (default: true)

Returns: Archive result with formatted content
{
  "success": true,
  "story_id": "WISH-2045",
  "archive_path": "WORKING-SET-ARCHIVE.md",
  "archived_at": "2026-02-04T15:30:00.000Z",
  "content_length": 2500,
  "archive_content": "\\n---\\n\\n# Archived: WISH-2045\\n\\n...",
  "message": "Working set for WISH-2045 archived successfully"
}

The archive_content field contains the formatted content that should be APPENDED
to the archive file. The caller is responsible for writing this to the file.

Example:
{
  "story_id": "WISH-2045",
  "content": "# Working Set\\n\\n## Current Context\\n..."
}`,
  inputSchema: zodToMcpSchema(KbArchiveWorkingSetInputSchema),
}

// ============================================================================
// Artifact Tools (DB-First Artifact Storage)
// ============================================================================

/**
 * kb_write_artifact tool definition.
 *
 * Write (create or update) a workflow artifact to the database.
 */
export const kbWriteArtifactToolDefinition: McpToolDefinition = {
  name: 'kb_write_artifact',
  description: `Write a workflow artifact to the database (DB-first artifact storage).

Creates or updates an artifact for a story. Uses upsert behavior based on
story_id + artifact_type + iteration - if an artifact with these values exists,
it will be updated; otherwise a new artifact is created.

Supported artifact types:
- checkpoint: Phase completion checkpoints (CHECKPOINT.yaml)
- scope: Story scope definition (SCOPE.yaml)
- plan: Implementation plan (IMPLEMENTATION-PLAN.yaml)
- evidence: Implementation evidence (EVIDENCE.yaml)
- verification: QA verification results (VERIFICATION.yaml)
- analysis: Code analysis results (ANALYSIS.yaml)
- context: Agent context (AGENT-CONTEXT.yaml)
- fix_summary: Fix cycle summary (FIX-SUMMARY.yaml)
- proof: Implementation proof (PROOF.yaml)
- elaboration: Story elaboration (ELABORATION.yaml)
- review: Code review results (REVIEW.yaml)
- qa_gate: QA gate decision (QA-GATE.yaml)
- completion_report: Story completion report (COMPLETION-REPORT.yaml)

Parameters:
- story_id (required): Story ID (e.g., 'WISH-2045')
- artifact_type (required): Type of artifact
- content (required): Full artifact content as JSON object
- phase (optional): Implementation phase (setup, analysis, planning, implementation, code_review, qa_verification, completion)
- iteration (optional): Fix cycle iteration number (default: 0)
- artifact_name (optional): Human-readable name (auto-generated if not provided)
- summary (optional): JSONB summary for quick access

Returns: Created/updated artifact
{
  "id": "uuid",
  "story_id": "WISH-2045",
  "artifact_type": "checkpoint",
  "artifact_name": "CHECKPOINT",
  "phase": "setup",
  "iteration": 0,
  "content": {...},
  "summary": {...},
  "created_at": "2026-02-06T10:00:00Z",
  "updated_at": "2026-02-06T10:00:00Z"
}

Example (write checkpoint):
{
  "story_id": "WISH-2045",
  "artifact_type": "checkpoint",
  "phase": "setup",
  "content": {
    "phase": "setup",
    "status": "complete",
    "completed_at": "2026-02-06T10:00:00Z",
    "summary": "Setup phase completed successfully"
  }
}

Example (write evidence with iteration):
{
  "story_id": "WISH-2045",
  "artifact_type": "evidence",
  "phase": "implementation",
  "iteration": 1,
  "content": {
    "tests_passed": true,
    "coverage": 85,
    "files_changed": ["src/feature.ts", "src/feature.test.ts"]
  },
  "summary": {
    "tests_passed": true,
    "coverage": 85
  }
}`,
  inputSchema: zodToMcpSchema(KbWriteArtifactInputSchema),
}

/**
 * kb_read_artifact tool definition.
 *
 * Read a workflow artifact from the database.
 */
export const kbReadArtifactToolDefinition: McpToolDefinition = {
  name: 'kb_read_artifact',
  description: `Read a workflow artifact from the database (DB-first artifact storage).

Retrieves an artifact by story_id + artifact_type. If iteration is not specified,
returns the latest artifact (highest iteration number).

Use this instead of reading YAML files from _implementation/ directory.
The content field contains the full artifact data that would have been in the YAML file.

Parameters:
- story_id (required): Story ID (e.g., 'WISH-2045')
- artifact_type (required): Type of artifact to read
- iteration (optional): Specific iteration number (default: latest)

Returns: Artifact or null if not found
{
  "id": "uuid",
  "story_id": "WISH-2045",
  "artifact_type": "checkpoint",
  "artifact_name": "CHECKPOINT",
  "phase": "setup",
  "iteration": 0,
  "content": {...},
  "summary": {...},
  "created_at": "2026-02-06T10:00:00Z",
  "updated_at": "2026-02-06T10:00:00Z"
}

Example (read latest checkpoint):
{
  "story_id": "WISH-2045",
  "artifact_type": "checkpoint"
}

Example (read specific iteration):
{
  "story_id": "WISH-2045",
  "artifact_type": "evidence",
  "iteration": 2
}

Example (read review for fix cycle):
{
  "story_id": "WISH-2045",
  "artifact_type": "review",
  "iteration": 1
}`,
  inputSchema: zodToMcpSchema(KbReadArtifactInputSchema),
}

/**
 * kb_list_artifacts tool definition.
 *
 * List artifacts for a story with optional filters.
 */
export const kbListArtifactsToolDefinition: McpToolDefinition = {
  name: 'kb_list_artifacts',
  description: `List artifacts for a story (DB-first artifact storage).

Returns all artifacts for a story, with optional filtering by phase or artifact type.
By default, content is excluded for performance - set include_content=true to include full content.

Parameters:
- story_id (required): Story ID (e.g., 'WISH-2045')
- phase (optional): Filter by implementation phase
- artifact_type (optional): Filter by artifact type
- include_content (optional): Include full content in response (default: false)
- limit (optional): Maximum results (1-100, default: 50)

Returns: List of artifacts
{
  "artifacts": [
    {
      "id": "uuid",
      "story_id": "WISH-2045",
      "artifact_type": "checkpoint",
      "artifact_name": "CHECKPOINT",
      "phase": "setup",
      "iteration": 0,
      "summary": {...},
      "created_at": "2026-02-06T10:00:00Z",
      "updated_at": "2026-02-06T10:00:00Z"
    }
  ],
  "total": 5
}

Example (list all artifacts):
{
  "story_id": "WISH-2045"
}

Example (list artifacts for a phase):
{
  "story_id": "WISH-2045",
  "phase": "implementation"
}

Example (list all checkpoints with content):
{
  "story_id": "WISH-2045",
  "artifact_type": "checkpoint",
  "include_content": true
}`,
  inputSchema: zodToMcpSchema(KbListArtifactsInputSchema),
}

// ============================================================================
// Story Status Tools
// ============================================================================

/**
 * kb_get_story tool definition.
 *
 * Retrieves a story by its ID.
 */
export const kbGetStoryToolDefinition: McpToolDefinition = {
  name: 'kb_get_story',
  description: `Get a story by its ID.

Returns the full story record including workflow state, phase, and blocking status.

Parameters:
- story_id (required): Story ID to retrieve (e.g., 'WISH-2045')

Returns: Story object or null if not found

Example:
{
  "story_id": "WISH-2045"
}`,
  inputSchema: zodToMcpSchema(KbGetStoryInputSchema),
}

/**
 * kb_list_stories tool definition.
 *
 * Lists stories with optional filters.
 */
export const kbListStoriesToolDefinition: McpToolDefinition = {
  name: 'kb_list_stories',
  description: `List stories with optional filtering.

Returns stories ordered by last update (newest first).

Parameters:
- feature (optional): Filter by feature prefix (e.g., 'wish')
- state (optional): Filter by workflow state (backlog, ready, in_progress, etc.)
- phase (optional): Filter by implementation phase (setup, implementation, etc.)
- blocked (optional): Filter by blocked status (true/false)
- priority (optional): Filter by priority (critical, high, medium, low)
- limit (optional): Maximum results (1-100, default 20)
- offset (optional): Offset for pagination (default 0)

Returns: Array of stories and total count

Example (list all blocked stories):
{
  "blocked": true
}

Example (list stories in code review for "wish" feature):
{
  "feature": "wish",
  "state": "in_review"
}

Example (list high priority stories):
{
  "priority": "high"
}`,
  inputSchema: zodToMcpSchema(KbListStoriesInputSchema),
}

/**
 * kb_update_story_status tool definition.
 *
 * Updates story workflow state and status.
 */
export const kbUpdateStoryStatusToolDefinition: McpToolDefinition = {
  name: 'kb_update_story_status',
  description: `Update story workflow state and status.

Updates the story's state, phase, iteration, or blocking status.
Auto-sets timestamps for state transitions (started_at, completed_at).

Parameters:
- story_id (required): Story ID to update (e.g., 'WISH-2045')
- state (optional): New workflow state
- phase (optional): New implementation phase
- iteration (optional): New iteration count
- blocked (optional): Set blocked status
- blocked_reason (optional): Reason for being blocked
- blocked_by_story (optional): Story ID that blocks this one
- priority (optional): New priority

States: backlog, ready, in_progress, ready_for_review, in_review, ready_for_qa, in_qa, completed, cancelled, deferred
Phases: setup, analysis, planning, implementation, code_review, qa_verification, completion

Returns: Updated story object

Example (move story to in_progress):
{
  "story_id": "WISH-2045",
  "state": "in_progress",
  "phase": "implementation"
}

Example (block a story):
{
  "story_id": "WISH-2045",
  "blocked": true,
  "blocked_reason": "Waiting for design review",
  "blocked_by_story": "WISH-2040"
}

Example (complete a story):
{
  "story_id": "WISH-2045",
  "state": "completed"
}`,
  inputSchema: zodToMcpSchema(KbUpdateStoryStatusInputSchema),
}

/**
 * kb_get_next_story tool definition.
 *
 * Finds the next available story to work on in an epic.
 */
export const kbGetNextStoryToolDefinition: McpToolDefinition = {
  name: 'kb_get_next_story',
  description: `Find the next available story to work on in an epic.

Returns the highest priority story that is:
- In the specified epic
- In 'ready' state (or 'backlog' if include_backlog is true)
- Not blocked
- Has all dependencies satisfied (from story_dependencies table)

Stories are sorted by priority (critical > high > medium > low), then by created_at (oldest first).

Parameters:
- epic (required): Epic name to find next story in
- feature (optional): Filter by feature prefix (e.g., 'wish')
- exclude_story_ids (optional): Story IDs to exclude (e.g., already assigned)
- include_backlog (optional): Include stories in 'backlog' state (default: false)

Returns:
- story: The next available story or null
- candidates_count: Number of candidate stories considered
- blocked_by_dependencies: Stories that were blocked by unresolved dependencies
- message: Human-readable summary

Example (get next story in epic):
{
  "epic": "wishlist-gallery"
}

Example (filter by feature and exclude assigned stories):
{
  "epic": "wishlist-gallery",
  "feature": "wish",
  "exclude_story_ids": ["WISH-2045", "WISH-2046"]
}

Example (include backlog stories):
{
  "epic": "wishlist-gallery",
  "include_backlog": true
}`,
  inputSchema: zodToMcpSchema(KbGetNextStoryInputSchema),
}

// ============================================================================
// Token Logging Tool
// ============================================================================

/**
 * kb_log_tokens tool definition.
 *
 * Logs token usage for a story phase.
 */
export const kbLogTokensToolDefinition: McpToolDefinition = {
  name: 'kb_log_tokens',
  description: `Log token usage for a story workflow phase.

Records input/output tokens for analytics and cost tracking.
Auto-extracts feature prefix from story ID.

Parameters:
- story_id (required): Story ID (e.g., 'WISH-2045')
- phase (required): Workflow phase
- input_tokens (required): Input token count
- output_tokens (required): Output token count
- agent (optional): Agent name (e.g., 'dev-implement-leader')
- iteration (optional): Fix cycle number (default 0)
- logged_at (optional): Custom timestamp (defaults to now)

Phases: pm-generate, pm-elaborate, pm-refine, dev-setup, dev-implementation,
        dev-fix, code-review, qa-verification, qa-gate, architect-review, other

Returns: { logged: true, id: "uuid", cumulative: <total_tokens_for_story> }

Example:
{
  "story_id": "WISH-2045",
  "phase": "dev-implementation",
  "input_tokens": 80000,
  "output_tokens": 37000,
  "agent": "dev-implement-leader"
}`,
  inputSchema: zodToMcpSchema(KbLogTokensInputSchema),
}

// ============================================================================
// Analytics Tools
// ============================================================================

/**
 * kb_get_token_summary tool definition.
 *
 * Gets token usage summary grouped by dimension.
 */
export const kbGetTokenSummaryToolDefinition: McpToolDefinition = {
  name: 'kb_get_token_summary',
  description: `Get token usage summary grouped by a dimension.

Answers: "What is the biggest token sink?"

Parameters:
- group_by (required): Grouping dimension (phase, feature, story, agent)
- feature (optional): Filter by feature prefix
- story_id (optional): Filter by specific story
- start_date (optional): Start of time range (ISO 8601)
- end_date (optional): End of time range (ISO 8601)
- limit (optional): Maximum results (1-100, default 20)

Returns: Aggregated token counts per group

Example (group by phase):
{
  "group_by": "phase"
}

Example (group by feature with date range):
{
  "group_by": "feature",
  "start_date": "2026-01-01"
}

Response:
{
  "results": [
    { "group": "dev-implementation", "input_tokens": 500000, "output_tokens": 200000, "total_tokens": 700000, "count": 15 }
  ],
  "total": 1400000
}`,
  inputSchema: zodToMcpSchema(KbGetTokenSummaryInputSchema),
}

/**
 * kb_get_bottleneck_analysis tool definition.
 *
 * Analyzes workflow bottlenecks.
 */
export const kbGetBottleneckAnalysisToolDefinition: McpToolDefinition = {
  name: 'kb_get_bottleneck_analysis',
  description: `Analyze workflow bottlenecks: phase distribution and stuck stories.

Answers: "Where is the biggest bottleneck?"

Parameters:
- stuck_threshold_days (optional): Days threshold for "stuck" stories (default 7)
- feature (optional): Filter by feature prefix
- limit (optional): Maximum stuck stories to return (default 20)

Returns: Phase distribution, stuck stories, and state distribution

Example:
{
  "stuck_threshold_days": 7
}

Example (filter by feature):
{
  "feature": "wish",
  "stuck_threshold_days": 14
}

Response:
{
  "phase_distribution": [
    { "phase": "code_review", "count": 5 }
  ],
  "stuck_stories": [
    { "story_id": "WISH-2045", "phase": "qa_verification", "state": "in_qa", "days_stuck": 10 }
  ],
  "state_distribution": [
    { "state": "in_progress", "count": 8 }
  ]
}`,
  inputSchema: zodToMcpSchema(KbGetBottleneckAnalysisInputSchema),
}

/**
 * kb_get_churn_analysis tool definition.
 *
 * Analyzes story churn and iteration patterns.
 */
export const kbGetChurnAnalysisToolDefinition: McpToolDefinition = {
  name: 'kb_get_churn_analysis',
  description: `Analyze story churn: iteration counts and feature patterns.

Answers: "What kinds of features have the most churn?"

Parameters:
- min_iterations (optional): Minimum iterations to be considered high churn (default 2)
- feature (optional): Filter by feature prefix
- limit (optional): Maximum results (default 20)

Returns: High-churn stories and feature averages

Example:
{
  "min_iterations": 2
}

Example (filter by feature):
{
  "feature": "wish",
  "min_iterations": 3
}

Response:
{
  "high_churn_stories": [
    { "story_id": "WISH-2045", "iteration": 5, "feature": "wish", "phase": "qa_verification" }
  ],
  "feature_averages": [
    { "feature": "wish", "avg_iterations": 2.3, "story_count": 20, "max_iterations": 5 }
  ]
}`,
  inputSchema: zodToMcpSchema(KbGetChurnAnalysisInputSchema),
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
  // Bucket A typed entry tools (KBMEM-004)
  kbAddDecisionToolDefinition,
  kbAddConstraintToolDefinition,
  kbAddLessonToolDefinition,
  kbAddRunbookToolDefinition,
  // Bucket B work state tools (KBMEM-006)
  kbGetWorkStateToolDefinition,
  kbUpdateWorkStateToolDefinition,
  kbArchiveWorkStateToolDefinition,
  // Bucket B working set sync (KBMEM-008)
  kbSyncWorkingSetToolDefinition,
  // Bucket B working set fallback (KBMEM-011)
  kbGenerateWorkingSetToolDefinition,
  // Bucket B constraint inheritance (KBMEM-016)
  kbInheritConstraintsToolDefinition,
  // Bucket B working set archive (KBMEM-021)
  kbArchiveWorkingSetToolDefinition,
  // Bucket C task tools (KBMEM-005)
  kbAddTaskToolDefinition,
  kbGetTaskToolDefinition,
  kbUpdateTaskToolDefinition,
  kbListTasksToolDefinition,
  // Bucket C task triage (KBMEM-018)
  kbTriageTasksToolDefinition,
  // Bucket C task promotion (KBMEM-019)
  kbPromoteTaskToolDefinition,
  kbListPromotableTasksToolDefinition,
  // Bucket C stale task cleanup (KBMEM-020)
  kbCleanupStaleTasksToolDefinition,
  // Deferred writes (KBMEM-022)
  kbQueueDeferredWriteToolDefinition,
  kbListDeferredWritesToolDefinition,
  kbProcessDeferredWritesToolDefinition,
  // Admin tools (KNOW-0053)
  kbBulkImportToolDefinition,
  kbRebuildEmbeddingsToolDefinition,
  kbStatsToolDefinition,
  kbHealthToolDefinition,
  // Audit tools (KNOW-018)
  kbAuditByEntryToolDefinition,
  kbAuditQueryToolDefinition,
  kbAuditRetentionToolDefinition,
  // Artifact tools (DB-first artifact storage)
  kbWriteArtifactToolDefinition,
  kbReadArtifactToolDefinition,
  kbListArtifactsToolDefinition,
  // Story status tools
  kbGetStoryToolDefinition,
  kbListStoriesToolDefinition,
  kbUpdateStoryStatusToolDefinition,
  kbGetNextStoryToolDefinition,
  // Token logging tools
  kbLogTokensToolDefinition,
  // Analytics tools
  kbGetTokenSummaryToolDefinition,
  kbGetBottleneckAnalysisToolDefinition,
  kbGetChurnAnalysisToolDefinition,
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
