import { z } from 'zod'

/**
 * ArtifactType enum - defines the types of artifacts produced during workflow execution.
 *
 * These are the keys used in the GraphState.artifactPaths record.
 */
export const ArtifactTypeSchema = z.enum([
  'storyDoc', // Main story document
  'elaboration', // Story elaboration
  'proof', // Implementation proof
  'codeReview', // Code review output
  'qaVerify', // QA verification output
  'uiuxReview', // UI/UX review output
  'qaGate', // QA gate decision
  'evidence', // Evidence bundle
])

/** TypeScript type inferred from ArtifactTypeSchema */
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>

/** Array of all valid ArtifactType values */
export const ARTIFACT_TYPES = ArtifactTypeSchema.options
