import { z } from 'zod'

/**
 * EvidenceType enum - defines the types of evidence that can be captured.
 */
export const EvidenceTypeSchema = z.enum([
  'test', // Test output
  'build', // Build output
  'http', // HTTP request/response
  'screenshot', // Screenshot capture
  'log', // Log output
])

/** TypeScript type inferred from EvidenceTypeSchema */
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>

/**
 * EvidenceRef schema - represents a reference to evidence captured during workflow execution.
 *
 * Fields:
 * - type: The type of evidence (test, build, http, screenshot, log)
 * - path: The file path or URL to the evidence
 * - timestamp: ISO datetime string of when the evidence was captured
 * - description: Optional human-readable description
 */
export const EvidenceRefSchema = z.object({
  type: EvidenceTypeSchema,
  path: z.string().min(1, 'Evidence path must be non-empty'),
  timestamp: z.string().datetime({ message: 'Timestamp must be a valid ISO datetime string' }),
  description: z.string().optional(),
})

/** TypeScript type inferred from EvidenceRefSchema */
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>
