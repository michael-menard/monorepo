import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, writeFile, rm } from 'fs/promises'

import { run } from '../lens-typescript.js'
import { LensResultSchema } from '../../../artifacts/audit-findings.js'
import type { CodeAuditState } from '../../../graphs/code-audit.js'

function makeState(files: string[]): CodeAuditState {
  return { targetFiles: files, scope: 'full', mode: 'pipeline' } as CodeAuditState
}

async function createFile(dir: string, name: string, content: string): Promise<string> {
  const filePath = join(dir, name)
  await writeFile(filePath, content, 'utf-8')
  return filePath
}

describe('lens-typescript', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `audit-ts-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })

  it('returns valid LensResultSchema output', async () => {
    const filePath = await createFile(testDir, 'clean.ts', 'export const x = 1')
    const result = await run(makeState([filePath]))
    expect(() => LensResultSchema.parse(result)).not.toThrow()
    expect(result.lens).toBe('typescript')
  })

  it('detects "as any" type assertion', async () => {
    const filePath = await createFile(testDir, 'asAny.ts', 'const x = getData() as any')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('as any'))).toBe(true)
    expect(result.findings.some(f => f.severity === 'high')).toBe(true)
  })

  it('detects TypeScript interface usage', async () => {
    const filePath = await createFile(testDir, 'iface.ts', 'export interface User { id: string }')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('interface'))).toBe(true)
    expect(result.findings.some(f => f.severity === 'high')).toBe(true)
  })

  it('detects TypeScript enum usage', async () => {
    const filePath = await createFile(testDir, 'enum.ts', 'enum Status { Active, Inactive }')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('enum'))).toBe(true)
    expect(result.findings.some(f => f.severity === 'medium')).toBe(true)
  })

  it('detects "any[]" loose generic', async () => {
    const filePath = await createFile(testDir, 'anyArr.ts', 'function process(items: any[]) {}')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('any[]'))).toBe(true)
  })

  it('detects "Record<string, any>" loose generic', async () => {
    const filePath = await createFile(testDir, 'record.ts', 'const data: Record<string, any> = {}')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('Record<string, any>'))).toBe(true)
  })

  it('detects "Promise<any>" loose generic', async () => {
    const filePath = await createFile(testDir, 'promise.ts', 'async function fetch(): Promise<any> {}')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('Promise<any>'))).toBe(true)
  })

  it('detects @ts-ignore', async () => {
    const filePath = await createFile(testDir, 'tsIgnore.ts', '// @ts-ignore\nconst x: string = 42')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('@ts-ignore'))).toBe(true)
  })

  it('severity downgraded for __tests__/ paths — high → medium', async () => {
    const testsDir = join(testDir, '__tests__')
    await mkdir(testsDir, { recursive: true })
    const filePath = await createFile(testsDir, 'util.test.ts', 'const x = getData() as any')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    // high base severity downgraded to medium in test files
    expect(result.findings.some(f => f.severity === 'medium')).toBe(true)
    // No high severity for test files with as any
    expect(result.findings.some(f => f.severity === 'high')).toBe(false)
  })

  it('severity downgraded for .test.ts paths — high → medium', async () => {
    const filePath = await createFile(testDir, 'component.test.ts', 'const x = getData() as any')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.every(f => f.severity !== 'high')).toBe(true)
  })

  it('production src/ path (no __tests__ segment) → severity === "high" (AC-6)', async () => {
    // AC-6: severity calibration — file placed directly in testDir (no __tests__/ or .test. in path)
    // represents a production source file → as any should be severity high
    const filePath = await createFile(testDir, 'asAny.ts', 'const x = getData() as any')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.severity === 'high')).toBe(true)
    // Ensure no severity downgrade occurred for non-test path
    expect(result.findings.some(f => f.title.includes('as any') && f.severity === 'high')).toBe(true)
  })

  it('.json files produce 0 findings', async () => {
    const filePath = await createFile(testDir, 'config.json', '{"key": "value"}')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('one finding per pattern per file (break after first match)', async () => {
    const filePath = await createFile(testDir, 'multi.ts', [
      'const a = x as any',
      'const b = y as any',
      'const c = z as any',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    // Should have exactly 1 finding for "as any" (breaks after first match)
    const asAnyFindings = result.findings.filter(f => f.title.includes('as any'))
    expect(asAnyFindings.length).toBe(1)
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

  it('.d.ts files produce 0 findings', async () => {
    const filePath = await createFile(testDir, 'types.d.ts', 'interface Foo { bar: any[] }')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
  })

  it('clean .ts file produces 0 findings', async () => {
    const filePath = await createFile(testDir, 'clean.ts', [
      "import { z } from 'zod'",
      'const UserSchema = z.object({ id: z.string() })',
      'type User = z.infer<typeof UserSchema>',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
  })

  it('empty state targetFiles → 0 findings', async () => {
    const result = await run(makeState([]))
    expect(result.total_findings).toBe(0)
    expect(result.lens).toBe('typescript')
    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('by_severity counts match findings array', async () => {
    const filePath = await createFile(testDir, 'multi-issues.ts', [
      'const x = getData() as any',
      'export interface User { id: string }',
      'enum Status { Active, Inactive }',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    const sumSeverity =
      result.by_severity.critical +
      result.by_severity.high +
      result.by_severity.medium +
      result.by_severity.low
    expect(sumSeverity).toBe(result.total_findings)
  })
})
