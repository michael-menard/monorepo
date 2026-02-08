/**
 * DECISIONS.yaml Parser
 *
 * Parses epic DECISIONS.yaml files to extract critical findings,
 * MVP blockers, story splits, deferrals, and action items for KB import.
 *
 * @see Migration plan for decisions migration requirements
 */

import yaml from 'js-yaml'
import { logger } from '@repo/logger'
import { type ParsedDecisionsFile, ParsedDecisionsFileSchema } from './__types__/index.js'

/**
 * Parse a DECISIONS.yaml file.
 *
 * @param content - File content to parse
 * @param sourceFile - Source file path for traceability
 * @returns Parsed decisions and warnings
 */
export function parseDecisionsFile(content: string, sourceFile: string): ParsedDecisionsFile {
  const warnings: string[] = []

  logger.debug('Parsing decisions file', { sourceFile, contentLength: content.length })

  try {
    // Parse YAML content
    const parsed = yaml.load(content) as Record<string, unknown>

    if (!parsed || typeof parsed !== 'object') {
      warnings.push(`Invalid YAML structure in ${sourceFile}`)
      return createEmptyResult(sourceFile, warnings)
    }

    // Build result with defaults
    const result: ParsedDecisionsFile = {
      source_file: sourceFile,
      feature_dir: parsed.feature_dir as string | undefined,
      prefix: parsed.prefix as string | undefined,
      decided: parsed.decided as string | undefined,
      critical_findings: [],
      mvp_blockers: [],
      action_items: [],
      new_stories_added: [],
      story_splits: [],
      story_deferrals: [],
      warnings,
    }

    // Parse critical findings
    if (Array.isArray(parsed.critical_findings)) {
      for (const finding of parsed.critical_findings) {
        if (finding && typeof finding === 'object') {
          result.critical_findings.push({
            id: String(finding.id || ''),
            decision: String(finding.decision || ''),
            action: String(finding.action || ''),
            source: finding.source ? String(finding.source) : undefined,
            notes: finding.notes ? String(finding.notes) : undefined,
          })
        }
      }
    }

    // Parse MVP blockers
    if (Array.isArray(parsed.mvp_blockers)) {
      for (const blocker of parsed.mvp_blockers) {
        if (blocker && typeof blocker === 'object') {
          result.mvp_blockers.push({
            id: String(blocker.id || ''),
            decision: String(blocker.decision || ''),
            action: String(blocker.issue || blocker.action || ''),
            source: blocker.source ? String(blocker.source) : undefined,
            notes: blocker.notes ? String(blocker.notes) : undefined,
          })
        }
      }
    }

    // Parse action items
    if (Array.isArray(parsed.action_items)) {
      for (const item of parsed.action_items) {
        if (item && typeof item === 'object') {
          result.action_items.push({
            id: String(item.id || ''),
            action: String(item.action || ''),
            owner: item.owner ? String(item.owner) : undefined,
            stories: Array.isArray(item.stories) ? item.stories.map(String) : undefined,
            new_story: item.new_story ? String(item.new_story) : undefined,
          })
        }
      }
    }

    // Parse new stories added
    if (Array.isArray(parsed.new_stories_added)) {
      for (const story of parsed.new_stories_added) {
        if (story && typeof story === 'object') {
          result.new_stories_added.push({
            title: String(story.title || ''),
            priority: story.priority ? String(story.priority) : undefined,
            reason: story.reason ? String(story.reason) : undefined,
          })
        }
      }
    }

    // Parse missing MVP stories (alternative format)
    if (Array.isArray(parsed.missing_mvp_stories)) {
      for (const story of parsed.missing_mvp_stories) {
        if (story && typeof story === 'object') {
          result.new_stories_added.push({
            title: String(story.title || ''),
            priority: story.priority ? String(story.priority) : undefined,
            reason: String(story.reason || story.source || ''),
          })
        }
      }
    }

    // Parse story splits
    if (Array.isArray(parsed.story_splits)) {
      for (const split of parsed.story_splits) {
        if (split && typeof split === 'object') {
          result.story_splits.push({
            story: String(split.story || ''),
            decision: String(split.decision || ''),
            new_stories: Array.isArray(split.new_stories)
              ? split.new_stories.map((s: Record<string, unknown>) => ({
                  id: String(s.id || ''),
                  title: String(s.title || ''),
                  complexity: s.complexity ? String(s.complexity) : undefined,
                  scope: s.scope ? String(s.scope) : undefined,
                }))
              : undefined,
          })
        }
      }
    }

    // Parse story deferrals
    if (Array.isArray(parsed.story_deferrals)) {
      for (const deferral of parsed.story_deferrals) {
        if (deferral && typeof deferral === 'object') {
          result.story_deferrals.push({
            story: String(deferral.story || ''),
            decision: String(deferral.decision || ''),
            reason: deferral.reason ? String(deferral.reason) : undefined,
            recommendation: deferral.recommendation ? String(deferral.recommendation) : undefined,
          })
        }
      }
    }

    // Validate and return
    const validated = ParsedDecisionsFileSchema.safeParse(result)
    if (!validated.success) {
      warnings.push(`Validation errors: ${validated.error.issues.map(i => i.message).join(', ')}`)
    }

    const totalEntries =
      result.critical_findings.length + result.mvp_blockers.length + result.new_stories_added.length

    logger.info('Parsed decisions file', {
      sourceFile,
      prefix: result.prefix,
      criticalFindings: result.critical_findings.length,
      mvpBlockers: result.mvp_blockers.length,
      actionItems: result.action_items.length,
      newStories: result.new_stories_added.length,
      totalEntries,
      warningCount: warnings.length,
    })

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    warnings.push(`Failed to parse YAML: ${message}`)
    logger.error('Failed to parse decisions file', { sourceFile, error: message })
    return createEmptyResult(sourceFile, warnings)
  }
}

/**
 * Create an empty result with warnings.
 */
function createEmptyResult(sourceFile: string, warnings: string[]): ParsedDecisionsFile {
  return {
    source_file: sourceFile,
    critical_findings: [],
    mvp_blockers: [],
    action_items: [],
    new_stories_added: [],
    story_splits: [],
    story_deferrals: [],
    warnings,
  }
}
