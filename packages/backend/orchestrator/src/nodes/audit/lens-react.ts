import { readFile } from 'fs/promises'
import { extname } from 'path'

import type { CodeAuditState } from '../../graphs/code-audit.js'
import type { LensResult, AuditFinding } from '../../artifacts/audit-findings.js'

/**
 * React Patterns Lens Node
 *
 * Detects hooks misuse, cleanup issues, DOM manipulation,
 * re-render problems, and component architecture anti-patterns.
 */

const HIGH_PATTERNS = [
  {
    pattern: /addEventListener\s*\(/,
    negPattern: /removeEventListener/,
    title: 'Missing useEffect cleanup for event listener',
    rule: 'missing-effect-cleanup',
  },
  {
    pattern: /setInterval\s*\(/,
    negPattern: /clearInterval/,
    title: 'Missing useEffect cleanup for setInterval',
    rule: 'missing-effect-cleanup',
  },
  {
    pattern: /setTimeout\s*\(/,
    negPattern: /clearTimeout/,
    title: 'Potential missing cleanup for setTimeout',
    rule: 'missing-effect-cleanup',
  },
  {
    pattern: /document\.getElementById\s*\(/,
    title: 'Direct DOM manipulation — use useRef instead',
    rule: 'no-dom-manipulation',
  },
  {
    pattern: /document\.querySelector\s*\(/,
    title: 'Direct DOM query — use useRef instead',
    rule: 'no-dom-manipulation',
  },
  {
    pattern: /URL\.createObjectURL\s*\(/,
    negPattern: /URL\.revokeObjectURL/,
    title: 'URL.createObjectURL without revokeObjectURL — memory leak',
    rule: 'missing-effect-cleanup',
  },
]

const MEDIUM_PATTERNS = [
  {
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*\}\s*\)/,
    title: 'useEffect with no dependency array — runs every render',
    rule: 'suspicious-deps',
  },
]

function isTestFile(filePath: string): boolean {
  return filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.')
}

async function scanFile(filePath: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = []

  if (extname(filePath) !== '.tsx') return findings
  if (isTestFile(filePath)) return findings

  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    return findings
  }

  let counter = 0

  // Check high severity patterns
  for (const { pattern, negPattern, title, rule } of HIGH_PATTERNS) {
    if (pattern.test(content)) {
      // If negPattern exists, check if the mitigation is present
      if (negPattern && negPattern.test(content)) continue

      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          counter++
          findings.push({
            id: `REACT-${String(counter).padStart(3, '0')}`,
            lens: 'react',
            severity: 'high',
            confidence: 'medium',
            title,
            file: filePath,
            lines: String(i + 1),
            evidence: lines[i].trim().substring(0, 200),
            remediation: `Fix: ${rule}`,
            status: 'new',
          })
          break // One finding per pattern per file
        }
      }
    }
  }

  // Check medium severity patterns
  for (const { pattern, title, rule } of MEDIUM_PATTERNS) {
    if (pattern.test(content)) {
      counter++
      findings.push({
        id: `REACT-${String(counter).padStart(3, '0')}`,
        lens: 'react',
        severity: 'medium',
        confidence: 'low',
        title,
        file: filePath,
        evidence: 'useEffect without dependency array',
        remediation: `Fix: ${rule}`,
        status: 'new',
      })
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

  // Re-number
  allFindings.forEach((f, i) => {
    f.id = `REACT-${String(i + 1).padStart(3, '0')}`
  })

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of allFindings) {
    bySeverity[f.severity]++
  }

  return {
    lens: 'react',
    total_findings: allFindings.length,
    by_severity: bySeverity,
    findings: allFindings,
  }
}
