import { z } from 'zod'

/**
 * ArtifactType enum - defines the types of artifacts produced during workflow execution.
 *
 * These are the keys used in the GraphState.artifactPaths record.
 */
export const ArtifactTypeSchema = z.enum([
  'storyDoc', // Main story document (internal only — no KB equivalent)
  'elaboration', // Story elaboration → KB artifact_type: 'elaboration'
  'proof', // Implementation proof → KB artifact_type: 'proof'
  'review', // Code review output → KB artifact_type: 'review'
  'verification', // QA verification output → KB artifact_type: 'verification'
  'uiux_notes', // UI/UX review output → KB artifact_type: 'uiux_notes'
  'qa_gate', // QA gate decision → KB artifact_type: 'qa_gate'
  'evidence', // Evidence bundle → KB artifact_type: 'evidence'
])

/** TypeScript type inferred from ArtifactTypeSchema */
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>

/** Array of all valid ArtifactType values */
export const ARTIFACT_TYPES = ArtifactTypeSchema.options
