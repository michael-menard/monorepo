/**
 * Decision Tier business logic
 *
 * Pure functions for classifying decision tiers and determining escalation
 * based on the decision matrix in _shared/decision-handling.md.
 *
 * AC-1: DecisionTierSchema, AutonomyLevelSchema, classifyDecisionTier, shouldEscalate
 */

import { z } from 'zod'

// ============================================================================
// Schemas
// ============================================================================

/**
 * Five-tier decision classification system per decision-handling.md.
 *
 * Tier 1: Clarification  — file naming, import order, which pattern to follow
 * Tier 2: Preference     — component library, state management, API format
 * Tier 3: Ambiguous      — "add validation" (which fields?), "improve perf" (how?)
 * Tier 4: Destructive    — delete files, drop tables, force push, production
 * Tier 5: External       — add npm package, infra change, third-party API
 */
export const DecisionTierSchema = z.enum(['tier-1', 'tier-2', 'tier-3', 'tier-4', 'tier-5'])
export type DecisionTier = z.infer<typeof DecisionTierSchema>

/**
 * Autonomy level controls how aggressively the agent auto-accepts decisions.
 *
 * conservative: mostly escalate
 * moderate: auto-accept low-risk tiers
 * aggressive: auto-accept most tiers except destructive
 */
export const AutonomyLevelSchema = z.enum(['conservative', 'moderate', 'aggressive'])
export type AutonomyLevel = z.infer<typeof AutonomyLevelSchema>

// ============================================================================
// Classification keyword table
// ============================================================================

/**
 * Keyword table for tier classification.
 * Higher-tier keywords take precedence — table is evaluated top-down (tier-4 first).
 *
 * Source: decision-handling.md quick classification rules
 */
const TIER_KEYWORDS: Array<{ tier: DecisionTier; keywords: string[] }> = [
  {
    // Tier 4: Destructive — always escalate regardless of autonomy
    tier: 'tier-4',
    keywords: [
      'delete',
      'drop',
      'remove',
      'force push',
      'production',
      'destroy',
      'truncate',
      'wipe',
      'hard reset',
      'irreversible',
    ],
  },
  {
    // Tier 5: External dependency — add packages, infra, third-party
    tier: 'tier-5',
    keywords: [
      'npm',
      'package',
      'install',
      'infrastructure',
      'third-party',
      'external api',
      'new dependency',
      'add dependency',
    ],
  },
  {
    // Tier 3: Ambiguous scope — multiple valid interpretations
    tier: 'tier-3',
    keywords: [
      'ambiguous',
      'unclear',
      'which fields',
      'how to',
      'improve performance',
      'add validation',
      'interpretable',
      'vague',
      'multiple ways',
    ],
  },
  {
    // Tier 2: Preference — architectural choices with valid alternatives
    tier: 'tier-2',
    keywords: [
      'prefer',
      'choose',
      'component library',
      'state management',
      'api format',
      'framework',
      'approach',
      'strategy',
      'style guide',
    ],
  },
  {
    // Tier 1: Clarification — minor defaults with reasonable answers
    tier: 'tier-1',
    keywords: [
      'naming',
      'import order',
      'file name',
      'convention',
      'format',
      'pattern',
      'style',
      'casing',
      'indent',
    ],
  },
]

// ============================================================================
// Decision matrix
// Rows: tiers 1–5, Columns: conservative | moderate | aggressive
// true = escalate, false = auto-accept
//
// Source: decision-handling.md Decision Matrix table
//
// Notes per elab opp-4:
//   Tier 5 at aggressive = auto-accept for low-risk only (treated as false here;
//   callers pass a risk flag if needed — default is safe auto-accept for aggressive)
// ============================================================================

const ESCALATION_MATRIX: Record<DecisionTier, Record<AutonomyLevel, boolean>> = {
  // Tier 1 (Clarification): conservative escalates, moderate + aggressive auto
  'tier-1': { conservative: true, moderate: false, aggressive: false },
  // Tier 2 (Preference): conservative + moderate escalate, aggressive auto
  'tier-2': { conservative: true, moderate: true, aggressive: false },
  // Tier 3 (Ambiguous): conservative escalates, moderate + aggressive auto
  'tier-3': { conservative: true, moderate: false, aggressive: false },
  // Tier 4 (Destructive): ALWAYS escalate at every autonomy level
  'tier-4': { conservative: true, moderate: true, aggressive: true },
  // Tier 5 (External): conservative + moderate escalate, aggressive auto (low-risk)
  'tier-5': { conservative: true, moderate: true, aggressive: false },
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Classifies a decision description into a DecisionTier using keyword matching.
 *
 * Classification rules (evaluated in priority order: tier-4 first):
 * 1. Contains destructive keywords → tier-4
 * 2. Contains external-dep keywords → tier-5
 * 3. Contains ambiguous-scope keywords → tier-3
 * 4. Contains preference keywords → tier-2
 * 5. Contains clarification keywords → tier-1
 * 6. No match → defaults to tier-1 (safest default for unknown decisions)
 *
 * @param description - The decision description to classify
 * @returns The classified DecisionTier
 */
export function classifyDecisionTier(description: string): DecisionTier {
  const lower = description.toLowerCase()

  for (const entry of TIER_KEYWORDS) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.tier
    }
  }

  // Safe default: tier-1 (clarification) for unrecognized patterns
  return 'tier-1'
}

/**
 * Determines whether a decision should be escalated to the user.
 *
 * Decision matrix per decision-handling.md:
 * - Tier 4 ALWAYS escalates regardless of autonomy level
 * - Other tiers follow the decision matrix
 *
 * @param tier - The classified decision tier
 * @param autonomyLevel - The current autonomy level
 * @returns true if the decision should be escalated, false if auto-accepted
 */
export function shouldEscalate(tier: DecisionTier, autonomyLevel: AutonomyLevel): boolean {
  return ESCALATION_MATRIX[tier][autonomyLevel]
}
