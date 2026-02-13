import { readFile, readdir } from 'fs/promises'
import { join } from 'path'

import type { CodeAuditState } from '../../graphs/code-audit.js'
import type { DedupResult } from '../../artifacts/audit-findings.js'

/**
 * Deduplicate Node
 *
 * Check findings against existing stories in stories.index.md files
 * to avoid creating duplicate work items.
 */

/**
 * Simple string similarity (Jaccard on words)
 */
function wordSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/))
  const wordsB = new Set(b.toLowerCase().split(/\s+/))
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)))
  const union = new Set([...wordsA, ...wordsB])
  return union.size > 0 ? intersection.size / union.size : 0
}

/**
 * Load story titles from all stories.index.md files
 */
async function loadExistingStoryTitles(plansDir: string): Promise<Map<string, string>> {
  const titles = new Map<string, string>()

  try {
    const features = await readdir(join(plansDir, 'future'), { withFileTypes: true })
    for (const feature of features) {
      if (!feature.isDirectory()) continue
      const indexPath = join(plansDir, 'future', feature.name, 'stories.index.md')
      try {
        const content = await readFile(indexPath, 'utf-8')
        // Parse story entries: lines like "| STORY-001 | Title | status |"
        const lines = content.split('\n')
        for (const line of lines) {
          const match = line.match(/\|\s*(\w+-\d+)\s*\|\s*([^|]+)\s*\|/)
          if (match) {
            titles.set(match[1].trim(), match[2].trim())
          }
        }
      } catch {
        // No stories.index.md in this feature — skip
      }
    }
  } catch {
    // plans/future doesn't exist
  }

  return titles
}

export async function deduplicate(state: CodeAuditState): Promise<Partial<CodeAuditState>> {
  const findings = state.findings || []
  const existingTitles = await loadExistingStoryTitles('plans')

  let duplicatesFound = 0
  let relatedFound = 0
  let newFindings = 0

  for (const finding of findings) {
    let bestMatch = { storyId: '', similarity: 0 }

    for (const [storyId, title] of existingTitles) {
      const sim = wordSimilarity(finding.title, title)
      if (sim > bestMatch.similarity) {
        bestMatch = { storyId, similarity: sim }
      }
    }

    if (bestMatch.similarity > 0.8) {
      finding.dedup_check = {
        similar_stories: [bestMatch.storyId],
        similarity_score: bestMatch.similarity,
        verdict: 'duplicate',
      }
      duplicatesFound++
    } else if (bestMatch.similarity > 0.5) {
      finding.dedup_check = {
        similar_stories: [bestMatch.storyId],
        similarity_score: bestMatch.similarity,
        verdict: 'related',
      }
      relatedFound++
    } else {
      finding.dedup_check = {
        similar_stories: [],
        verdict: 'new',
      }
      newFindings++
    }
  }

  const result: DedupResult = {
    total_checked: findings.length,
    duplicates_found: duplicatesFound,
    related_found: relatedFound,
    new_findings: newFindings,
  }

  return {
    deduplicationResult: result,
  }
}
