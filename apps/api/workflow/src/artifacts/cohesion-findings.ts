import { z } from 'zod'

/**
 * COHESION-FINDINGS Schema
 *
 * Captures PO cohesion check findings from the cohesion-prosecutor agent.
 * Hard constraints: max 5 total findings, max 2 blocking findings.
 * Written by cohesion-prosecutor, read by elab-completion-leader.
 */

export const CohesionSeveritySchema = z.enum(['blocking', 'warning', 'info'])

export type CohesionSeverity = z.infer<typeof CohesionSeveritySchema>

export const CohesionFindingSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  severity: CohesionSeveritySchema,
  user_flow: z.string().optional(),
  recommendation: z.string().min(1),
})

export type CohesionFinding = z.infer<typeof CohesionFindingSchema>

export const CohesionFindingsSchema = z.object({
  story_id: z.string().min(1),
  generated_at: z.string().datetime(),
  findings: z.array(CohesionFindingSchema).max(5, 'Maximum 5 cohesion findings allowed'),
  blocking_findings: z.array(z.string()).max(2, 'Maximum 2 blocking findings allowed').default([]),
  overall_verdict: z.enum(['pass', 'warn', 'fail']),
})

export type CohesionFindings = z.infer<typeof CohesionFindingsSchema>

/**
 * Create an initial cohesion findings artifact for a story
 */
export function createCohesionFindings(storyId: string): CohesionFindings {
  return {
    story_id: storyId,
    generated_at: new Date().toISOString(),
    findings: [],
    blocking_findings: [],
    overall_verdict: 'pass',
  }
}
