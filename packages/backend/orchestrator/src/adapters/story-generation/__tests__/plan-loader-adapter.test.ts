/**
 * Unit tests for plan-loader-adapter
 *
 * @see APRS-5030 AC-9
 */

import { describe, it, expect, vi } from 'vitest'
import {
  createPlanLoaderAdapter,
} from '../plan-loader-adapter.js'
import type { KbGetPlanFn } from '../plan-loader-adapter.js'

describe('createPlanLoaderAdapter', () => {
  it('returns a PlanLoaderFn', () => {
    const kbGetPlan: KbGetPlanFn = vi.fn()
    const loader = createPlanLoaderAdapter(kbGetPlan)
    expect(typeof loader).toBe('function')
  })

  it('calls kbGetPlan with { plan_slug: planSlug }', async () => {
    const kbGetPlan: KbGetPlanFn = vi.fn().mockResolvedValue({ planSlug: 'test-plan', title: 'Test' })
    const loader = createPlanLoaderAdapter(kbGetPlan)

    await loader('test-plan')

    expect(kbGetPlan).toHaveBeenCalledWith({ plan_slug: 'test-plan' })
  })

  it('returns the plan record when kb_get_plan succeeds', async () => {
    const planRecord = {
      planSlug: 'my-plan',
      title: 'My Plan',
      flows: [],
    }
    const kbGetPlan: KbGetPlanFn = vi.fn().mockResolvedValue(planRecord)
    const loader = createPlanLoaderAdapter(kbGetPlan)

    const result = await loader('my-plan')

    expect(result).toEqual(planRecord)
  })

  it('returns null when kb_get_plan returns null (plan not found)', async () => {
    const kbGetPlan: KbGetPlanFn = vi.fn().mockResolvedValue(null)
    const loader = createPlanLoaderAdapter(kbGetPlan)

    const result = await loader('missing-plan')

    expect(result).toBeNull()
  })

  it('returns null and does not throw when kb_get_plan throws', async () => {
    const kbGetPlan: KbGetPlanFn = vi.fn().mockRejectedValue(new Error('KB unavailable'))
    const loader = createPlanLoaderAdapter(kbGetPlan)

    const result = await loader('any-plan')

    expect(result).toBeNull()
  })

  it('passes through the full plan record including nested fields', async () => {
    const planRecord = {
      planSlug: 'complex-plan',
      title: 'Complex Plan',
      flows: [
        {
          id: 'flow-1',
          name: 'User Flow',
          actor: 'User',
          trigger: 'Click',
          steps: [{ index: 1, description: 'Do thing' }],
          successOutcome: 'Done',
          source: 'user',
          confidence: 1.0,
          status: 'confirmed',
        },
      ],
      tags: ['feature', 'mvp'],
      priority: 'high',
    }
    const kbGetPlan: KbGetPlanFn = vi.fn().mockResolvedValue(planRecord)
    const loader = createPlanLoaderAdapter(kbGetPlan)

    const result = await loader('complex-plan')

    expect(result).toEqual(planRecord)
    expect(result?.['flows']).toHaveLength(1)
  })
})
