import { readFile } from 'fs/promises'
import { extname } from 'path'

import type { CodeAuditState } from '../../graphs/code-audit.js'
import type { LensResult, AuditFinding } from '../../artifacts/audit-findings.js'

/**
 * Performance Lens Node
 *
 * N+1 queries, memory leaks, bundle size, re-render issues.
 */

function isTestFile(filePath: string): boolean {
  return filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.')
}

const BACKEND_HIGH_PATTERNS = [
  {
    pattern: /for\s*\(.*\)\s*\{[^}]*(?:\.query|\.findOne|\.findById|await\s+\w+Repository)/s,
    title: 'Potential N+1 query pattern — DB call inside loop',
    rule: 'no-n-plus-one',
  },
  {
    pattern: /readFileSync\s*\(/,
    title: 'Synchronous file I/O in request handler',
    rule: 'no-sync-io',
  },
]

const FRONTEND_HIGH_PATTERNS = [
  {
    pattern: /import\s+(?:_\s+from\s+)?['"]lodash['"]/,
    title: "Full lodash import — use 'lodash/function' for tree-shaking",
    rule: 'no-full-lodash',
  },
  {
    pattern: /import\s+\*\s+as\s+\w+\s+from\s+['"]moment['"]/,
    title: 'moment.js imported — use date-fns or dayjs for smaller bundle',
    rule: 'no-moment',
  },
]

const FRONTEND_MEDIUM_PATTERNS = [
  {
    pattern: /console\.(log|error|warn|info)\s*\(/,
    title: 'Console statement in production code — use @repo/logger',
    rule: 'no-console',
  },
]

async function scanFile(filePath: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = []
  if (isTestFile(filePath)) return findings

  const ext = extname(filePath)
  if (ext !== '.ts' && ext !== '.tsx') return findings

  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    return findings
  }

  const lines = content.split('\n')
  let counter = 0
  const isBackend = filePath.includes('apps/api/')
  const isFrontend = filePath.includes('apps/web/')

  const patterns = [
    ...(isBackend ? BACKEND_HIGH_PATTERNS.map(p => ({ ...p, severity: 'high' as const })) : []),
    ...(isFrontend ? FRONTEND_HIGH_PATTERNS.map(p => ({ ...p, severity: 'high' as const })) : []),
    ...(isFrontend ? FRONTEND_MEDIUM_PATTERNS.map(p => ({ ...p, severity: 'medium' as const })) : []),
  ]

  for (const { pattern, title, rule, severity } of patterns) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        counter++
        findings.push({
          id: `PERF-${String(counter).padStart(3, '0')}`,
          lens: 'performance',
          severity,
          confidence: 'medium',
          title,
          file: filePath,
          lines: String(i + 1),
          evidence: lines[i].trim().substring(0, 200),
          remediation: `Fix: ${rule}`,
          status: 'new',
        })
        break
      }
    }
  }

  return findings
}

export async function run(state: CodeAuditState): Promise<LensResult> {
  const files = state.targetFiles || []
  const allFindings: AuditFinding[] = []

  for (const file of files) {
    const fileFindings = await scanFile(file)
    allFindings.push(...fileFindings)
  }

  allFindings.forEach((f, i) => {
    f.id = `PERF-${String(i + 1).padStart(3, '0')}`
  })

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of allFindings) {
    bySeverity[f.severity]++
  }

  return {
    lens: 'performance',
    total_findings: allFindings.length,
    by_severity: bySeverity,
    findings: allFindings,
  }
}
