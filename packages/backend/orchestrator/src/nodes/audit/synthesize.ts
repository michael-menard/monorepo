import type { CodeAuditState } from '../../graphs/code-audit.js'
import type { AuditFinding } from '../../artifacts/audit-findings.js'

/**
 * Synthesize Node
 *
 * Merge all findings (from lenses or roundtable), assign sequential IDs,
 * and sort by severity for the final findings list.
 */

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

export async function synthesize(state: CodeAuditState): Promise<Partial<CodeAuditState>> {
  let allFindings: AuditFinding[]

  if (state.roundtableResult) {
    // Roundtable mode — use vetted findings
    allFindings = [...state.roundtableResult.vetted_findings]
  } else {
    // Pipeline mode — use raw lens results
    const lensResults = state.lensResults || []
    allFindings = lensResults.flatMap(r => r.findings)
  }

  // Dedup: same file + same title = merge (keep higher severity)
  const dedupMap = new Map<string, AuditFinding>()
  for (const finding of allFindings) {
    const key = `${finding.file}:${finding.title}`
    const existing = dedupMap.get(key)
    if (existing) {
      // Keep higher severity
      if (SEVERITY_ORDER[finding.severity] < SEVERITY_ORDER[existing.severity]) {
        dedupMap.set(key, finding)
      }
    } else {
      dedupMap.set(key, finding)
    }
  }

  const deduped = Array.from(dedupMap.values())

  // Sort by severity, then by lens priority
  deduped.sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (sevDiff !== 0) return sevDiff
    return a.file.localeCompare(b.file)
  })

  // Assign final sequential IDs
  deduped.forEach((f, i) => {
    f.id = `AUDIT-${String(i + 1).padStart(3, '0')}`
  })

  // Limit to top 100
  const limited = deduped.slice(0, 100)

  return {
    findings: limited,
  }
}
