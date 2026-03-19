/**
 * Story Ingest Operations
 *
 * MCP operations for ingesting a story from a YAML payload via the
 * workflow.ingest_story_from_yaml stored procedure.
 *
 * @see CDBE-2030 for implementation details
 */

import { z } from 'zod'
import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'

// ============================================================================
// Dependencies
// ============================================================================

export interface StoryIngestDeps {
  db: NodePgDatabase<typeof schema>
}

// ============================================================================
// Input Schema
// ============================================================================

/**
 * Input schema for kb_ingest_story_from_yaml tool.
 *
 * Calls workflow.ingest_story_from_yaml(p_caller_agent_id, p_story_yaml)
 * which performs an idempotent upsert of story, story_details, story_content,
 * and story_dependencies in a single transaction.
 */
export const KbIngestStoryFromYamlInputSchema = z.object({
  /** Caller agent ID validated against workflow.allowed_agents (raises P0001 if unknown) */
  caller_agent_id: z.string().min(1, 'caller_agent_id cannot be empty'),

  /**
   * Story YAML payload as a JSON object. Required keys: story_id, title, feature.
   *
   * Optional keys:
   * - state: workflow state (default: 'backlog')
   * - priority: 'critical' | 'high' | 'medium' | 'low'
   * - description: human-readable description
   * - blocked_reason: reason for being blocked
   * - blocked_by_story: story_id that blocks this one
   * - story_dir: relative path to story directory
   * - story_file: story file name
   * - touches_backend: boolean scope flag
   * - touches_frontend: boolean scope flag
   * - touches_database: boolean scope flag
   * - touches_infra: boolean scope flag
   * - content: array of { section_name, content_text, source_format? }
   * - dependencies: array of { depends_on_id, dependency_type? }
   */
  story_yaml: z.record(z.unknown()),
})

export type KbIngestStoryFromYamlInput = z.infer<typeof KbIngestStoryFromYamlInputSchema>

// ============================================================================
// Return Schema
// ============================================================================

/**
 * Return shape from workflow.ingest_story_from_yaml stored procedure.
 */
export const KbIngestStoryFromYamlResultSchema = z.object({
  inserted_stories: z.number().int(),
  updated_stories: z.number().int(),
  upserted_content: z.number().int(),
  upserted_details: z.number().int(),
  inserted_dependencies: z.number().int(),
  skipped_dependencies: z.number().int(),
  message: z.string(),
})

export type KbIngestStoryFromYamlResult = z.infer<typeof KbIngestStoryFromYamlResultSchema>

// ============================================================================
// Operation
// ============================================================================

/**
 * Ingest a story from a YAML payload.
 *
 * Delegates to the workflow.ingest_story_from_yaml stored procedure, which
 * performs idempotent upserts of workflow.stories, story_details, story_content,
 * and story_dependencies in a single transaction.
 *
 * @param deps - Database dependencies
 * @param input - Caller agent ID and story YAML payload
 * @returns Observability counts from the stored procedure
 */
export async function kb_ingest_story_from_yaml(
  deps: StoryIngestDeps,
  input: KbIngestStoryFromYamlInput,
): Promise<KbIngestStoryFromYamlResult> {
  const validated = KbIngestStoryFromYamlInputSchema.parse(input)

  const rows = await deps.db.execute(
    sql`SELECT * FROM workflow.ingest_story_from_yaml(
      ${validated.caller_agent_id}::text,
      ${JSON.stringify(validated.story_yaml)}::jsonb
    )`,
  )

  const row = rows.rows[0] as {
    inserted_stories: number
    updated_stories: number
    upserted_content: number
    upserted_details: number
    inserted_dependencies: number
    skipped_dependencies: number
  }

  const storyId = (validated.story_yaml['story_id'] as string | undefined) ?? 'unknown'
  const wasInserted = row.inserted_stories > 0

  return {
    inserted_stories: row.inserted_stories,
    updated_stories: row.updated_stories,
    upserted_content: row.upserted_content,
    upserted_details: row.upserted_details,
    inserted_dependencies: row.inserted_dependencies,
    skipped_dependencies: row.skipped_dependencies,
    message: wasInserted
      ? `Story ${storyId} ingested successfully (created)`
      : `Story ${storyId} ingested successfully (updated)`,
  }
}
