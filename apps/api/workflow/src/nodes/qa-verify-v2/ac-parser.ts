/**
 * ac_parser Node (qa-verify-v2) — DETERMINISTIC
 *
 * Loads story ACs from KB, extracts testable assertions, classifies by test type.
 * Never fails hard — degrades gracefully.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { ParsedAC, QAVerifyV2State } from '../../state/qa-verify-v2-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

export type KbStoryAdapterFn = (storyId: string) => Promise<{
  acceptanceCriteria: string[]
} | null>

// ============================================================================
// Config
// ============================================================================

export type AcParserConfig = {
  kbAdapter?: KbStoryAdapterFn
}

// ============================================================================
// Exported Pure Functions
// ============================================================================

type TestType = 'unit' | 'integration' | 'e2e' | 'manual'

const E2E_PATTERNS = [/click/i, /navigate/i, /form/i, /page/i, /browser/i, /visit/i, /submit/i]
const UNIT_PATTERNS = [/returns/i, /throws/i, /called with/i, /\berror\b/i, /function/i, /method/i]
const INTEGRATION_PATTERNS = [
  /\bAPI\b/i,
  /endpoint/i,
  /response/i,
  /request/i,
  /fetch/i,
  /POST/i,
  /GET/i,
]
const MANUAL_PATTERNS = [
  /looks like/i,
  /matches design/i,
  /color/i,
  /style/i,
  /visual/i,
  /appearance/i,
]

/**
 * Classifies a single AC by test type using heuristic rules.
 */
export function classifyAC(acText: string): ParsedAC['testType'] {
  if (MANUAL_PATTERNS.some(p => p.test(acText))) return 'manual'
  if (E2E_PATTERNS.some(p => p.test(acText))) return 'e2e'
  if (INTEGRATION_PATTERNS.some(p => p.test(acText))) return 'integration'
  if (UNIT_PATTERNS.some(p => p.test(acText))) return 'unit'
  return 'unit' // default
}

/**
 * Extracts a testable "when X, then Y" assertion from AC text.
 */
export function extractTestableAssertion(acText: string): string {
  // If already in "When X, then Y" form
  if (/when.+then/i.test(acText)) return acText

  // If in "Given X, when Y, then Z" form
  if (/given.+when.+then/i.test(acText)) return acText

  // Transform simple "X should Y" patterns
  const shouldMatch = acText.match(/(.+)\s+should\s+(.+)/i)
  if (shouldMatch) {
    return `When ${shouldMatch[1].trim()}, then it should ${shouldMatch[2].trim()}`
  }

  // Passthrough
  return acText
}

/**
 * Extracts test hints from AC text (function names, identifiers).
 */
export function extractTestHints(acText: string): string[] {
  const hints: string[] = []
  // Extract camelCase identifiers
  const identifiers = acText.match(/\b[a-z][a-zA-Z0-9]+\b/g) ?? []
  // Extract file references
  const fileRefs = acText.match(/\b\w+\.(ts|tsx|js|jsx)\b/g) ?? []
  hints.push(...identifiers.filter(id => id.length > 4), ...fileRefs)
  return [...new Set(hints)].slice(0, 5)
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the ac_parser LangGraph node.
 */
export function createAcParserNode(config: AcParserConfig = {}) {
  return async (state: QAVerifyV2State): Promise<Partial<QAVerifyV2State>> => {
    const { storyId } = state

    logger.info(`ac_parser: starting for story ${storyId}`, {
      hasKbAdapter: !!config.kbAdapter,
    })

    let acceptanceCriteria: string[] = []

    if (config.kbAdapter) {
      try {
        const story = await config.kbAdapter(storyId)
        if (story) {
          acceptanceCriteria = story.acceptanceCriteria
        } else {
          logger.warn(`ac_parser: story ${storyId} not found in KB`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.warn(`ac_parser: KB adapter threw`, { error: msg })
      }
    }

    const parsedACs: ParsedAC[] = acceptanceCriteria.map((ac, index) => ({
      index,
      original: ac,
      testableAssertion: extractTestableAssertion(ac),
      testType: classifyAC(ac),
      testHints: extractTestHints(ac),
    }))

    logger.info('ac_parser: complete', {
      storyId,
      totalACs: parsedACs.length,
      byType: {
        unit: parsedACs.filter(a => a.testType === 'unit').length,
        integration: parsedACs.filter(a => a.testType === 'integration').length,
        e2e: parsedACs.filter(a => a.testType === 'e2e').length,
        manual: parsedACs.filter(a => a.testType === 'manual').length,
      },
    })

    return {
      parsedACs,
      qaVerifyV2Phase: 'test_strategy_agent',
    }
  }
}
