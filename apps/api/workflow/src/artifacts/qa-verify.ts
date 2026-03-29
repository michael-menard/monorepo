import { z } from 'zod'

/**
 * QA-VERIFY.yaml Schema
 *
 * QA verification results for the story.
 * Written by qa-verify-verification-leader, read by qa-verify-completion-leader.
 */

export const AcVerificationSchema = z.object({
  ac_id: z.string(),
  ac_text: z.string().optional(),
  status: z.enum(['PASS', 'FAIL', 'BLOCKED']),
  evidence_ref: z.string().optional(),
  notes: z.string().optional(),
})

export type AcVerification = z.infer<typeof AcVerificationSchema>

export const TestResultsSchema = z.object({
  unit: z.object({ pass: z.number(), fail: z.number() }).optional(),
  integration: z.object({ pass: z.number(), fail: z.number() }).optional(),
  e2e: z.object({ pass: z.number(), fail: z.number() }).optional(),
  http: z.object({ pass: z.number(), fail: z.number() }).optional(),
})

export type TestResults = z.infer<typeof TestResultsSchema>

export const QaIssueSchema = z.object({
  id: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  description: z.string(),
  ac_id: z.string().optional(),
  file: z.string().optional(),
  suggested_fix: z.string().optional(),
})

export type QaIssue = z.infer<typeof QaIssueSchema>

export const QaVerifySchema = z.object({
  schema: z.literal(1),
  story_id: z.string(),
  timestamp: z.string().datetime(),

  // Overall verdict
  verdict: z.enum(['PASS', 'FAIL', 'BLOCKED']),

  // Test execution summary
  tests_executed: z.boolean(),
  test_results: TestResultsSchema.optional(),

  // Coverage
  coverage: z.number().min(0).max(100).optional(),
  coverage_meets_threshold: z.boolean().optional(),

  // Test quality assessment
  test_quality: z
    .object({
      verdict: z.enum(['PASS', 'FAIL']),
      anti_patterns: z.array(z.string()).default([]),
    })
    .optional(),

  // AC verification (references EVIDENCE.yaml)
  acs_verified: z.array(AcVerificationSchema),

  // Architecture compliance
  architecture_compliant: z.boolean(),

  // Issues found
  issues: z.array(QaIssueSchema).default([]),

  // KB entries to write back (deduped)
  lessons_to_record: z
    .array(
      z.object({
        lesson: z.string(),
        category: z.enum(['blocker', 'pattern', 'time_sink', 'reuse', 'anti_pattern']),
        tags: z.array(z.string()).default([]),
      }),
    )
    .default([]),

  // Token usage
  tokens: z
    .object({
      in: z.number().int().min(0),
      out: z.number().int().min(0),
    })
    .optional(),
})

export type QaVerify = z.infer<typeof QaVerifySchema>

/**
 * Create a new QA verify result
 */
export function createQaVerify(storyId: string): QaVerify {
  return {
    schema: 1,
    story_id: storyId,
    timestamp: new Date().toISOString(),
    verdict: 'BLOCKED',
    tests_executed: false,
    acs_verified: [],
    architecture_compliant: true,
    issues: [],
    lessons_to_record: [],
  }
}

/**
 * Check if QA passed
 */
export function qaPassedSuccessfully(qa: QaVerify): boolean {
  return (
    qa.verdict === 'PASS' &&
    qa.acs_verified.every(ac => ac.status === 'PASS') &&
    qa.architecture_compliant &&
    qa.issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0
  )
}

/**
 * Generate summary for QA result
 */
export function generateQaSummary(qa: QaVerify): string {
  const passedAcs = qa.acs_verified.filter(ac => ac.status === 'PASS').length
  const totalAcs = qa.acs_verified.length
  const criticalIssues = qa.issues.filter(i => i.severity === 'critical').length
  const highIssues = qa.issues.filter(i => i.severity === 'high').length

  return `QA ${qa.verdict}: ${passedAcs}/${totalAcs} ACs passed, ${criticalIssues} critical, ${highIssues} high issues`
}

/**
 * Add an AC verification
 */
export function addAcVerification(qa: QaVerify, ac: AcVerification): QaVerify {
  const existing = qa.acs_verified.findIndex(a => a.ac_id === ac.ac_id)
  const updated = [...qa.acs_verified]

  if (existing >= 0) {
    updated[existing] = ac
  } else {
    updated.push(ac)
  }

  return {
    ...qa,
    acs_verified: updated,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Determine overall verdict from AC verifications
 */
export function calculateVerdict(qa: QaVerify): 'PASS' | 'FAIL' | 'BLOCKED' {
  if (qa.acs_verified.some(ac => ac.status === 'BLOCKED')) {
    return 'BLOCKED'
  }
  if (qa.acs_verified.some(ac => ac.status === 'FAIL')) {
    return 'FAIL'
  }
  if (qa.acs_verified.every(ac => ac.status === 'PASS')) {
    return 'PASS'
  }
  return 'BLOCKED'
}
