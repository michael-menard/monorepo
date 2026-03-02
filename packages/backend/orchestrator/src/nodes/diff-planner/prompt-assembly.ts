/**
 * Prompt Assembly Module
 *
 * Handles affinity-aware prompt injection for the Diff Planner node.
 * Applies confidence threshold gating, injects affinity summaries,
 * and annotates ChangeSpecs with escalation models for weak change types.
 *
 * APIP-3030: Learning-Aware Diff Planner
 */

import { z } from 'zod'
import {
  PlaceholderChangeSpecSchema,
  ProfileMetadataSchema,
} from '../../artifacts/diff-planner-output.js'
import type { PlaceholderChangeSpec, ProfileMetadata } from '../../artifacts/diff-planner-output.js'
import type { AffinityProfile, DiffPlannerConfig } from './__types__/index.js'
import {
  AFFINITY_CONFIDENCE_MIN,
  WEAKNESS_THRESHOLD,
  MAX_WEAK_PATTERNS_INJECTED,
  MAX_STRONG_PATTERNS_INJECTED,
  ESCALATION_MODEL_DEFAULT,
} from './__types__/index.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Result of prompt assembly for a single model affinity profile.
 */
const PromptAssemblyResultSchema = z.object({
  affinityPromptFragment: z.string(),
  profileMetadata: ProfileMetadataSchema,
})

export type PromptAssemblyResult = z.infer<typeof PromptAssemblyResultSchema>

/**
 * Result of enriching change specs with escalation pre-assignment.
 */
const EnrichedChangeSpecsResultSchema = z.object({
  enrichedSpecs: z.array(PlaceholderChangeSpecSchema),
  escalationCount: z.number(),
})

export type EnrichedChangeSpecsResult = z.infer<typeof EnrichedChangeSpecsResultSchema>

// ============================================================================
// Confidence Gate
// ============================================================================

/**
 * Checks whether an affinity profile meets the confidence threshold.
 *
 * Profiles below AFFINITY_CONFIDENCE_MIN are treated as insufficient data
 * and should not be used for prompt injection.
 *
 * @param profile - The affinity profile to check
 * @param config - Configuration overrides
 * @returns True if the profile meets the confidence threshold
 */
export function meetsConfidenceThreshold(
  profile: AffinityProfile,
  config: Partial<DiffPlannerConfig> = {},
): boolean {
  const threshold = config.affinityConfidenceMin ?? AFFINITY_CONFIDENCE_MIN
  return profile.confidence >= threshold
}

// ============================================================================
// Prompt Injection
// ============================================================================

/**
 * Builds an affinity-aware prompt fragment from a list of affinity profiles.
 *
 * Injects:
 *   - Weak patterns (capped at maxWeakPatternsInjected=5) with warnings
 *   - Strong patterns (capped at maxStrongPatternsInjected=3) with encouragement
 *
 * Returns an empty string if no profiles pass the confidence gate.
 *
 * @param profiles - Affinity profiles for the current model
 * @param config - Configuration overrides
 * @returns Prompt fragment string and injection counts
 */
export function buildAffinityPromptFragment(
  profiles: AffinityProfile[],
  config: Partial<DiffPlannerConfig> = {},
): { fragment: string; weakCount: number; strongCount: number } {
  const maxWeak = config.maxWeakPatternsInjected ?? MAX_WEAK_PATTERNS_INJECTED
  const maxStrong = config.maxStrongPatternsInjected ?? MAX_STRONG_PATTERNS_INJECTED
  const weaknessThreshold = config.weaknessThreshold ?? WEAKNESS_THRESHOLD
  const confidenceMin = config.affinityConfidenceMin ?? AFFINITY_CONFIDENCE_MIN

  const qualifyingProfiles = profiles.filter(p => p.confidence >= confidenceMin)

  if (qualifyingProfiles.length === 0) {
    return { fragment: '', weakCount: 0, strongCount: 0 }
  }

  const weakLines: string[] = []
  const strongLines: string[] = []

  for (const profile of qualifyingProfiles) {
    const isWeak = profile.success_rate < weaknessThreshold

    if (isWeak) {
      const patterns = profile.weak_patterns ?? []
      for (const pattern of patterns) {
        if (weakLines.length < maxWeak) {
          weakLines.push(`- [CAUTION: ${profile.change_type}] ${pattern}`)
        }
      }
      // If no weak_patterns but overall weak, add a generic note
      if (patterns.length === 0 && weakLines.length < maxWeak) {
        weakLines.push(
          `- [CAUTION: ${profile.change_type}] Low success rate (${Math.round(profile.success_rate * 100)}%). Apply extra care.`,
        )
      }
    } else {
      const patterns = profile.strong_patterns ?? []
      for (const pattern of patterns) {
        if (strongLines.length < maxStrong) {
          strongLines.push(`- [STRENGTH: ${profile.change_type}] ${pattern}`)
        }
      }
    }
  }

  const parts: string[] = []

  parts.push('## Model Affinity Context')
  parts.push('The following patterns are based on historical performance data for this model.')
  parts.push('')

  if (weakLines.length > 0) {
    parts.push('### Areas Requiring Extra Attention')
    parts.push(...weakLines)
    parts.push('')
  }

  if (strongLines.length > 0) {
    parts.push('### Areas of Demonstrated Strength')
    parts.push(...strongLines)
    parts.push('')
  }

  return {
    fragment: parts.join('\n'),
    weakCount: weakLines.length,
    strongCount: strongLines.length,
  }
}

// ============================================================================
// Escalation Pre-Assignment
// ============================================================================

/**
 * Annotates ChangeSpecs with escalation_model when the model's success_rate
 * for that change_type falls below WEAKNESS_THRESHOLD.
 *
 * Looks up each spec's change_type in the provided affinity profiles.
 * If a matching profile exists and is below the weakness threshold,
 * the spec is annotated with the escalation model.
 *
 * @param changeSpecs - Change specs to potentially annotate
 * @param profiles - Affinity profiles for the current model
 * @param config - Configuration overrides
 * @returns Enriched change specs and count of escalated specs
 */
export function annotateEscalations(
  changeSpecs: PlaceholderChangeSpec[],
  profiles: AffinityProfile[],
  config: Partial<DiffPlannerConfig> = {},
): EnrichedChangeSpecsResult {
  const weaknessThreshold = config.weaknessThreshold ?? WEAKNESS_THRESHOLD
  const confidenceMin = config.affinityConfidenceMin ?? AFFINITY_CONFIDENCE_MIN
  const escalationModel = config.escalationModelDefault ?? ESCALATION_MODEL_DEFAULT

  // Build a lookup map of change_type → AffinityProfile
  const profileMap = new Map<string, AffinityProfile>()
  for (const profile of profiles) {
    if (profile.confidence >= confidenceMin) {
      profileMap.set(profile.change_type, profile)
    }
  }

  let escalationCount = 0

  const enrichedSpecs: PlaceholderChangeSpec[] = changeSpecs.map(spec => {
    const profile = profileMap.get(spec.change_type)

    if (profile && profile.success_rate < weaknessThreshold) {
      escalationCount++
      return {
        ...spec,
        escalation_model: escalationModel,
        affinity_notes: `Pre-assigned escalation (success_rate=${Math.round(profile.success_rate * 100)}%, threshold=${Math.round(weaknessThreshold * 100)}%)`,
      }
    }

    return spec
  })

  return { enrichedSpecs, escalationCount }
}

// ============================================================================
// Assembly Orchestrator
// ============================================================================

/**
 * Assembles the complete prompt injection result from affinity profiles and change specs.
 *
 * Applies:
 * 1. Confidence threshold gate — discard profiles below minimum confidence
 * 2. Prompt fragment build — inject weak (capped at 5) and strong (capped at 3) patterns
 * 3. Escalation annotation — mark specs below WEAKNESS_THRESHOLD with escalation_model
 *
 * Returns valid ProfileMetadata regardless of whether profiles are available.
 *
 * @param modelId - Model ID being evaluated
 * @param profiles - Affinity profiles for the model (may be empty)
 * @param changeSpecs - Change specs to enrich
 * @param config - Configuration overrides
 * @returns Prompt fragment, enriched specs, and profile metadata
 */
export function assembleAffinityContext(
  modelId: string,
  profiles: AffinityProfile[],
  changeSpecs: PlaceholderChangeSpec[],
  config: Partial<DiffPlannerConfig> = {},
): {
  affinityPromptFragment: string
  enrichedSpecs: PlaceholderChangeSpec[]
  profileMetadata: ProfileMetadata
} {
  const qualifyingProfiles = profiles.filter(p => meetsConfidenceThreshold(p, config))

  if (qualifyingProfiles.length === 0) {
    const metadata: ProfileMetadata = {
      profile_used: false,
      model_id: modelId,
      confidence_level: null,
      weak_patterns_injected: 0,
      strong_patterns_injected: 0,
      escalation_preassigned: false,
      escalation_count: 0,
    }

    return {
      affinityPromptFragment: '',
      enrichedSpecs: changeSpecs,
      profileMetadata: metadata,
    }
  }

  const { fragment, weakCount, strongCount } = buildAffinityPromptFragment(
    qualifyingProfiles,
    config,
  )

  const { enrichedSpecs, escalationCount } = annotateEscalations(
    changeSpecs,
    qualifyingProfiles,
    config,
  )

  // Use the highest confidence profile for reporting
  const maxConfidence = Math.max(...qualifyingProfiles.map(p => p.confidence))

  const profileMetadata: ProfileMetadata = {
    profile_used: true,
    model_id: modelId,
    confidence_level: maxConfidence,
    weak_patterns_injected: weakCount,
    strong_patterns_injected: strongCount,
    escalation_preassigned: escalationCount > 0,
    escalation_count: escalationCount,
  }

  return {
    affinityPromptFragment: fragment,
    enrichedSpecs,
    profileMetadata,
  }
}
