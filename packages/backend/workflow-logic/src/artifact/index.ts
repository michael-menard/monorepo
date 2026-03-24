/**
 * Artifact type business logic
 *
 * Pure metadata functions for mapping artifact types to their canonical
 * workflow phases. No MCP SDK calls, no network I/O.
 *
 * AC-2: ArtifactTypeSchema, ArtifactPhaseSchema, getArtifactPhase, isValidArtifactForPhase
 *
 * Source: kb-integration.md Artifact Type Reference section
 */

import { z } from 'zod'

// ============================================================================
// Schemas
// ============================================================================

/**
 * All valid artifact types in the workflow system.
 * Maps to the artifact_type column in the KB artifacts table.
 *
 * Source: kb-integration.md Artifact Type Reference table
 */
export const ArtifactTypeSchema = z.enum([
  'checkpoint',
  'scope',
  'fix_summary',
  'plan',
  'context',
  'evidence',
  'review',
  'analysis',
  'verification',
  'story_seed',
  'test_plan',
  'uiux_notes',
  'dev_feasibility',
])
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>

/**
 * Valid workflow phases.
 * Maps to the phase column in the KB artifacts table.
 *
 * Source: kb-integration.md Artifact Type Reference table (Valid phase values)
 */
export const ArtifactPhaseSchema = z.enum([
  'setup',
  'analysis',
  'planning',
  'implementation',
  'code_review',
  'qa_verification',
  'completion',
])
export type ArtifactPhase = z.infer<typeof ArtifactPhaseSchema>

// ============================================================================
// Type-to-phase mapping table
// Source: kb-integration.md Artifact Type Reference section
// ============================================================================

const ARTIFACT_PHASE_MAP: Record<ArtifactType, ArtifactPhase> = {
  // Setup phase artifacts
  checkpoint: 'setup',
  scope: 'setup',
  fix_summary: 'setup',

  // Planning phase artifacts
  plan: 'planning',
  context: 'planning',

  // Implementation phase artifacts
  evidence: 'implementation',

  // Code review phase artifacts
  review: 'code_review',

  // Analysis phase artifacts
  analysis: 'analysis',
  story_seed: 'analysis',
  test_plan: 'analysis',
  uiux_notes: 'analysis',
  dev_feasibility: 'analysis',

  // QA verification phase artifacts
  verification: 'qa_verification',
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Returns the canonical workflow phase in which an artifact type is written.
 *
 * @param artifactType - A valid ArtifactType
 * @returns The canonical ArtifactPhase for that artifact type
 */
export function getArtifactPhase(artifactType: ArtifactType): ArtifactPhase {
  return ARTIFACT_PHASE_MAP[artifactType]
}

/**
 * Checks whether a given artifact type is valid for a given phase.
 *
 * An artifact type is valid for a phase if its canonical phase matches
 * the provided phase. This is a strict match — no cross-phase writes.
 *
 * @param artifactType - A valid ArtifactType
 * @param phase - A valid ArtifactPhase
 * @returns true if the artifact type is written in the given phase
 */
export function isValidArtifactForPhase(artifactType: ArtifactType, phase: ArtifactPhase): boolean {
  return ARTIFACT_PHASE_MAP[artifactType] === phase
}
