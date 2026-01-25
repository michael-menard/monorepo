/**
 * MCP Tool Schema Definitions
 *
 * Generates MCP tool schemas from existing Zod schemas using zod-to-json-schema.
 * This ensures a single source of truth for all input validation.
 *
 * @see KNOW-0051 AC2 for tool schema requirements
 * @see KNOW-0052 for search tools (kb_search, kb_get_related)
 */

import { zodToJsonSchema } from 'zod-to-json-schema'
import {
  KbAddInputSchema,
  KbGetInputSchema,
  KbUpdateInputSchema,
  KbDeleteInputSchema,
  KbListInputSchema,
} from '../crud-operations/schemas.js'
import { SearchInputSchema, GetRelatedInputSchema } from '../search/index.js'

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
 * All MCP tool definitions.
 */
export const toolDefinitions: McpToolDefinition[] = [
  kbAddToolDefinition,
  kbGetToolDefinition,
  kbUpdateToolDefinition,
  kbDeleteToolDefinition,
  kbListToolDefinition,
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
