/**
 * Cohesion Cleanup Story Generator
 *
 * Generates cleanup stories when a cohesion category falls below its
 * configured threshold. Includes a deduplication guard: if a story for
 * the same category was written within the deduplication window, no new
 * story is created.
 *
 * Story: APIP-4020 - Cohesion Scanner
 */

import { writeFileSync, mkdirSync, existsSync, readdirSync, statSync, readFileSync } from 'fs'
import { join } from 'path'
import { logger } from '@repo/logger'
import { createStoryArtifact } from '../../artifacts/story.js'
import {
  StoryGenerationResultSchema,
  type CohesionCleanupStoryInput,
  type StoryGenerationResult,
} from './__types__/index.js'

// ============================================================================
// Constants
// ============================================================================

/** Story ID prefix for cohesion cleanup stories */
const COHCLEAN_PREFIX = 'COHCLEAN'

/** Directory where cleanup stories are written (relative to feature_dir) */
const CLEANUP_STORIES_DIR = 'plans/future/platform/cohesion-cleanup/backlog'

// ============================================================================
// Helpers
// ============================================================================

/**
 * Pads a number with leading zeros to a minimum width of 4 digits.
 */
function padId(n: number): string {
  return n.toString().padStart(4, '0')
}

/**
 * Finds the next available COHCLEAN story number by scanning the backlog directory.
 *
 * @param backlogDir - Absolute path to the cohesion cleanup backlog directory
 * @returns Next story number (e.g. 1 → "COHCLEAN-0001")
 */
function nextStoryNumber(backlogDir: string): number {
  if (!existsSync(backlogDir)) return 1

  let maxNum = 0
  for (const entry of readdirSync(backlogDir)) {
    const match = entry.match(/^COHCLEAN-(\d+)$/)
    if (match?.[1]) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10))
    }
  }
  return maxNum + 1
}

/**
 * Checks if a cleanup story for the given category already exists within
 * the deduplication window.
 *
 * @param backlogDir - Absolute path to the backlog directory
 * @param category - Cohesion category to check
 * @param windowDays - Deduplication window in days
 * @returns Path to existing story if found within window, null otherwise
 */
function findExistingStory(
  backlogDir: string,
  category: string,
  windowDays: number,
): string | null {
  if (!existsSync(backlogDir)) return null

  const windowMs = windowDays * 24 * 60 * 60 * 1000
  const cutoff = Date.now() - windowMs

  for (const entry of readdirSync(backlogDir)) {
    if (!entry.startsWith('COHCLEAN-')) continue

    const storyDir = join(backlogDir, entry)
    const storyYamlPath = join(storyDir, 'story.yaml')

    if (!existsSync(storyYamlPath)) continue

    // Check creation time of the story.yaml
    const stats = statSync(storyYamlPath)
    if (stats.mtimeMs < cutoff) continue

    // Check if this story is for the same category
    try {
      const content = readFileSync(storyYamlPath, 'utf-8')
      if (content.includes(`cohesion-${category}`) || content.includes(`category: ${category}`)) {
        return storyYamlPath
      }
    } catch {
      // Ignore unreadable stories
    }
  }

  return null
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Configuration for the story generator.
 */
export interface StoryGeneratorConfig {
  /** Absolute path to the monorepo root (used to construct output paths) */
  repoRoot: string
  /** Number of days within which duplicate stories are suppressed */
  deduplicationWindowDays: number
}

/**
 * Generates a cohesion cleanup story for a category that fell below threshold.
 * Includes deduplication guard to prevent creating duplicate stories.
 *
 * AC-7: Below-threshold category writes COHCLEAN-NNNN/story.yaml
 * AC-8: Second call within deduplicationWindowDays returns existing path, no new file
 *
 * @param input - Cleanup story input (category, score, violations)
 * @param config - Generator configuration
 * @returns Story generation result
 */
export async function generateCohesionCleanupStory(
  input: CohesionCleanupStoryInput,
  config: StoryGeneratorConfig,
): Promise<StoryGenerationResult> {
  const backlogDir = join(config.repoRoot, CLEANUP_STORIES_DIR)

  logger.info('Checking for duplicate cohesion cleanup story', {
    category: input.category,
    deduplicationWindowDays: config.deduplicationWindowDays,
  })

  // Deduplication check
  const existingPath = findExistingStory(backlogDir, input.category, config.deduplicationWindowDays)
  if (existingPath) {
    logger.warn('Duplicate cohesion cleanup story suppressed', {
      category: input.category,
      existingPath,
    })
    return StoryGenerationResultSchema.parse({
      created: false,
      storyPath: existingPath,
      deduplicationReason:
        `A cleanup story for category '${input.category}' was already created ` +
        `within the last ${config.deduplicationWindowDays} days.`,
    })
  }

  // Assign story ID
  const storyNumber = nextStoryNumber(backlogDir)
  const storyId = `${COHCLEAN_PREFIX}-${padId(storyNumber)}`
  const storyDir = join(backlogDir, storyId)

  logger.info('Generating cohesion cleanup story', {
    storyId,
    category: input.category,
    score: input.score,
    threshold: input.threshold,
  })

  // Build violation summary for goal/AC text
  const violationExamples = input.topViolations
    .slice(0, 5)
    .map(v => `  - ${v.filePath}: ${v.description}`)
    .join('\n')

  const story = createStoryArtifact(
    storyId,
    'cohesion-cleanup',
    `Fix ${input.category} cohesion violations`,
    `Bring ${input.category} pattern compliance above the ${(input.threshold * 100).toFixed(0)}% ` +
      `threshold (currently ${(input.score * 100).toFixed(1)}%). ` +
      `Address violations detected on ${input.scannedAt}.`,
    {
      type: 'tech-debt',
      state: 'backlog',
      priority: 'medium',
      scope: {
        packages: [],
        surfaces: ['backend'],
      },
      acs: [
        {
          id: 'AC-1',
          description:
            `All ${input.category} violations in the scanned codebase are resolved. ` +
            `Example violations:\n${violationExamples}`,
          testable: true,
          automated: false,
        },
        {
          id: 'AC-2',
          description:
            `Re-running the cohesion scanner against ${input.rootDir} produces a ` +
            `${input.category} score >= ${(input.threshold * 100).toFixed(0)}%.`,
          testable: true,
          automated: true,
        },
      ],
      non_goals: [
        'Refactoring unrelated code not flagged by the cohesion scanner',
        'Changing business logic while fixing pattern violations',
      ],
    },
  )

  // Write story.yaml to disk
  mkdirSync(storyDir, { recursive: true })
  const storyYamlPath = join(storyDir, 'story.yaml')

  const yaml = buildStoryYaml(story, input)
  writeFileSync(storyYamlPath, yaml, 'utf-8')

  logger.info('Cohesion cleanup story written', { storyId, path: storyYamlPath })

  return StoryGenerationResultSchema.parse({
    created: true,
    storyPath: storyYamlPath,
    storyId,
  })
}

/**
 * Serializes a story artifact to YAML format.
 * Uses a minimal hand-written serializer to avoid a full yaml library dependency.
 */
function buildStoryYaml(
  story: ReturnType<typeof createStoryArtifact>,
  input: CohesionCleanupStoryInput,
): string {
  const lines: string[] = [
    `schema: ${story.schema}`,
    `id: ${story.id}`,
    `feature: ${story.feature}`,
    `type: ${story.type}`,
    `state: ${story.state}`,
    `title: "${story.title}"`,
    `points: ~`,
    `priority: ${story.priority}`,
    `blocked_by: ~`,
    `depends_on: []`,
    `follow_up_from: ~`,
    `scope:`,
    `  packages: []`,
    `  surfaces: [backend]`,
    `goal: >-`,
    `  ${story.goal.replace(/\n/g, '\n  ')}`,
    `non_goals:`,
    ...story.non_goals.map(g => `  - "${g}"`),
    `acs:`,
    ...story.acs.flatMap(ac => [
      `  - id: ${ac.id}`,
      `    description: >-`,
      `      ${ac.description.replace(/\n/g, '\n      ')}`,
      `    testable: ${ac.testable}`,
      `    automated: ${ac.automated}`,
    ]),
    `risks: []`,
    `created_at: "${story.created_at}"`,
    `updated_at: "${story.updated_at}"`,
    `# cohesion scanner metadata`,
    `# category: ${input.category}`,
    `# score_at_creation: ${input.score}`,
    `# threshold: ${input.threshold}`,
    `# scanned_at: ${input.scannedAt}`,
    '',
  ]
  return lines.join('\n')
}
