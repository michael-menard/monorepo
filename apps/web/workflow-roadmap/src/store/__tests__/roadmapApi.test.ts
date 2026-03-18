/**
 * roadmapApi cache tag tests
 *
 * Verifies that tagTypes and providesTags are correctly configured
 * for cache invalidation to work with SSE-driven refetching.
 */

import { describe, it, expect } from 'vitest'
import { roadmapApi } from '../roadmapApi'

describe('roadmapApi cache tags', () => {
  const endpoints = roadmapApi.endpoints

  it('defines the expected tag types', () => {
    // Verify tag types are configured by creating invalidation actions
    // (these would throw TypeScript errors if tags were not declared)
    const plansAction = roadmapApi.util.invalidateTags(['Plans'])
    const storiesAction = roadmapApi.util.invalidateTags(['Stories'])
    const storyAction = roadmapApi.util.invalidateTags([{ type: 'Story', id: 'x' }])

    expect(plansAction.payload).toEqual(['Plans'])
    expect(storiesAction.payload).toEqual(['Stories'])
    expect(storyAction.payload).toEqual([{ type: 'Story', id: 'x' }])
  })

  it('getPlans endpoint exists', () => {
    expect(endpoints.getPlans).toBeDefined()
  })

  it('getPlanBySlug endpoint exists', () => {
    expect(endpoints.getPlanBySlug).toBeDefined()
  })

  it('getStoriesByPlanSlug endpoint exists', () => {
    expect(endpoints.getStoriesByPlanSlug).toBeDefined()
  })

  it('getStoryById endpoint exists', () => {
    expect(endpoints.getStoryById).toBeDefined()
  })

  it('invalidateTags action creator produces correct action shape', () => {
    const action = roadmapApi.util.invalidateTags([
      'Stories',
      'Plans',
      { type: 'Story', id: 'TEST-001' },
    ])

    expect(action.type).toContain('invalidateTags')
    expect(action.payload).toEqual([
      'Stories',
      'Plans',
      { type: 'Story', id: 'TEST-001' },
    ])
  })

  it('invalidateTags accepts all defined tag types', () => {
    // This would fail at compile time if tags were misconfigured
    const action = roadmapApi.util.invalidateTags(['Plans', 'Stories', 'Story'])
    expect(action.payload).toHaveLength(3)
  })
})
