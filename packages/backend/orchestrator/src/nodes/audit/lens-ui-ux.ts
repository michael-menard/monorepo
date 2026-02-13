import { readFile } from 'fs/promises'
import { extname } from 'path'

import type { CodeAuditState } from '../../graphs/code-audit.js'
import type { LensResult, AuditFinding } from '../../artifacts/audit-findings.js'

/**
 * UI/UX Lens Node
 *
 * Design system adherence, component consistency, visual quality.
 */

function isFrontendTsx(filePath: string): boolean {
  return filePath.includes('apps/web/') && extname(filePath) === '.tsx'
}

function isTestFile(filePath: string): boolean {
  return filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.')
}

const HIGH_PATTERNS = [
  {
    pattern: /style=\{\{/,
    title: 'Inline styles used — use Tailwind classes instead',
    rule: 'no-inline-styles',
  },
  {
    pattern: /(?:text|bg|border)-\[#[0-9a-fA-F]+\]/,
    title: 'Arbitrary color value — use design token',
    rule: 'no-arbitrary-colors',
  },
  {
    pattern: /import.*\.css['"](?!.*tailwind)/,
    title: 'CSS file imported — use Tailwind utilities',
    rule: 'no-css-files',
  },
  {
    pattern: /styled\.|css`|emotion/,
    title: 'CSS-in-JS library detected — use Tailwind',
    rule: 'no-css-in-js',
  },
]

const MEDIUM_PATTERNS = [
  {
    pattern: /\.style\s*\.\s*\w+\s*=/,
    title: 'Direct DOM style manipulation',
    rule: 'no-dom-styles',
  },
]

async function scanFile(filePath: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = []

  if (!isFrontendTsx(filePath)) return findings
  if (isTestFile(filePath)) return findings

  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    return findings
  }

  const lines = content.split('\n')
  let counter = 0

  for (const { pattern, title, rule } of HIGH_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        // Allow style={{}} for dynamic calc values
        if (rule === 'no-inline-styles' && /calc\(/.test(lines[i])) continue

        counter++
        findings.push({
          id: `UIUX-${String(counter).padStart(3, '0')}`,
          lens: 'ui-ux',
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

  for (const { pattern, title, rule } of MEDIUM_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        counter++
        findings.push({
          id: `UIUX-${String(counter).padStart(3, '0')}`,
          lens: 'ui-ux',
          severity: 'medium',
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
    f.id = `UIUX-${String(i + 1).padStart(3, '0')}`
  })

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of allFindings) {
    bySeverity[f.severity]++
  }

  return {
    lens: 'ui-ux',
    total_findings: allFindings.length,
    by_severity: bySeverity,
    findings: allFindings,
  }
}
