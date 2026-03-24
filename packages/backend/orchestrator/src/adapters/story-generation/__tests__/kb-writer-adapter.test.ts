/**
 * Unit tests for kb-writer-adapter
 *
 * @see APRS-5030 AC-9
 */

import { describe, it, expect, vi } from 'vitest'
import { createKbWriterAdapter } from '../kb-writer-adapter.js'
import type { KbIngestStoryFn, KbUpdatePlanFn } from '../kb-writer-adapter.js'
import type { KbStoryPayload } from '../../../nodes/story-generation/write-to-kb.js'

// ============================================================================
// Fixtures
// ============================================================================

function makeStory(overrides?: Partial<KbStoryPayload>): KbStoryPayload {
  return {
    story_id: 'AUTH-1010',
    title: 'User Login',
    description: 'As a user I can log in',
    feature: 'auth-plan',
    tags: ['auth'],
    acceptance_criteria: ['User can log in with email/password'],
    subtasks: ['Implement login endpoint'],
    risk: 'low',
    minimum_path: true,
    parent_plan_slug: 'auth-plan',
    parent_flow_id: 'flow-1',
    flow_step_reference: 'steps 1-2',
    dependencies: [],
    ...overrides,
  }
}

// ============================================================================
// createKbWriterAdapter
// ============================================================================

describe('createKbWriterAdapter', () => {
  it('returns a KbWriterFn', () => {
    const kbIngestStory: KbIngestStoryFn = vi.fn()
    const kbUpdatePlan: KbUpdatePlanFn = vi.fn()
    const writer = createKbWriterAdapter(kbIngestStory, kbUpdatePlan)
    expect(typeof writer).toBe('function')
  })

  it('calls kbIngestStory for each story', async () => {
    const kbIngestStory: KbIngestStoryFn = vi
      .fn()
      .mockResolvedValue({ story_id: 'AUTH-1010' })
    const kbUpdatePlan: KbUpdatePlanFn = vi.fn().mockResolvedValue({ plan_slug: 'auth-plan' })
    const writer = createKbWriterAdapter(kbIngestStory, kbUpdatePlan)

    const stories = [makeStory(), makeStory({ story_id: 'AUTH-1020', title: 'Registration' })]
    await writer(stories, 'auth-plan', false)

    expect(kbIngestStory).toHaveBeenCalledTimes(2)
  })

  it('maps KbStoryPayload fields to ingest input correctly', async () => {
    const kbIngestStory: KbIngestStoryFn = vi
      .fn()
      .mockResolvedValue({ story_id: 'AUTH-1010' })
    const kbUpdatePlan: KbUpdatePlanFn = vi.fn()
    const writer = createKbWriterAdapter(kbIngestStory, kbUpdatePlan)

    const story = makeStory()
    await writer([story], 'auth-plan', false)

    expect(kbIngestStory).toHaveBeenCalledWith(
      expect.objectContaining({
        story_id: 'AUTH-1010',
        title: 'User Login',
        description: 'As a user I can log in',
        feature: 'auth-plan',
        tags: ['auth'],
        acceptance_criteria: ['User can log in with email/password'],
        risk: 'low',
        minimum_path: true,
        parent_plan_slug: 'auth-plan',
        parent_flow_id: 'flow-1',
      }),
    )
  })

  it('returns success results for all stories on success', async () => {
    const kbIngestStory: KbIngestStoryFn = vi.fn().mockImplementation(async input => ({
      story_id: input.story_id,
    }))
    const kbUpdatePlan: KbUpdatePlanFn = vi.fn().mockResolvedValue({ plan_slug: 'auth-plan' })
    const writer = createKbWriterAdapter(kbIngestStory, kbUpdatePlan)

    const stories = [makeStory(), makeStory({ story_id: 'AUTH-1020' })]
    const { results, planUpdated: _planUpdated } = await writer(stories, 'auth-plan', false)

    expect(results).toHaveLength(2)
    expect(results.every(r => r.success)).toBe(true)
  })

  it('updates plan status to stories-created on full success when updatePlanStatus=true', async () => {
    const kbIngestStory: KbIngestStoryFn = vi.fn().mockResolvedValue({ story_id: 'AUTH-1010' })
    const kbUpdatePlan: KbUpdatePlanFn = vi.fn().mockResolvedValue({ plan_slug: 'auth-plan' })
    const writer = createKbWriterAdapter(kbIngestStory, kbUpdatePlan)

    const { planUpdated } = await writer([makeStory()], 'auth-plan', true)

    expect(kbUpdatePlan).toHaveBeenCalledWith({
      plan_slug: 'auth-plan',
      status: 'stories-created',
    })
    expect(planUpdated).toBe(true)
  })

  it('does NOT update plan status when updatePlanStatus=false', async () => {
    const kbIngestStory: KbIngestStoryFn = vi.fn().mockResolvedValue({ story_id: 'AUTH-1010' })
    const kbUpdatePlan: KbUpdatePlanFn = vi.fn()
    const writer = createKbWriterAdapter(kbIngestStory, kbUpdatePlan)

    await writer([makeStory()], 'auth-plan', false)

    expect(kbUpdatePlan).not.toHaveBeenCalled()
  })

  it('does NOT update plan status when any story fails', async () => {
    const kbIngestStory: KbIngestStoryFn = vi
      .fn()
      .mockResolvedValueOnce({ story_id: 'AUTH-1010' })
      .mockResolvedValueOnce(null) // second story fails
    const kbUpdatePlan: KbUpdatePlanFn = vi.fn()
    const writer = createKbWriterAdapter(kbIngestStory, kbUpdatePlan)

    const stories = [makeStory(), makeStory({ story_id: 'AUTH-1020' })]
    const { planUpdated } = await writer(stories, 'auth-plan', true)

    expect(kbUpdatePlan).not.toHaveBeenCalled()
    expect(planUpdated).toBe(false)
  })

  it('returns failed result when kbIngestStory returns null', async () => {
    const kbIngestStory: KbIngestStoryFn = vi.fn().mockResolvedValue(null)
    const kbUpdatePlan: KbUpdatePlanFn = vi.fn()
    const writer = createKbWriterAdapter(kbIngestStory, kbUpdatePlan)

    const { results } = await writer([makeStory()], 'auth-plan', false)

    expect(results[0]!.success).toBe(false)
    expect(results[0]!.error).toBeTruthy()
  })

  it('returns failed result when kbIngestStory throws', async () => {
    const kbIngestStory: KbIngestStoryFn = vi
      .fn()
      .mockRejectedValue(new Error('DB write error'))
    const kbUpdatePlan: KbUpdatePlanFn = vi.fn()
    const writer = createKbWriterAdapter(kbIngestStory, kbUpdatePlan)

    const { results } = await writer([makeStory()], 'auth-plan', false)

    expect(results[0]!.success).toBe(false)
    expect(results[0]!.error).toContain('DB write error')
  })

  it('handles empty stories array (returns planUpdated=false)', async () => {
    const kbIngestStory: KbIngestStoryFn = vi.fn()
    const kbUpdatePlan: KbUpdatePlanFn = vi.fn()
    const writer = createKbWriterAdapter(kbIngestStory, kbUpdatePlan)

    const { results, planUpdated } = await writer([], 'auth-plan', true)

    expect(results).toHaveLength(0)
    expect(planUpdated).toBe(false)
    expect(kbIngestStory).not.toHaveBeenCalled()
    expect(kbUpdatePlan).not.toHaveBeenCalled()
  })
})
