import { readFile } from 'fs/promises'
import { extname } from 'path'

import type { CodeAuditState } from '../../graphs/code-audit.js'
import type { LensResult, AuditFinding } from '../../artifacts/audit-findings.js'

/**
 * Accessibility Lens Node
 *
 * WCAG 2.1 AA compliance scanning for frontend files.
 */

function isTestFile(filePath: string): boolean {
  return filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.')
}

function isFrontendFile(filePath: string): boolean {
  return filePath.includes('apps/web/') && extname(filePath) === '.tsx'
}

const HIGH_CHECKS = [
  {
    pattern: /<button[^>]*>[\s]*<\w+Icon/,
    negPattern: /aria-label/,
    title: 'Icon-only button missing aria-label',
    rule: 'button-has-label',
    wcag: '4.1.2 Name, Role, Value',
  },
  {
    pattern: /<img(?![^>]*alt)/,
    title: '<img> missing alt attribute',
    rule: 'img-has-alt',
    wcag: '1.1.1 Non-text Content',
  },
  {
    pattern: /<div[^>]*onClick/,
    negPattern: /onKeyDown|onKeyUp|role=/,
    title: '<div onClick> without keyboard handler — not keyboard accessible',
    rule: 'click-events-have-key-events',
    wcag: '2.1.1 Keyboard',
  },
  {
    pattern: /<span[^>]*onClick/,
    negPattern: /onKeyDown|onKeyUp|role=/,
    title: '<span onClick> without keyboard handler — not keyboard accessible',
    rule: 'click-events-have-key-events',
    wcag: '2.1.1 Keyboard',
  },
]

const MEDIUM_CHECKS = [
  {
    pattern: /aria-live/,
    invert: true, // Flag if NOT present alongside dynamic content patterns
    dynamicPattern: /setState|setLoading|setError|toast/,
    title: 'Dynamic content update without aria-live region',
    rule: 'dynamic-content-announce',
    wcag: '4.1.3 Status Messages',
  },
]

async function scanFile(filePath: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = []

  if (!isFrontendFile(filePath)) return findings
  if (isTestFile(filePath)) return findings

  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    return findings
  }

  const lines = content.split('\n')
  let counter = 0

  for (const check of HIGH_CHECKS) {
    for (let i = 0; i < lines.length; i++) {
      if (check.pattern.test(lines[i])) {
        if (check.negPattern && check.negPattern.test(lines[i])) continue

        counter++
        findings.push({
          id: `A11Y-${String(counter).padStart(3, '0')}`,
          lens: 'a11y',
          severity: 'high',
          confidence: 'high',
          title: check.title,
          description: `WCAG ${check.wcag}`,
          file: filePath,
          lines: String(i + 1),
          evidence: lines[i].trim().substring(0, 200),
          remediation: `Fix: ${check.rule}`,
          status: 'new',
        })
        break // One per check per file
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

  // Re-number
  allFindings.forEach((f, i) => {
    f.id = `A11Y-${String(i + 1).padStart(3, '0')}`
  })

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of allFindings) {
    bySeverity[f.severity]++
  }

  return {
    lens: 'a11y',
    total_findings: allFindings.length,
    by_severity: bySeverity,
    findings: allFindings,
  }
}
