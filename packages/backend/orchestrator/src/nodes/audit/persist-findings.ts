import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { stringify } from 'yaml'

import type { CodeAuditState } from '../../graphs/code-audit.js'
import type { AuditFindings, AuditSeverity } from '../../artifacts/audit-findings.js'

/**
 * Persist Findings Node
 *
 * Write FINDINGS-{date}.yaml to plans/audit/
 */

function formatDate(): string {
  return new Date().toISOString().split('T')[0]
}

export async function persistFindings(state: CodeAuditState): Promise<Partial<CodeAuditState>> {
  const findings = state.findings || []
  const lensResults = state.lensResults || []
  const lenses = state.lenses || []

  // Calculate summary
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of findings) {
    bySeverity[f.severity]++
  }

  const byLens: Record<string, number> = {}
  for (const f of findings) {
    byLens[f.lens] = (byLens[f.lens] || 0) + 1
  }

  const dedupResult = state.deduplicationResult
  const newSinceLast = dedupResult?.new_findings || findings.length
  const recurring = dedupResult?.duplicates_found || 0

  const auditFindings: AuditFindings = {
    schema: 1,
    timestamp: new Date().toISOString(),
    mode: state.mode || 'pipeline',
    scope: state.scope || 'full',
    target: state.target || 'apps/',
    lenses_run: lenses,
    summary: {
      total_findings: findings.length,
      by_severity: bySeverity,
      by_lens: byLens,
      new_since_last: newSinceLast,
      recurring,
      fixed_since_last: 0,
    },
    findings,
    metrics: {
      files_scanned: state.targetFiles?.length || 0,
    },
    trend_data: {
      previous_run: state.previousAudit,
    },
  }

  // Write to file
  const auditDir = 'plans/audit'
  try {
    await mkdir(auditDir, { recursive: true })
  } catch {
    // Directory may exist
  }

  const filename = `FINDINGS-${formatDate()}.yaml`
  const filePath = join(auditDir, filename)
  const yamlContent = stringify(auditFindings, { lineWidth: 120 })

  try {
    await writeFile(filePath, yamlContent, 'utf-8')
  } catch (err) {
    return {
      auditFindings,
      errors: [`Failed to write ${filePath}: ${err}`],
    }
  }

  return {
    auditFindings,
  }
}
