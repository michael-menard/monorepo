/**
 * KB Writer Adapter for Story Generation
 *
 * Production adapter that wraps kb_ingest_story_from_yaml + kb_update_plan MCP tools
 * as an injectable KbWriterFn. Sequentially writes each story, then updates plan
 * status to 'stories-created' on full success.
 *
 * @see APRS-5030 AC-2
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  KbWriterFn,
  KbStoryPayload,
  KbWriteResult,
} from '../../nodes/story-generation/write-to-kb.js'

// ============================================================================
// Injectable KB Types
// ============================================================================

/**
 * Input schema for kb_ingest_story_from_yaml MCP tool.
 * Maps KbStoryPayload fields to the ingest format.
 */
export const KbIngestStoryInputSchema = z.object({
  story_id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  feature: z.string(),
  tags: z.array(z.string()),
  acceptance_criteria: z.array(z.string()),
  subtasks: z.array(z.string()),
  risk: z.enum(['low', 'medium', 'high']),
  minimum_path: z.boolean(),
  parent_plan_slug: z.string(),
  parent_flow_id: z.string(),
  flow_step_reference: z.string(),
  dependencies: z.array(
    z.object({
      depends_on: z.string(),
      type: z.string(),
    }),
  ),
})

export type KbIngestStoryInput = z.infer<typeof KbIngestStoryInputSchema>

/**
 * Injectable function type for kb_ingest_story_from_yaml.
 * In production, this delegates to the MCP tool.
 * In tests, this can be mocked.
 *
 * Returns { story_id } on success, null on failure.
 */
export type KbIngestStoryFn = (input: KbIngestStoryInput) => Promise<{ story_id: string } | null>

/**
 * Input schema for kb_update_plan MCP tool.
 */
export const KbUpdatePlanInputSchema = z.object({
  plan_slug: z.string().min(1),
  status: z.enum([
    'draft',
    'accepted',
    'stories-created',
    'in-progress',
    'implemented',
    'superseded',
    'archived',
    'blocked',
  ]),
})

export type KbUpdatePlanInput = z.infer<typeof KbUpdatePlanInputSchema>

/**
 * Injectable function type for kb_update_plan.
 * In production, this delegates to the MCP tool.
 * In tests, this can be mocked.
 *
 * Returns { plan_slug } on success, null on failure.
 */
export type KbUpdatePlanFn = (input: KbUpdatePlanInput) => Promise<{ plan_slug: string } | null>

// ============================================================================
// Adapter Factory
// ============================================================================

/**
 * Creates a KbWriterFn that sequentially writes stories via kb_ingest_story_from_yaml
 * and updates the plan status to 'stories-created' on full success.
 *
 * Behavior:
 * - Calls kb_ingest_story_from_yaml sequentially for each story
 * - Maps KbStoryPayload fields to ingest format
 * - If all stories succeed and updatePlanStatus=true, calls kb_update_plan
 * - Returns results array + planUpdated flag
 *
 * @param kbIngestStory - Injectable kb_ingest_story_from_yaml function
 * @param kbUpdatePlan - Injectable kb_update_plan function
 * @returns KbWriterFn compatible with createWriteToKbNode
 */
export function createKbWriterAdapter(
  kbIngestStory: KbIngestStoryFn,
  kbUpdatePlan: KbUpdatePlanFn,
): KbWriterFn {
  return async (
    stories: KbStoryPayload[],
    planSlug: string,
    updatePlanStatus: boolean,
  ): Promise<{ results: KbWriteResult[]; planUpdated: boolean }> => {
    logger.info('kb-writer-adapter: writing stories', {
      planSlug,
      storyCount: stories.length,
      updatePlanStatus,
    })

    const results: KbWriteResult[] = []

    // Sequentially write each story
    for (const story of stories) {
      try {
        const input: KbIngestStoryInput = {
          story_id: story.story_id,
          title: story.title,
          description: story.description,
          feature: story.feature,
          tags: story.tags,
          acceptance_criteria: story.acceptance_criteria,
          subtasks: story.subtasks,
          risk: story.risk,
          minimum_path: story.minimum_path,
          parent_plan_slug: story.parent_plan_slug,
          parent_flow_id: story.parent_flow_id,
          flow_step_reference: story.flow_step_reference,
          dependencies: story.dependencies,
        }

        const result = await kbIngestStory(input)

        if (result) {
          results.push({ success: true, story_id: story.story_id })
          logger.info('kb-writer-adapter: story written', { storyId: story.story_id })
        } else {
          results.push({
            success: false,
            story_id: story.story_id,
            error: 'kb_ingest_story_from_yaml returned null',
          })
          logger.warn('kb-writer-adapter: story write returned null', {
            storyId: story.story_id,
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({ success: false, story_id: story.story_id, error: message })
        logger.error('kb-writer-adapter: story write failed', {
          err,
          storyId: story.story_id,
        })
      }
    }

    // Update plan status only if all stories succeeded
    const allSucceeded = results.every(r => r.success)
    let planUpdated = false

    if (updatePlanStatus && allSucceeded && stories.length > 0) {
      try {
        const updateResult = await kbUpdatePlan({
          plan_slug: planSlug,
          status: 'stories-created',
        })
        planUpdated = updateResult !== null

        if (planUpdated) {
          logger.info('kb-writer-adapter: plan status updated to stories-created', { planSlug })
        } else {
          logger.warn('kb-writer-adapter: kb_update_plan returned null', { planSlug })
        }
      } catch (err) {
        logger.error('kb-writer-adapter: plan update failed', { err, planSlug })
        planUpdated = false
      }
    }

    logger.info('kb-writer-adapter: complete', {
      planSlug,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      planUpdated,
    })

    return { results, planUpdated }
  }
}
