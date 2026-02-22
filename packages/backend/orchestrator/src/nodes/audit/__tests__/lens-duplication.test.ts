import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, writeFile, rm } from 'fs/promises'

import { run } from '../lens-duplication.js'
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

describe('lens-duplication', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `audit-dup-${Date.now()}`)
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
    expect(result.lens).toBe('duplication')
  })

  it('detects same filename in 2 different apps (cross-app duplicate)', async () => {
    // Create files with same name in two different apps/web/* directories
    const app1Dir = join(testDir, 'apps', 'web', 'main-app', 'src', 'hooks')
    const app2Dir = join(testDir, 'apps', 'web', 'app-dashboard', 'src', 'hooks')
    await mkdir(app1Dir, { recursive: true })
    await mkdir(app2Dir, { recursive: true })

    const file1 = await createFile(app1Dir, 'useLocalStorage.ts', 'export function useLocalStorage() {}')
    const file2 = await createFile(app2Dir, 'useLocalStorage.ts', 'export function useLocalStorage() {}')

    const result = await run(makeState([file1, file2]))
    expect(result.total_findings).toBeGreaterThan(0)
    const dupFindings = result.findings.filter(f => f.title.includes('useLocalStorage'))
    expect(dupFindings.length).toBeGreaterThan(0)
    expect(dupFindings[0].severity).toBe('high')
    expect(dupFindings[0].lens).toBe('duplication')
  })

  it('same filename in same app (not cross-app) — no finding', async () => {
    // Two files with same name but in different subdirs of same app
    const dir1 = join(testDir, 'apps', 'web', 'main-app', 'src', 'hooks')
    const dir2 = join(testDir, 'apps', 'web', 'main-app', 'src', 'utils')
    await mkdir(dir1, { recursive: true })
    await mkdir(dir2, { recursive: true })

    const file1 = await createFile(dir1, 'helpers.ts', 'export const x = 1')
    const file2 = await createFile(dir2, 'helpers.ts', 'export const y = 2')

    const result = await run(makeState([file1, file2]))
    // Both in same app (main-app) → no cross-app dup
    const crossAppFindings = result.findings.filter(f =>
      f.title.includes('helpers') && f.severity === 'high'
    )
    expect(crossAppFindings.length).toBe(0)
  })

  it('detects known hook name (useLocalStorage) in apps/web/ path', async () => {
    const appDir = join(testDir, 'apps', 'web', 'main-app', 'src', 'hooks')
    await mkdir(appDir, { recursive: true })
    const filePath = await createFile(appDir, 'useLocalStorage.ts', 'export function useLocalStorage() {}')

    const result = await run(makeState([filePath]))
    // Known duplicate hooks are detected
    const knownHookFindings = result.findings.filter(f =>
      f.title.includes('useLocalStorage') && f.severity === 'medium'
    )
    expect(knownHookFindings.length).toBeGreaterThan(0)
    expect(knownHookFindings[0].confidence).toBe('high')
  })

  it('detects known hook name (useAnnouncer) in apps/web/ path', async () => {
    const appDir = join(testDir, 'apps', 'web', 'app-dashboard', 'src', 'hooks')
    await mkdir(appDir, { recursive: true })
    const filePath = await createFile(appDir, 'useAnnouncer.ts', 'export function useAnnouncer() {}')

    const result = await run(makeState([filePath]))
    const hookFindings = result.findings.filter(f => f.title.includes('useAnnouncer'))
    expect(hookFindings.length).toBeGreaterThan(0)
    expect(hookFindings[0].severity).toBe('medium')
  })

  it('detects useRovingTabIndex in apps/web/ path', async () => {
    const appDir = join(testDir, 'apps', 'web', 'main-app', 'src', 'hooks')
    await mkdir(appDir, { recursive: true })
    const filePath = await createFile(appDir, 'useRovingTabIndex.tsx', 'export function useRovingTabIndex() {}')

    const result = await run(makeState([filePath]))
    const hookFindings = result.findings.filter(f => f.title.includes('useRovingTabIndex'))
    expect(hookFindings.length).toBeGreaterThan(0)
  })

  it('files outside apps/web/ are ignored in cross-app check', async () => {
    const pkgDir = join(testDir, 'packages', 'core', 'src')
    await mkdir(pkgDir, { recursive: true })
    const filePath = await createFile(pkgDir, 'useLocalStorage.ts', 'export function useLocalStorage() {}')

    const result = await run(makeState([filePath]))
    // No cross-app findings for packages/ path
    const crossAppFindings = result.findings.filter(f => f.severity === 'high')
    expect(crossAppFindings.length).toBe(0)
  })

  it('test files in apps/web/ are excluded from cross-app check', async () => {
    const app1Dir = join(testDir, 'apps', 'web', 'main-app', 'src', '__tests__')
    const app2Dir = join(testDir, 'apps', 'web', 'app-dashboard', 'src', '__tests__')
    await mkdir(app1Dir, { recursive: true })
    await mkdir(app2Dir, { recursive: true })

    const file1 = await createFile(app1Dir, 'Component.test.ts', 'test("a", () => {})')
    const file2 = await createFile(app2Dir, 'Component.test.ts', 'test("b", () => {})')

    const result = await run(makeState([file1, file2]))
    const testDupFindings = result.findings.filter(f =>
      f.title.includes('Component.test') && f.severity === 'high'
    )
    expect(testDupFindings.length).toBe(0)
  })

  it('empty file (0 bytes) → total_findings: 0, LensResultSchema valid', async () => {
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
    expect(result.lens).toBe('duplication')
    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('by_severity counts match findings array', async () => {
    const app1Dir = join(testDir, 'apps', 'web', 'main-app', 'src', 'hooks')
    const app2Dir = join(testDir, 'apps', 'web', 'app-dashboard', 'src', 'hooks')
    await mkdir(app1Dir, { recursive: true })
    await mkdir(app2Dir, { recursive: true })
    const file1 = await createFile(app1Dir, 'useLocalStorage.ts', 'export function useLocalStorage() {}')
    const file2 = await createFile(app2Dir, 'useLocalStorage.ts', 'export function useLocalStorage() {}')
    const result = await run(makeState([file1, file2]))
    const sumSeverity =
      result.by_severity.critical +
      result.by_severity.high +
      result.by_severity.medium +
      result.by_severity.low
    expect(sumSeverity).toBe(result.total_findings)
  })
})
