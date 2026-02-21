import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, writeFile, rm } from 'fs/promises'

import { run } from '../lens-security.js'
import { LensResultSchema } from '../../../artifacts/audit-findings.js'
import type { CodeAuditState } from '../../../graphs/code-audit.js'

// --- Test Helpers ---

function makeState(files: string[]): CodeAuditState {
  return {
    targetFiles: files,
    scope: 'full',
    mode: 'pipeline',
  } as CodeAuditState
}

async function createFile(dir: string, name: string, content: string): Promise<string> {
  const filePath = join(dir, name)
  await writeFile(filePath, content, 'utf-8')
  return filePath
}

// --- Tests ---

describe('lens-security', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `audit-security-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('returns valid LensResultSchema output', async () => {
    const filePath = await createFile(testDir, 'clean.ts', 'export const x = 1')
    const result = await run(makeState([filePath]))
    expect(() => LensResultSchema.parse(result)).not.toThrow()
    expect(result.lens).toBe('security')
  })

  it('detects hardcoded secret — const apiKey', async () => {
    const filePath = await createFile(
      testDir,
      'secrets.ts',
      `const apiKey = 'supersecretvalue123'`,
    )
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings[0].severity).toBe('critical')
    expect(result.findings[0].lens).toBe('security')
  })

  it('detects hardcoded password', async () => {
    const filePath = await createFile(
      testDir,
      'auth.ts',
      `const password = 'hardcodedpassword'`,
    )
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.severity === 'critical')).toBe(true)
  })

  it('detects eval() usage', async () => {
    const filePath = await createFile(
      testDir,
      'evil.ts',
      `eval(userInput)`,
    )
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('eval'))).toBe(true)
    expect(result.findings.some(f => f.severity === 'critical')).toBe(true)
  })

  it('detects child_process.exec()', async () => {
    const filePath = await createFile(
      testDir,
      'cmd.ts',
      `child_process.exec('rm -rf /')`,
    )
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('child_process'))).toBe(true)
  })

  it('detects dangerouslySetInnerHTML', async () => {
    const filePath = await createFile(
      testDir,
      'html.tsx',
      `<div dangerouslySetInnerHTML={{ __html: userInput }} />`,
    )
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('dangerouslySetInnerHTML'))).toBe(true)
    expect(result.findings.some(f => f.severity === 'high')).toBe(true)
  })

  it('detects wildcard CORS origin', async () => {
    const filePath = await createFile(
      testDir,
      'cors.ts',
      `cors({ origin: '*' })`,
    )
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('CORS'))).toBe(true)
  })

  it('detects SQL template literal injection', async () => {
    const filePath = await createFile(
      testDir,
      'query.ts',
      'db.query(`SELECT * FROM users WHERE id = ${userId}`)',
    )
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('SQL'))).toBe(true)
    expect(result.findings.some(f => f.severity === 'high')).toBe(true)
  })

  it('detects sensitive data in console output', async () => {
    const filePath = await createFile(
      testDir,
      'logging.ts',
      `console.log('User password:', password)`,
    )
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.toLowerCase().includes('sensitive'))).toBe(true)
  })

  it('clean file produces 0 findings', async () => {
    const filePath = await createFile(
      testDir,
      'clean.ts',
      `export function add(a: number, b: number): number { return a + b }`,
    )
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
    expect(result.findings).toEqual([])
    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('empty file (0 bytes) → total_findings: 0', async () => {
    const filePath = await createFile(testDir, 'empty.ts', '')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
    expect(result.findings).toEqual([])
    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('non-existent path → empty findings, no throw', async () => {
    const nonExistent = join(testDir, 'does-not-exist.ts')
    const result = await run(makeState([nonExistent]))
    expect(result.total_findings).toBe(0)
    expect(result.findings).toEqual([])
    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('empty state targetFiles → 0 findings', async () => {
    const result = await run(makeState([]))
    expect(result.total_findings).toBe(0)
    expect(result.lens).toBe('security')
    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('findings have required fields (id, lens, file, evidence, remediation)', async () => {
    const filePath = await createFile(testDir, 'keys.ts', `const secret = 'topsecretvalue123'`)
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    const finding = result.findings[0]
    expect(finding.id).toBeTruthy()
    expect(finding.lens).toBe('security')
    expect(finding.file).toBe(filePath)
    expect(finding.evidence).toBeTruthy()
    expect(finding.remediation).toBeTruthy()
  })

  it('by_severity counts match findings array', async () => {
    const filePath = await createFile(testDir, 'multi.ts', [
      `const apiKey = 'verysecretkey123'`,
      `eval(userInput)`,
      `dangerouslySetInnerHTML={{ __html: x }}`,
    ].join('\n'))
    const result = await run(makeState([filePath]))
    const sumSeverity = result.by_severity.critical + result.by_severity.high + result.by_severity.medium + result.by_severity.low
    expect(sumSeverity).toBe(result.total_findings)
  })
})
