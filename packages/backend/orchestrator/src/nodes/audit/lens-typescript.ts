import { readFile } from 'fs/promises'
import { extname } from 'path'

import type { CodeAuditState } from '../../graphs/code-audit.js'
import type { LensResult, AuditFinding, AuditSeverity } from '../../artifacts/audit-findings.js'

/**
 * TypeScript Patterns Lens Node
 *
 * Enforces Zod-first types, safe narrowing, and TypeScript best practices.
 */

function isTestFile(filePath: string): boolean {
  return filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('/test/')
}

function calibrateSeverity(baseSeverity: AuditSeverity, isTest: boolean): AuditSeverity {
  if (!isTest) return baseSeverity
  const downgrade: Record<AuditSeverity, AuditSeverity> = {
    critical: 'high',
    high: 'medium',
    medium: 'low',
    low: 'low',
  }
  return downgrade[baseSeverity]
}

const PATTERNS = [
  {
    pattern: /\bas\s+any\b/,
    title: "'as any' type assertion — use Zod .parse() or type guard",
    rule: 'no-as-any',
    baseSeverity: 'high' as AuditSeverity,
  },
  {
    pattern: /^(?:export\s+)?interface\s+\w+/m,
    title: 'TypeScript interface used — CLAUDE.md requires Zod schema with z.infer<>',
    rule: 'zod-first-types',
    baseSeverity: 'high' as AuditSeverity,
  },
  {
    pattern: /\benum\s+\w+/,
    title: 'TypeScript enum — prefer z.enum() or as const',
    rule: 'no-enum',
    baseSeverity: 'medium' as AuditSeverity,
  },
  {
    pattern: /:\s*any\[\]/,
    title: "Loose generic 'any[]' — use typed array",
    rule: 'no-loose-generics',
    baseSeverity: 'high' as AuditSeverity,
  },
  {
    pattern: /Record<string,\s*any>/,
    title: "Loose generic 'Record<string, any>' — use Zod record or proper typing",
    rule: 'no-loose-generics',
    baseSeverity: 'high' as AuditSeverity,
  },
  {
    pattern: /Promise<any>/,
    title: "Loose generic 'Promise<any>' — type the resolution value",
    rule: 'no-loose-generics',
    baseSeverity: 'high' as AuditSeverity,
  },
  {
    pattern: /\w+!\.\w+/,
    title: "Non-null assertion '!' without justification comment",
    rule: 'justified-non-null',
    baseSeverity: 'medium' as AuditSeverity,
  },
  {
    pattern: /@ts-ignore/,
    title: '@ts-ignore without explanation — use @ts-expect-error with comment',
    rule: 'no-ts-ignore',
    baseSeverity: 'medium' as AuditSeverity,
  },
]

async function scanFile(filePath: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = []
  const ext = extname(filePath)

  if (ext !== '.ts' && ext !== '.tsx') return findings
  if (filePath.endsWith('.d.ts')) return findings

  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    return findings
  }

  const isTest = isTestFile(filePath)
  const lines = content.split('\n')
  let counter = 0

  for (const { pattern, title, rule, baseSeverity } of PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        counter++
        findings.push({
          id: `TS-${String(counter).padStart(3, '0')}`,
          lens: 'typescript',
          severity: calibrateSeverity(baseSeverity, isTest),
          confidence: 'high',
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
    f.id = `TS-${String(i + 1).padStart(3, '0')}`
  })

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of allFindings) {
    bySeverity[f.severity]++
  }

  return {
    lens: 'typescript',
    total_findings: allFindings.length,
    by_severity: bySeverity,
    findings: allFindings,
  }
}
