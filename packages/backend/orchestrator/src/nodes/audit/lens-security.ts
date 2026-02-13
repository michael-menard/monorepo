import { z } from 'zod'
import { readFile } from 'fs/promises'

import type { CodeAuditState } from '../../graphs/code-audit.js'
import type { LensResult, AuditFinding } from '../../artifacts/audit-findings.js'

/**
 * Security Lens Node
 *
 * Scans for authentication, authorization, input validation,
 * data handling, and injection vulnerabilities.
 */

const CRITICAL_PATTERNS = [
  { pattern: /(?:const|let|var)\s+\w*(?:key|secret|password|token)\w*\s*=\s*['"][^'"]{8,}['"]/i, title: 'Hardcoded secret in source', severity: 'critical' as const },
  { pattern: /eval\s*\(/, title: 'eval() usage — potential code injection', severity: 'critical' as const },
  { pattern: /child_process.*exec\s*\(/, title: 'child_process.exec() — potential command injection', severity: 'critical' as const },
  { pattern: /dangerouslySetInnerHTML/, title: 'dangerouslySetInnerHTML without sanitization', severity: 'high' as const },
  { pattern: /cors.*origin:\s*['"]?\*['"]?/, title: 'Wildcard CORS origin', severity: 'high' as const },
]

const HIGH_PATTERNS = [
  { pattern: /console\.(log|error|warn)\s*\(.*(?:password|token|secret|apiKey)/i, title: 'Sensitive data in console output', severity: 'high' as const },
  { pattern: /\.query\s*\(\s*`[^`]*\$\{/, title: 'SQL template literal — potential injection', severity: 'high' as const },
]

const MEDIUM_PATTERNS = [
  { pattern: /catch\s*\([^)]*\)\s*\{[^}]*(?:res\.json|res\.send)\s*\([^)]*(?:error|err|e)\b/i, title: 'Error details exposed in API response', severity: 'medium' as const },
]

async function scanFile(filePath: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = []
  let content: string

  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    return findings
  }

  const lines = content.split('\n')
  let findingCounter = 0

  const allPatterns = [...CRITICAL_PATTERNS, ...HIGH_PATTERNS, ...MEDIUM_PATTERNS]

  for (const { pattern, title, severity } of allPatterns) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        findingCounter++
        findings.push({
          id: `SEC-${String(findingCounter).padStart(3, '0')}`,
          lens: 'security',
          severity,
          confidence: severity === 'critical' ? 'high' : 'medium',
          title,
          file: filePath,
          lines: String(i + 1),
          evidence: lines[i].trim().substring(0, 200),
          remediation: `Review and fix ${severity} security issue`,
          status: 'new',
        })
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

  // Re-number findings sequentially
  allFindings.forEach((f, i) => {
    f.id = `SEC-${String(i + 1).padStart(3, '0')}`
  })

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of allFindings) {
    bySeverity[f.severity]++
  }

  return {
    lens: 'security',
    total_findings: allFindings.length,
    by_severity: bySeverity,
    findings: allFindings,
  }
}
