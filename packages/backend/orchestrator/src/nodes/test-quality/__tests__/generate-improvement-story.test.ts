/**
 * Unit tests for generateTestImprovementStory
 *
 * Validates that the output parses against StoryArtifactSchema.
 *
 * APIP-4040 AC-12(d)
 */

import { describe, it, expect } from 'vitest'
import { generateTestImprovementStory } from '../generate-improvement-story.js'
import { StoryArtifactSchema } from '../../../artifacts/story.js'
import {
  DecayDetectionResultSchema,
  TestQualityMonitorConfigSchema,
  type DecayDetectionResult,
  type DecayedMetric,
} from '../schemas.js'

function makeDecayResult(overrides: Partial<DecayDetectionResult> = {}): DecayDetectionResult {
  return DecayDetectionResultSchema.parse({
    decayed: true,
    decayedMetrics: [
      {
        metric: 'assertionDensityRatio',
        previousValue: 2.0,
        currentValue: 1.0,
        floor: 1.5,
        description: 'Assertion density 1.00 is below the floor 1.5',
      } satisfies DecayedMetric,
    ],
    previousSnapshotAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    currentSnapshotAt: new Date().toISOString(),
    ...overrides,
  })
}

describe('generateTestImprovementStory', () => {
  it('generates a story that validates against StoryArtifactSchema', () => {
    const decay = makeDecayResult()
    const story = generateTestImprovementStory(decay, {
      storyId: 'APIP-9999',
      feature: 'autonomous-pipeline',
      followUpFrom: 'APIP-4040',
    })

    expect(() => StoryArtifactSchema.parse(story)).not.toThrow()
  })

  it('generates a backlog story with type tech-debt', () => {
    const decay = makeDecayResult()
    const story = generateTestImprovementStory(decay, {
      storyId: 'APIP-9999',
      feature: 'autonomous-pipeline',
      followUpFrom: 'APIP-4040',
    })

    expect(story.state).toBe('backlog')
    expect(story.type).toBe('tech-debt')
  })

  it('sets follow_up_from to the provided value', () => {
    const decay = makeDecayResult()
    const story = generateTestImprovementStory(decay, {
      storyId: 'APIP-9999',
      feature: 'autonomous-pipeline',
      followUpFrom: 'APIP-4040',
    })

    expect(story.follow_up_from).toBe('APIP-4040')
  })

  it('includes one AC per decayed metric', () => {
    const decay = makeDecayResult({
      decayedMetrics: [
        {
          metric: 'assertionDensityRatio',
          previousValue: 2.0,
          currentValue: 1.0,
          floor: 1.5,
          description: 'Assertion density decayed',
        },
        {
          metric: 'orphanedTestCount',
          previousValue: 0,
          currentValue: 3,
          floor: 0,
          description: 'Orphaned test count increased',
        },
      ],
    })

    const story = generateTestImprovementStory(decay, {
      storyId: 'APIP-9999',
      feature: 'autonomous-pipeline',
      followUpFrom: null,
    })

    expect(story.acs).toHaveLength(2)
    expect(story.acs[0]?.id).toBe('AC-1')
    expect(story.acs[1]?.id).toBe('AC-2')
  })

  it('uses medium priority for 1 decayed metric', () => {
    const decay = makeDecayResult()
    const story = generateTestImprovementStory(decay, {
      storyId: 'APIP-9999',
      feature: 'autonomous-pipeline',
      followUpFrom: null,
    })

    expect(story.priority).toBe('medium')
  })

  it('uses high priority for more than 2 decayed metrics', () => {
    const decay = makeDecayResult({
      decayedMetrics: [
        { metric: 'assertionDensityRatio', previousValue: 2.0, currentValue: 1.0, floor: 1.5, description: 'a' },
        { metric: 'orphanedTestCount', previousValue: 0, currentValue: 5, floor: 0, description: 'b' },
        { metric: 'criticalPathLineCoverage', previousValue: 90, currentValue: 60, floor: 80, description: 'c' },
      ],
    })
    const story = generateTestImprovementStory(decay, {
      storyId: 'APIP-9999',
      feature: 'autonomous-pipeline',
      followUpFrom: null,
    })

    expect(story.priority).toBe('high')
  })

  it('includes the storyId in the generated story', () => {
    const decay = makeDecayResult()
    const story = generateTestImprovementStory(decay, {
      storyId: 'APIP-8888',
      feature: 'autonomous-pipeline',
      followUpFrom: null,
    })

    expect(story.id).toBe('APIP-8888')
  })

  it('sets scope.surfaces to ["testing"]', () => {
    const decay = makeDecayResult()
    const story = generateTestImprovementStory(decay, {
      storyId: 'APIP-9999',
      feature: 'autonomous-pipeline',
      followUpFrom: null,
    })

    expect(story.scope.surfaces).toContain('testing')
  })

  it('generates a non-empty title and goal', () => {
    const decay = makeDecayResult()
    const story = generateTestImprovementStory(decay, {
      storyId: 'APIP-9999',
      feature: 'autonomous-pipeline',
      followUpFrom: null,
    })

    expect(story.title.length).toBeGreaterThan(0)
    expect(story.goal.length).toBeGreaterThan(0)
  })

  it('handles empty decay metrics list gracefully', () => {
    const decay = makeDecayResult({ decayed: false, decayedMetrics: [] })
    const story = generateTestImprovementStory(decay, {
      storyId: 'APIP-9999',
      feature: 'autonomous-pipeline',
      followUpFrom: null,
    })

    expect(() => StoryArtifactSchema.parse(story)).not.toThrow()
    expect(story.acs).toHaveLength(1)
  })
})
