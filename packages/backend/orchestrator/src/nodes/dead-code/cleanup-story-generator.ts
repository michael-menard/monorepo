/**
 * Dead Code Reaper — Cleanup Story Generator
 *
 * Generates a CLEANUP-NNNN story.yaml in the backlog when dead code findings
 * exceed a threshold. Uses CLEANUP-NNNN format (NOT APIP-CLEANUP-NNNN).
 *
 * APIP-4050: Dead Code Reaper — Monthly Cron Analysis and CLEANUP Story Generation
 * ARCH-002: Use the monorepo root path for backlog scanning (not worktree path)
 */

import { readdirSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import * as yaml from 'js-yaml'
import { createStoryArtifact, StoryArtifactSchema } from '../../artifacts/story.js'
import type { DeadCodeReaperResult } from './schemas.js'

/**
 * Directory where CLEANUP stories are written.
 * Relative to the monorepo root.
 */
const BACKLOG_DIR = 'plans/future/platform/autonomous-pipeline/backlog'

/**
 * Pattern to match CLEANUP-NNNN directory names.
 */
const CLEANUP_DIR_PATTERN = /^CLEANUP-(\d+)$/

/**
 * Find the next CLEANUP sequence number by scanning the backlog directory.
 *
 * @param backlogPath - Absolute path to the backlog directory
 * @returns Next CLEANUP number (e.g., if CLEANUP-0003 exists, returns 4)
 */
function getNextCleanupNumber(backlogPath: string): number {
  let maxN = 0

  try {
    const entries = readdirSync(backlogPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const match = entry.name.match(CLEANUP_DIR_PATTERN)
      if (match) {
        const n = parseInt(match[1], 10)
        if (n > maxN) maxN = n
      }
    }
  } catch {
    // Backlog directory doesn't exist yet — start from 0
    maxN = 0
  }

  return maxN + 1
}

/**
 * Format a CLEANUP story ID with zero-padded 4-digit number.
 * e.g., 1 → "CLEANUP-0001", 42 → "CLEANUP-0042"
 */
function formatCleanupId(n: number): string {
  return `CLEANUP-${String(n).padStart(4, '0')}`
}

/**
 * Build the story title from the reaper result.
 */
function buildTitle(result: DeadCodeReaperResult): string {
  const parts: string[] = []

  if (result.deadExports.length > 0) {
    parts.push(`${result.deadExports.length} dead export(s)`)
  }
  if (result.unusedFiles.length > 0) {
    parts.push(`${result.unusedFiles.length} unused file(s)`)
  }
  if (result.unusedDeps.length > 0) {
    parts.push(`${result.unusedDeps.length} unused dep(s)`)
  }

  const summary = parts.length > 0 ? parts.join(', ') : 'dead code findings'
  return `Dead Code Cleanup — ${summary} identified by monthly reaper`
}

/**
 * Build the story goal from the reaper result.
 */
function buildGoal(result: DeadCodeReaperResult): string {
  return [
    'Remove dead code identified by the monthly Dead Code Reaper cron job.',
    `Total findings: ${result.summary.findingsTotal}.`,
    `Verified safe deletions: ${result.summary.verifiedDeletions}.`,
    `False positives filtered: ${result.summary.falsePositives}.`,
    'Each finding has been micro-verified via targeted tsc analysis.',
  ].join(' ')
}

/**
 * Generate a CLEANUP-NNNN story artifact and write it to the backlog.
 *
 * @param result - The Dead Code Reaper result
 * @param repoRoot - Absolute path to the monorepo root (defaults to process.cwd())
 * @returns The path to the written story.yaml file
 */
export function generateCleanupStory(
  result: DeadCodeReaperResult,
  repoRoot: string = process.cwd(),
): string {
  const backlogPath = join(repoRoot, BACKLOG_DIR)
  const nextN = getNextCleanupNumber(backlogPath)
  const storyId = formatCleanupId(nextN)

  const title = buildTitle(result)
  const goal = buildGoal(result)

  const story = createStoryArtifact(storyId, 'autonomous-pipeline', title, goal, {
    type: 'tech-debt',
    state: 'backlog',
    points: Math.min(13, Math.ceil(result.summary.verifiedDeletions / 5) + 1) || 2,
    priority: result.summary.verifiedDeletions >= 10 ? 'high' : 'medium',
    scope: {
      packages: ['@repo/orchestrator'],
      surfaces: ['backend'],
    },
    acs: result.deadExports.slice(0, 10).map((f, i) => ({
      id: `AC-${String(i + 1).padStart(3, '0')}`,
      description: `Remove dead export '${f.exportName}' from ${f.filePath}`,
      testable: true,
      automated: false,
    })),
  })

  // Validate before writing
  StoryArtifactSchema.parse(story)

  // Serialize to YAML
  const storyYaml = yaml.dump(story, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  })

  // Write to backlog
  const storyDir = join(backlogPath, storyId)
  mkdirSync(storyDir, { recursive: true })

  const storyPath = join(storyDir, 'story.yaml')
  writeFileSync(storyPath, storyYaml, 'utf-8')

  return storyPath
}
