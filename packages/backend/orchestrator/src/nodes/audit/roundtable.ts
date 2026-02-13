import type { CodeAuditState } from '../../graphs/code-audit.js'
import type { RoundtableResult, AuditFinding } from '../../artifacts/audit-findings.js'

/**
 * Roundtable Node
 *
 * Cross-specialist synthesis: reconcile lens findings with
 * devil's advocate challenges. Produce vetted findings list.
 */

export async function runRoundtable(state: CodeAuditState): Promise<Partial<CodeAuditState>> {
  const lensResults = state.lensResults || []
  const daResult = state.devilsAdvocateResult

  const allFindings = lensResults.flatMap(r => r.findings)
  const vettedFindings: AuditFinding[] = []
  let falsePositives = 0
  let duplicates = 0
  let downgraded = 0
  let upgraded = 0

  if (!daResult) {
    // No devil's advocate — pass all findings through
    return {
      roundtableResult: {
        original_count: allFindings.length,
        vetted_count: allFindings.length,
        removed: { false_positives: 0, duplicates: 0 },
        severity_changes: { downgraded: 0, upgraded: 0 },
        cross_references: [],
        vetted_findings: allFindings,
      },
    }
  }

  // Build lookup from devil's advocate challenges
  const challengeMap = new Map(
    daResult.challenges.map(c => [c.finding_id, c]),
  )

  for (const finding of allFindings) {
    const challenge = challengeMap.get(finding.id)

    if (!challenge) {
      // Not challenged — keep as-is
      vettedFindings.push(finding)
      continue
    }

    switch (challenge.decision) {
      case 'false_positive':
        falsePositives++
        break
      case 'duplicate':
        duplicates++
        break
      case 'downgraded':
        downgraded++
        if (challenge.final_severity) {
          vettedFindings.push({
            ...finding,
            severity: challenge.final_severity,
            devils_advocate: {
              challenged: true,
              original_severity: challenge.original_severity,
              final_severity: challenge.final_severity,
              decision: challenge.decision,
              reasoning: challenge.reasoning,
            },
          })
        }
        break
      case 'upgraded':
        upgraded++
        if (challenge.final_severity) {
          vettedFindings.push({
            ...finding,
            severity: challenge.final_severity,
            devils_advocate: {
              challenged: true,
              original_severity: challenge.original_severity,
              final_severity: challenge.final_severity,
              decision: challenge.decision,
              reasoning: challenge.reasoning,
            },
          })
        }
        break
      default:
        // confirmed, deferred — keep as-is
        vettedFindings.push({
          ...finding,
          devils_advocate: {
            challenged: true,
            original_severity: challenge.original_severity,
            final_severity: challenge.final_severity,
            decision: challenge.decision,
            reasoning: challenge.reasoning,
          },
        })
    }
  }

  // Detect cross-references: findings on same file from different lenses
  const crossRefs: { findings: string[]; relationship: string }[] = []
  const fileToFindings = new Map<string, AuditFinding[]>()

  for (const f of vettedFindings) {
    const existing = fileToFindings.get(f.file) || []
    existing.push(f)
    fileToFindings.set(f.file, existing)
  }

  for (const [file, findings] of fileToFindings) {
    const lenses = new Set(findings.map(f => f.lens))
    if (lenses.size >= 2) {
      crossRefs.push({
        findings: findings.map(f => f.id),
        relationship: `Multiple lenses flagged issues in ${file}: ${Array.from(lenses).join(', ')}`,
      })
    }
  }

  const result: RoundtableResult = {
    original_count: allFindings.length,
    vetted_count: vettedFindings.length,
    removed: { false_positives: falsePositives, duplicates },
    severity_changes: { downgraded, upgraded },
    cross_references: crossRefs,
    vetted_findings: vettedFindings,
  }

  return {
    roundtableResult: result,
  }
}
