import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, writeFile, rm } from 'fs/promises'

import { run } from '../lens-code-quality.js'
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

describe('lens-code-quality', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `audit-cq-${Date.now()}`)
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
    expect(result.lens).toBe('code-quality')
  })

  it('detects empty catch block — catch (e) {}', async () => {
    const filePath = await createFile(testDir, 'emptyCatch.ts', [
      'try {',
      '  doSomething()',
      '} catch (e) {}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('Empty catch'))).toBe(true)
    expect(result.findings.some(f => f.severity === 'high')).toBe(true)
  })

  it('detects empty catch block — catch {}', async () => {
    const filePath = await createFile(testDir, 'emptyCatch2.ts', [
      'try {',
      '  doSomething()',
      '} catch {}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('Empty catch'))).toBe(true)
  })

  it('detects console.log usage', async () => {
    const filePath = await createFile(testDir, 'logging.ts', 'console.log("hello world")')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('console'))).toBe(true)
    expect(result.findings.some(f => f.severity === 'medium')).toBe(true)
  })

  it('detects console.error usage', async () => {
    const filePath = await createFile(testDir, 'errors.ts', 'console.error("something went wrong")')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('console'))).toBe(true)
  })

  it('detects TODO comment', async () => {
    const filePath = await createFile(testDir, 'todo.ts', '// TODO: fix this later')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('TODO'))).toBe(true)
  })

  it('detects FIXME comment', async () => {
    const filePath = await createFile(testDir, 'fixme.ts', '// FIXME: broken logic here')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('FIXME'))).toBe(true)
  })

  it('detects HACK comment', async () => {
    const filePath = await createFile(testDir, 'hack.ts', '// HACK: temporary workaround')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('HACK'))).toBe(true)
  })

  it('detects file > 300 lines', async () => {
    const lines = Array.from({ length: 310 }, (_, i) => `export const x${i} = ${i}`)
    const filePath = await createFile(testDir, 'long.ts', lines.join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('300 lines'))).toBe(true)
    expect(result.findings.some(f => f.severity === 'medium')).toBe(true)
  })

  it('excludes test files from scanning', async () => {
    const filePath = await createFile(
      testDir,
      'util.test.ts',
      'catch (e) {}\nconsole.log("test")',
    )
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
  })

  it('excludes __tests__ directory files', async () => {
    const testsDir = join(testDir, '__tests__')
    await mkdir(testsDir, { recursive: true })
    const filePath = await createFile(testsDir, 'util.test.ts', 'catch (e) {}')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
  })

  it('excludes .d.ts declaration files', async () => {
    const filePath = await createFile(testDir, 'types.d.ts', '// TODO: add types\nconsole.log("x")')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
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

  it('clean .ts file produces 0 findings', async () => {
    const filePath = await createFile(testDir, 'clean.ts', [
      'import { logger } from "@repo/logger"',
      'export function add(a: number, b: number): number {',
      '  logger.info("adding")',
      '  return a + b',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
  })
})
