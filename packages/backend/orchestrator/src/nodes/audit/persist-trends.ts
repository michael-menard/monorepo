import { readFile, readdir, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { parse, stringify } from 'yaml'

import type { CodeAuditState } from '../../graphs/code-audit.js'
import type { TrendSnapshot, TrendDirection, AuditSeverity } from '../../artifacts/audit-findings.js'
import { calculateTrend } from '../../artifacts/audit-findings.js'

/**
 * Persist Trends Node
 *
 * Compute trend data from all FINDINGS files and write TRENDS.yaml.
 */

interface FindingsSummary {
  date: string
  total: number
  bySeverity: Record<string, number>
  byLens: Record<string, number>
}

async function loadAllFindings(auditDir: string): Promise<FindingsSummary[]> {
  const summaries: FindingsSummary[] = []

  try {
    const entries = await readdir(auditDir)
    const findingsFiles = entries
      .filter(f => f.startsWith('FINDINGS-') && f.endsWith('.yaml'))
      .sort()

    for (const file of findingsFiles) {
      try {
        const content = await readFile(join(auditDir, file), 'utf-8')
        const parsed = parse(content)
        const date = file.replace('FINDINGS-', '').replace('.yaml', '')

        summaries.push({
          date,
          total: parsed.summary?.total_findings || 0,
          bySeverity: parsed.summary?.by_severity || {},
          byLens: parsed.summary?.by_lens || {},
        })
      } catch {
        // Skip unparseable files
      }
    }
  } catch {
    // audit dir doesn't exist
  }

  return summaries
}

export async function persistTrends(state: CodeAuditState): Promise<Partial<CodeAuditState>> {
  const auditDir = 'plans/audit'
  const summaries = await loadAllFindings(auditDir)

  if (summaries.length === 0) {
    return { completed: true }
  }

  const current = summaries[summaries.length - 1]
  const previous = summaries.length >= 2 ? summaries[summaries.length - 2] : null

  // Overall trend
  const overallTrend = previous
    ? calculateTrend(current.total, previous.total)
    : 'stable' as TrendDirection

  const delta = previous ? current.total - previous.total : 0
  const fixRate = previous && previous.total > 0
    ? Math.max(0, (previous.total - current.total)) / previous.total
    : 0

  // By severity trends
  const severities: AuditSeverity[] = ['critical', 'high', 'medium', 'low']
  const bySeverity: Record<string, { current: number; previous: number; trend: TrendDirection }> = {}
  for (const sev of severities) {
    const cur = current.bySeverity[sev] || 0
    const prev = previous?.bySeverity[sev] || 0
    bySeverity[sev] = {
      current: cur,
      previous: prev,
      trend: calculateTrend(cur, prev),
    }
  }

  // By lens trends
  const allLenses = new Set<string>()
  for (const s of summaries) {
    for (const lens of Object.keys(s.byLens)) {
      allLenses.add(lens)
    }
  }

  const byLens: Record<string, { current: number; previous: number; trend: TrendDirection }> = {}
  for (const lens of allLenses) {
    const cur = current.byLens[lens] || 0
    const prev = previous?.byLens[lens] || 0
    byLens[lens] = {
      current: cur,
      previous: prev,
      trend: calculateTrend(cur, prev),
    }
  }

  // Timeline
  const timeline = summaries.map(s => ({
    date: s.date,
    total: s.total,
    critical: s.bySeverity.critical || 0,
    high: s.bySeverity.high || 0,
    medium: s.bySeverity.medium || 0,
    low: s.bySeverity.low || 0,
  }))

  const trendSnapshot: TrendSnapshot = {
    schema: 1,
    generated: new Date().toISOString(),
    window_days: 30,
    audits_analyzed: summaries.length,
    overall: {
      trend: overallTrend,
      total_findings_current: current.total,
      total_findings_previous: previous?.total || 0,
      delta,
      fix_rate: Math.round(fixRate * 100) / 100,
    },
    by_severity: bySeverity,
    by_lens: byLens,
    worst_offenders: [], // Would need file-level tracking across audits
    timeline,
  }

  // Write TRENDS.yaml
  try {
    await mkdir(auditDir, { recursive: true })
    const yamlContent = stringify(trendSnapshot, { lineWidth: 120 })
    await writeFile(join(auditDir, 'TRENDS.yaml'), yamlContent, 'utf-8')
  } catch {
    // Non-fatal
  }

  return {
    trendData: trendSnapshot,
    completed: true,
  }
}
