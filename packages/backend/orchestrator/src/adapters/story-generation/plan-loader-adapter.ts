/**
 * Plan Loader Adapter for Story Generation
 *
 * Production adapter that wraps kb_get_plan MCP tool as an injectable PlanLoaderFn.
 * Does NOT import from MCP server — caller provides the KB function.
 *
 * @see APRS-5030 AC-1
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { PlanLoaderFn } from '../../nodes/story-generation/load-refined-plan.js'

// ============================================================================
// Injectable KB Types
// ============================================================================

/**
 * Input schema for kb_get_plan MCP tool.
 */
export const KbGetPlanInputSchema = z.object({
  plan_slug: z.string().min(1),
})

export type KbGetPlanInput = z.infer<typeof KbGetPlanInputSchema>

/**
 * Schema for the KB plan response shape.
 * The KB returns a plan record with known top-level fields.
 * Unknown extra fields are allowed via passthrough() for forward compatibility.
 * NormalizedPlanSchema.safeParse handles missing/invalid fields downstream.
 */
export const KbPlanResponseSchema = z
  .object({
    plan_slug: z.string().optional(),
    title: z.string().optional(),
    summary: z.string().optional(),
    status: z.string().optional(),
    flows: z.array(z.record(z.unknown())).optional(),
  })
  .passthrough()

export type KbPlanResponse = z.infer<typeof KbPlanResponseSchema>

/**
 * Injectable function type for kb_get_plan.
 * In production, this delegates to the kb_get_plan MCP tool.
 * In tests, this can be mocked.
 *
 * Returns the plan record (camelCase fields) or null if not found.
 */
export type KbGetPlanFn = (input: KbGetPlanInput) => Promise<KbPlanResponse | null>

// ============================================================================
// Adapter Factory
// ============================================================================

/**
 * Creates a PlanLoaderFn that calls kb_get_plan via the injectable function.
 *
 * The returned function:
 * - Calls kbGetPlan({ plan_slug: planSlug })
 * - Returns the plan record as-is (NormalizedPlanSchema.safeParse handles missing fields)
 * - Returns null if kb_get_plan returns null or throws
 *
 * @param kbGetPlan - Injectable kb_get_plan function
 * @returns PlanLoaderFn compatible with createLoadRefinedPlanNode
 */
export function createPlanLoaderAdapter(kbGetPlan: KbGetPlanFn): PlanLoaderFn {
  return async (planSlug: string): Promise<Record<string, unknown> | null> => {
    logger.info('plan-loader-adapter: loading plan', { planSlug })

    try {
      const raw = await kbGetPlan({ plan_slug: planSlug })

      if (!raw) {
        logger.warn('plan-loader-adapter: plan not found', { planSlug })
        return null
      }

      // Validate the KB response shape — passthrough() preserves extra fields
      const parseResult = KbPlanResponseSchema.safeParse(raw)
      if (!parseResult.success) {
        logger.warn('plan-loader-adapter: unexpected KB response shape', {
          planSlug,
          errors: parseResult.error.flatten(),
        })
        // Return raw anyway — NormalizedPlanSchema.safeParse handles missing fields downstream
        return raw
      }

      const result = parseResult.data
      const flows = result.flows ?? []
      logger.info('plan-loader-adapter: plan loaded', {
        planSlug,
        hasFlows: flows.length > 0,
      })

      return result
    } catch (err) {
      logger.error('plan-loader-adapter: kb_get_plan failed', { err, planSlug })
      return null
    }
  }
}
