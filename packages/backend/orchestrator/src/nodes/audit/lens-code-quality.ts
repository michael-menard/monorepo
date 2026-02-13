import { readFile } from 'fs/promises'
import { extname } from 'path'

import type { CodeAuditState } from '../../graphs/code-audit.js'
import type { LensResult, AuditFinding } from '../../artifacts/audit-findings.js'

/**
 * Code Quality Lens Node
 *
 * Error handling gaps, dead code, empty catches, complexity.
 */

function isTestFile(filePath: string): boolean {
  return filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.')
}

const HIGH_PATTERNS = [
  {
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
    title: 'Empty catch block — error silently swallowed',
    rule: 'no-empty-catch',
  },
  {
    pattern: /catch\s*\{\s*\}/,
    title: 'Empty catch block — error silently swallowed',
    rule: 'no-empty-catch',
  },
]

const MEDIUM_PATTERNS = [
  {
    pattern: /console\.(log|error|warn|info|debug)\s*\(/,
    title: 'console.* usage — use @repo/logger instead',
    rule: 'no-console',
  },
  {
    pattern: /\/\/\s*TODO/i,
    title: 'TODO comment — track as technical debt',
    rule: 'no-todo',
  },
  {
    pattern: /\/\/\s*FIXME/i,
    title: 'FIXME comment — indicates known issue',
    rule: 'no-fixme',
  },
  {
    pattern: /\/\/\s*HACK/i,
    title: 'HACK comment — indicates workaround',
    rule: 'no-hack',
  },
]

async function scanFile(filePath: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = []

  const ext = extname(filePath)
  if (ext !== '.ts' && ext !== '.tsx') return findings
  if (filePath.endsWith('.d.ts')) return findings
  if (isTestFile(filePath)) return findings

  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    return findings
  }

  const lines = content.split('\n')
  let counter = 0

  // Check file length
  if (lines.length > 300) {
    counter++
    findings.push({
      id: `CQ-${String(counter).padStart(3, '0')}`,
      lens: 'code-quality',
      severity: 'medium',
      confidence: 'high',
      title: `File exceeds 300 lines (${lines.length} lines) — consider splitting`,
      file: filePath,
      evidence: `${lines.length} lines`,
      remediation: 'Split into smaller, focused modules',
      status: 'new',
    })
  }

  // Check patterns
  for (const { pattern, title, rule } of HIGH_PATTERNS) {
    if (pattern.test(content)) {
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          counter++
          findings.push({
            id: `CQ-${String(counter).padStart(3, '0')}`,
            lens: 'code-quality',
            severity: 'high',
            confidence: 'high',
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
  }

  for (const { pattern, title, rule } of MEDIUM_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        counter++
        findings.push({
          id: `CQ-${String(counter).padStart(3, '0')}`,
          lens: 'code-quality',
          severity: 'medium',
          confidence: 'high',
          title,
          file: filePath,
          lines: String(i + 1),
          evidence: lines[i].trim().substring(0, 200),
          remediation: `Fix: ${rule}`,
          status: 'new',
        })
        break // One per pattern per file
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
    f.id = `CQ-${String(i + 1).padStart(3, '0')}`
  })

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of allFindings) {
    bySeverity[f.severity]++
  }

  return {
    lens: 'code-quality',
    total_findings: allFindings.length,
    by_severity: bySeverity,
    findings: allFindings,
  }
}
