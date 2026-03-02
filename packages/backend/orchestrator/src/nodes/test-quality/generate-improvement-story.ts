/**
 * Test Improvement Story Generator
 *
 * Takes a DecayDetectionResult and generates a StoryArtifact-valid story
 * that can be ingested by the story pipeline for follow-up work.
 *
 * APIP-4040 AC-8
 */

import { z } from 'zod'
import {
  StoryArtifactSchema,
  type StoryArtifact,
} from '../../artifacts/story.js'
import type { DecayDetectionResult } from './schemas.js'

/**
 * Input options for story generation.
 */
export const ImprovementStoryOptionsSchema = z.object({
  /** Story ID for the generated story (e.g. 'APIP-4040-IMP-001') */
  storyId: z.string().regex(/^[A-Z]+-\d+/),
  /** Feature/epic the story belongs to */
  feature: z.string().default('autonomous-pipeline'),
  /** Follow-up from story ID */
  followUpFrom: z.string().nullable().default(null),
})

export type ImprovementStoryOptions = z.infer<typeof ImprovementStoryOptionsSchema>

/**
 * Generates a human-readable title from the decay result.
 */
function generateTitle(decay: DecayDetectionResult): string {
  const metricNames = decay.decayedMetrics.map(m => m.metric)
  if (metricNames.length === 0) {
    return 'Test Quality Improvement — general'
  }
  if (metricNames.length === 1) {
    return `Test Quality Improvement — ${metricNames[0]} decay`
  }
  return `Test Quality Improvement — ${metricNames.length} metrics decayed`
}

/**
 * Generates a detailed goal from the decay result.
 */
function generateGoal(decay: DecayDetectionResult): string {
  if (decay.decayedMetrics.length === 0) {
    return 'Improve overall test quality metrics to meet configured floors.'
  }

  const descriptions = decay.decayedMetrics.map(
    m => `- ${m.metric}: ${m.description}`,
  )
  return [
    'Address test quality regression(s) detected by the Test Quality Monitor:',
    ...descriptions,
  ].join('\n')
}

/**
 * Generates acceptance criteria from decayed metrics.
 */
function generateAcs(decay: DecayDetectionResult): StoryArtifact['acs'] {
  if (decay.decayedMetrics.length === 0) {
    return [
      {
        id: 'AC-1',
        description: 'Test quality metrics meet or exceed all configured floor values.',
        testable: true,
        automated: false,
      },
    ]
  }

  return decay.decayedMetrics.map((m, idx) => ({
    id: `AC-${idx + 1}`,
    description: `${m.metric} meets or exceeds floor ${m.floor} (currently ${m.currentValue.toFixed(2)}).`,
    testable: true,
    automated: true,
  }))
}

/**
 * Generates a StoryArtifact from a DecayDetectionResult.
 *
 * @param decay - The decay detection result containing decayed metrics
 * @param options - Story ID, feature, and follow-up context
 * @returns A valid StoryArtifact (validated via StoryArtifactSchema.parse)
 */
export function generateTestImprovementStory(
  decay: DecayDetectionResult,
  options: ImprovementStoryOptions,
): StoryArtifact {
  const now = new Date().toISOString()
  const opts = ImprovementStoryOptionsSchema.parse(options)

  const story: StoryArtifact = StoryArtifactSchema.parse({
    schema: 1,
    id: opts.storyId,
    feature: opts.feature,
    type: 'tech-debt',
    state: 'backlog',
    title: generateTitle(decay),
    points: null,
    priority: decay.decayedMetrics.length > 2 ? 'high' : 'medium',
    blocked_by: null,
    depends_on: [],
    follow_up_from: opts.followUpFrom,
    scope: {
      packages: ['packages/backend/orchestrator'],
      surfaces: ['testing'],
    },
    goal: generateGoal(decay),
    non_goals: [
      'AC-3 mutation testing (deferred to APIP-4040-B)',
      'Production application changes — this story is testing-only',
    ],
    acs: generateAcs(decay),
    risks: [],
    created_at: now,
    updated_at: now,
  })

  return story
}
