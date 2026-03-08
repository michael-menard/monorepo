/**
 * kb_get_story_context - Composite Story Context Tool (CDTS-2020)
 *
 * Returns a complete context package for a story in one call:
 * story + details + artifacts + linked knowledge + similar stories + constraints.
 *
 * Uses parallel queries for performance (<500ms target).
 */

import { logger } from '@repo/logger'
import { eq, and, isNull, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { z } from 'zod'
import {
  stories,
  storyDetails,
  storyArtifacts,
} from '../db/schema.js'
import type * as schema from '../db/schema.js'
import type { EmbeddingClient } from '../embedding-client/index.js'
import { findSimilarStories, buildStoryEmbeddingText } from '../search/story-similarity.js'

// ============================================================================
// Input Schema
// ============================================================================

export const KbGetStoryContextInputSchema = z.object({
  /** Story ID to retrieve context for (e.g., 'WISH-2045') */
  story_id: z.string().min(1),

  /** Include similar stories via embedding search (default true) */
  include_similar: z.boolean().default(true),

  /** Max KB entries to return from story_knowledge_links (default 10) */
  max_kb_entries: z.number().int().positive().max(50).default(10),

  /** Max similar stories to return (default 5) */
  max_similar_stories: z.number().int().positive().max(20).default(5),
})

export type KbGetStoryContextInput = z.infer<typeof KbGetStoryContextInputSchema>

// ============================================================================
// Dependencies
// ============================================================================

export interface StoryContextDeps {
  db: NodePgDatabase<typeof schema>
  embeddingClient: EmbeddingClient
}

// ============================================================================
// Implementation
// ============================================================================

export async function kb_get_story_context(
  input: KbGetStoryContextInput,
  deps: StoryContextDeps,
) {
  const validated = KbGetStoryContextInputSchema.parse(input)
  const { db, embeddingClient } = deps
  const startTime = Date.now()

  // 1. Fetch story header (required — 404 if not found)
  const storyResult = await db
    .select()
    .from(stories)
    .where(and(eq(stories.storyId, validated.story_id), isNull(stories.deletedAt)))
    .limit(1)

  const story = storyResult[0]
  if (!story) {
    return {
      error: `Story ${validated.story_id} not found`,
      story: null,
      detail: null,
      artifacts: [],
      linked_knowledge: [],
      similar_stories: [],
      applicable_constraints: [],
    }
  }

  // 2. Parallel queries for remaining data
  const [detailResult, artifactsResult, linkedKnowledgeResult, constraintsResult] =
    await Promise.all([
      // Story details
      db
        .select()
        .from(storyDetails)
        .where(eq(storyDetails.storyId, validated.story_id))
        .limit(1),

      // Story artifacts
      db
        .select({
          id: storyArtifacts.id,
          storyId: storyArtifacts.storyId,
          artifactType: storyArtifacts.artifactType,
          artifactName: storyArtifacts.artifactName,
          phase: storyArtifacts.phase,
          iteration: storyArtifacts.iteration,
          summary: storyArtifacts.summary,
          createdAt: storyArtifacts.createdAt,
          updatedAt: storyArtifacts.updatedAt,
        })
        .from(storyArtifacts)
        .where(eq(storyArtifacts.storyId, validated.story_id)),

      // Linked knowledge entries (via story_knowledge_links JOIN knowledge_entries)
      db.execute(sql`
        SELECT
          skl.link_type,
          skl.confidence,
          ke.id as kb_id,
          ke.content,
          ke.role,
          ke.entry_type,
          ke.tags,
          ke.verified
        FROM public.story_knowledge_links skl
        JOIN public.knowledge_entries ke ON ke.id = skl.kb_entry_id
        WHERE skl.story_id = ${validated.story_id}
          AND ke.deleted_at IS NULL
        ORDER BY skl.confidence DESC NULLS LAST
        LIMIT ${validated.max_kb_entries}
      `),

      // Applicable constraints (entry_type = 'constraint', matching story or global)
      db.execute(sql`
        SELECT
          id,
          content,
          tags,
          story_id,
          verified
        FROM public.knowledge_entries
        WHERE deleted_at IS NULL
          AND entry_type = 'constraint'
          AND (story_id = ${validated.story_id} OR story_id IS NULL)
        ORDER BY verified DESC, created_at DESC
        LIMIT 20
      `),
    ])

  // 3. Similar stories (optional, requires embedding)
  let similarStories: Awaited<ReturnType<typeof findSimilarStories>> = []

  if (validated.include_similar && story.embedding) {
    try {
      similarStories = await findSimilarStories(
        db,
        story.embedding,
        validated.max_similar_stories,
        undefined, // no feature filter — cross-feature similarity
      )
      // Remove self from results
      similarStories = similarStories.filter(s => s.story_id !== validated.story_id)
    } catch (error) {
      logger.warn('Similar story search failed (non-fatal)', {
        story_id: validated.story_id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  } else if (validated.include_similar && !story.embedding) {
    // Try to generate embedding on-the-fly
    try {
      const text = buildStoryEmbeddingText(story.title, story.feature, story.acceptanceCriteria)
      if (text.trim()) {
        const embedding = await embeddingClient.generateEmbedding(text)
        similarStories = await findSimilarStories(
          db,
          embedding,
          validated.max_similar_stories,
        )
        similarStories = similarStories.filter(s => s.story_id !== validated.story_id)

        // Save embedding for future queries (fire-and-forget)
        db.update(stories)
          .set({ embedding })
          .where(eq(stories.storyId, validated.story_id))
          .then(() => {})
          .catch(() => {})
      }
    } catch {
      // Embedding generation failed — skip similar stories
    }
  }

  const elapsed = Date.now() - startTime
  logger.info('kb_get_story_context completed', {
    story_id: validated.story_id,
    elapsed_ms: elapsed,
    artifacts: artifactsResult.length,
    linked_knowledge: (linkedKnowledgeResult.rows as unknown[]).length,
    similar_stories: similarStories.length,
    constraints: (constraintsResult.rows as unknown[]).length,
  })

  // Strip embedding from story response (too large)
  const { embedding: _embedding, ...storyWithoutEmbedding } = story

  return {
    story: storyWithoutEmbedding,
    detail: detailResult[0] ?? null,
    artifacts: artifactsResult,
    linked_knowledge: linkedKnowledgeResult.rows,
    similar_stories: similarStories,
    applicable_constraints: constraintsResult.rows,
    _meta: {
      elapsed_ms: elapsed,
    },
  }
}
