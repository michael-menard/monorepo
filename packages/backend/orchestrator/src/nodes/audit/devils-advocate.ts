import type { CodeAuditState } from '../../graphs/code-audit.js'
import type { ChallengeResult, AuditFinding, AuditSeverity, DevilsAdvocateDecision } from '../../artifacts/audit-findings.js'

/**
 * Devil's Advocate Node
 *
 * Challenge every finding from lens agents. Question severity, validity,
 * and whether fixes would actually improve the codebase.
 */

/**
 * Evaluate a single finding and return a challenge decision
 */
function challengeFinding(finding: AuditFinding): {
  decision: DevilsAdvocateDecision
  finalSeverity: AuditSeverity | null
  reasoning: string
} {
  // Low confidence findings get extra scrutiny
  if (finding.confidence === 'low') {
    return {
      decision: 'downgraded',
      finalSeverity: downgradeSeverity(finding.severity),
      reasoning: `Low confidence finding — downgraded from ${finding.severity}`,
    }
  }

  // Test file findings should be lower severity
  if (finding.file.includes('__tests__') || finding.file.includes('.test.') || finding.file.includes('.spec.')) {
    if (finding.severity === 'high' || finding.severity === 'critical') {
      return {
        decision: 'downgraded',
        finalSeverity: 'medium',
        reasoning: 'Finding is in test file — reduced severity',
      }
    }
  }

  // Config and setup files get lower severity
  if (finding.file.includes('.config.') || finding.file.includes('setup.ts')) {
    if (finding.severity === 'high') {
      return {
        decision: 'downgraded',
        finalSeverity: 'medium',
        reasoning: 'Finding is in config/setup file — reduced severity',
      }
    }
  }

  // Default: confirm as-is
  return {
    decision: 'confirmed',
    finalSeverity: finding.severity,
    reasoning: `Confirmed ${finding.severity} — clear evidence and appropriate severity`,
  }
}

function downgradeSeverity(severity: AuditSeverity): AuditSeverity {
  const downgrade: Record<AuditSeverity, AuditSeverity> = {
    critical: 'high',
    high: 'medium',
    medium: 'low',
    low: 'low',
  }
  return downgrade[severity]
}

export async function runDevilsAdvocate(state: CodeAuditState): Promise<Partial<CodeAuditState>> {
  const lensResults = state.lensResults || []
  const allFindings = lensResults.flatMap(r => r.findings)

  const challenges = allFindings.map(finding => {
    const result = challengeFinding(finding)
    return {
      finding_id: finding.id,
      original_severity: finding.severity,
      decision: result.decision,
      final_severity: result.finalSeverity,
      reasoning: result.reasoning,
    }
  })

  const result: ChallengeResult = {
    total_reviewed: challenges.length,
    confirmed: challenges.filter(c => c.decision === 'confirmed').length,
    downgraded: challenges.filter(c => c.decision === 'downgraded').length,
    upgraded: challenges.filter(c => c.decision === 'upgraded').length,
    false_positives: challenges.filter(c => c.decision === 'false_positive').length,
    duplicates: challenges.filter(c => c.decision === 'duplicate').length,
    challenges,
  }

  return {
    devilsAdvocateResult: result,
  }
}
