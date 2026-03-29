/**
 * diff_analyzer Node (review-v2) — DETERMINISTIC
 *
 * Reads changed files from worktree, classifies by domain, detects security-sensitive
 * patterns and risk surface. Never fails hard.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { DiffAnalysis, ReviewV2State } from '../../state/review-v2-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

export type DiffReaderFn = (worktreePath: string) => Promise<
  Array<{
    path: string
    changeType: 'created' | 'modified' | 'deleted'
    linesAdded: number
    linesRemoved: number
    content?: string
  }>
>

// ============================================================================
// Config
// ============================================================================

export type DiffAnalyzerConfig = {
  diffReader?: DiffReaderFn
}

// ============================================================================
// Exported Pure Functions
// ============================================================================

type Domain = 'frontend' | 'backend' | 'database' | 'tests' | 'config' | 'types'

/**
 * Classifies file paths into domains.
 */
export function classifyFiles(paths: string[]): Domain[] {
  const domains = new Set<Domain>()

  for (const p of paths) {
    if (
      p.includes('apps/web') ||
      p.includes('components/') ||
      p.includes('.tsx') ||
      p.includes('_primitives') ||
      p.endsWith('.css') ||
      p.endsWith('.scss')
    ) {
      domains.add('frontend')
    }
    if (
      p.includes('apps/api') ||
      p.includes('handlers/') ||
      p.includes('lambda') ||
      p.includes('routes/') ||
      (p.endsWith('.ts') && !p.includes('apps/web') && !p.includes('__types__'))
    ) {
      domains.add('backend')
    }
    if (
      p.includes('migrations/') ||
      p.includes('schema.ts') ||
      p.endsWith('.sql') ||
      p.includes('db/')
    ) {
      domains.add('database')
    }
    if (
      p.includes('.test.') ||
      p.includes('.spec.') ||
      p.includes('__tests__') ||
      p.includes('playwright/')
    ) {
      domains.add('tests')
    }
    if (
      p.endsWith('.json') ||
      p.endsWith('.yaml') ||
      p.endsWith('.yml') ||
      p.endsWith('.env') ||
      p.includes('config/') ||
      p.includes('.config.')
    ) {
      domains.add('config')
    }
    if (p.includes('__types__') || p.includes('types/') || p.includes('.d.ts')) {
      domains.add('types')
    }
  }

  return [...domains]
}

/**
 * Detects the risk surface from a diff analysis.
 */
export function detectRiskSurface(
  changedFiles: DiffAnalysis['changedFiles'],
  hasSecuritySensitive: boolean,
  hasDatabaseChanges: boolean,
): 'low' | 'medium' | 'high' {
  if (hasSecuritySensitive || hasDatabaseChanges) return 'high'

  const totalLines = changedFiles.reduce((sum, f) => sum + f.linesAdded + f.linesRemoved, 0)

  if (totalLines > 200 || changedFiles.length > 10) return 'high'
  if (totalLines > 50 || changedFiles.length > 3) return 'medium'
  return 'low'
}

const SECURITY_PATTERNS = [
  /auth/i,
  /crypto/i,
  /password/i,
  /secret/i,
  /token/i,
  /jwt/i,
  /oauth/i,
  /permission/i,
  /role/i,
  /access/i,
  /env/i,
  /\.env/,
  /sql/i,
]

const API_PATTERNS = [/route/i, /handler/i, /endpoint/i, /api\//i, /lambda/i]

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the diff_analyzer LangGraph node.
 */
export function createDiffAnalyzerNode(config: DiffAnalyzerConfig = {}) {
  return async (state: ReviewV2State): Promise<Partial<ReviewV2State>> => {
    const { storyId, worktreePath } = state

    logger.info(`diff_analyzer: starting for story ${storyId}`, {
      worktreePath,
      hasDiffReader: !!config.diffReader,
    })

    let rawFiles: Array<{
      path: string
      changeType: 'created' | 'modified' | 'deleted'
      linesAdded: number
      linesRemoved: number
      content?: string
    }> = []

    if (config.diffReader) {
      try {
        rawFiles = await config.diffReader(worktreePath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.warn(`diff_analyzer: diffReader threw`, { error: msg })
      }
    }

    const changedFiles: DiffAnalysis['changedFiles'] = rawFiles.map(f => ({
      path: f.path,
      changeType: f.changeType,
      linesAdded: f.linesAdded,
      linesRemoved: f.linesRemoved,
      summary: `${f.changeType}: +${f.linesAdded}/-${f.linesRemoved}`,
    }))

    const paths = changedFiles.map(f => f.path)
    const affectedDomains = classifyFiles(paths)

    // Detect security-sensitive patterns
    const allPathsStr = paths.join(' ')
    const hasSecuritySensitiveChanges = SECURITY_PATTERNS.some(p => p.test(allPathsStr))
    const hasDatabaseChanges =
      affectedDomains.includes('database') ||
      paths.some(p => p.includes('.sql') || p.includes('migrations/'))
    const hasApiChanges =
      affectedDomains.includes('backend') && API_PATTERNS.some(p => p.test(allPathsStr))

    const riskSurface = detectRiskSurface(
      changedFiles,
      hasSecuritySensitiveChanges,
      hasDatabaseChanges,
    )

    const diffAnalysis: DiffAnalysis = {
      changedFiles,
      affectedDomains,
      riskSurface,
      hasSecuritySensitiveChanges,
      hasDatabaseChanges,
      hasApiChanges,
    }

    logger.info('diff_analyzer: complete', {
      storyId,
      changedFiles: changedFiles.length,
      domains: affectedDomains,
      riskSurface,
      hasSecuritySensitiveChanges,
    })

    return {
      diffAnalysis,
      reviewV2Phase: 'risk_assessor',
    }
  }
}
