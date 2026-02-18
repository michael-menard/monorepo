import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, writeFile, rm } from 'fs/promises'

import { run } from '../lens-performance.js'
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

describe('lens-performance', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `audit-perf-${Date.now()}`)
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
    expect(result.lens).toBe('performance')
  })

  // --- Backend patterns (apps/api/) ---

  it('detects readFileSync in backend (apps/api/) path', async () => {
    const apiDir = join(testDir, 'apps', 'api', 'src')
    await mkdir(apiDir, { recursive: true })
    const filePath = await createFile(apiDir, 'handler.ts', [
      'import { readFileSync } from "fs"',
      'export function handler() {',
      '  const data = readFileSync("/etc/config", "utf-8")',
      '  return data',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('Synchronous file I/O'))).toBe(true)
    expect(result.findings.some(f => f.severity === 'high')).toBe(true)
  })

  it('readFileSync does NOT fire for frontend (apps/web/) paths', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'util.ts', 'const data = readFileSync("config")')
    const result = await run(makeState([filePath]))
    const syncFindings = result.findings.filter(f => f.title.includes('Synchronous file I/O'))
    expect(syncFindings.length).toBe(0)
  })

  // --- Frontend patterns (apps/web/) ---

  it('detects full lodash import in frontend (apps/web/) path', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'Component.tsx', [
      "import _ from 'lodash'",
      'export function process(data: any[]) { return _.uniq(data) }',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('lodash'))).toBe(true)
  })

  it('lodash import does NOT fire for backend (apps/api/) paths', async () => {
    const apiDir = join(testDir, 'apps', 'api', 'src')
    await mkdir(apiDir, { recursive: true })
    const filePath = await createFile(apiDir, 'util.ts', "import _ from 'lodash'")
    const result = await run(makeState([filePath]))
    const lodashFindings = result.findings.filter(f => f.title.includes('lodash'))
    expect(lodashFindings.length).toBe(0)
  })

  it('detects moment.js import in frontend (apps/web/) path', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'date.tsx', "import * as moment from 'moment'")
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('moment'))).toBe(true)
  })

  it('detects console.log in frontend (apps/web/) path', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'Component.tsx', [
      'export function Component() {',
      '  console.log("render")',
      '  return null',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('Console statement'))).toBe(true)
    expect(result.findings.some(f => f.severity === 'medium')).toBe(true)
  })

  it('console.log does NOT fire for backend (apps/api/) paths', async () => {
    const apiDir = join(testDir, 'apps', 'api', 'src')
    await mkdir(apiDir, { recursive: true })
    const filePath = await createFile(apiDir, 'handler.ts', 'console.log("debug")')
    const result = await run(makeState([filePath]))
    const consoleFindings = result.findings.filter(f => f.title.includes('Console statement'))
    expect(consoleFindings.length).toBe(0)
  })

  it('non-categorized paths (no apps/api/ or apps/web/) produce 0 findings', async () => {
    const pkgDir = join(testDir, 'packages', 'core', 'src')
    await mkdir(pkgDir, { recursive: true })
    const filePath = await createFile(pkgDir, 'util.ts', [
      'const data = readFileSync("config")',
      "import _ from 'lodash'",
      'console.log("x")',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
  })

  it('test files produce 0 findings', async () => {
    const apiDir = join(testDir, 'apps', 'api', 'src')
    await mkdir(apiDir, { recursive: true })
    const filePath = await createFile(apiDir, 'handler.test.ts', 'const data = readFileSync("x")')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
  })

  it('empty file (0 bytes) → total_findings: 0', async () => {
    const apiDir = join(testDir, 'apps', 'api', 'src')
    await mkdir(apiDir, { recursive: true })
    const filePath = await createFile(apiDir, 'empty.ts', '')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
    expect(result.findings).toEqual([])
    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('non-existent path → empty findings, no throw', async () => {
    const nonExistent = join(testDir, 'apps', 'api', 'src', 'does-not-exist.ts')
    const result = await run(makeState([nonExistent]))
    expect(result.total_findings).toBe(0)
    expect(result.findings).toEqual([])
    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('findings have lens === "performance"', async () => {
    const apiDir = join(testDir, 'apps', 'api', 'src')
    await mkdir(apiDir, { recursive: true })
    const filePath = await createFile(apiDir, 'sync.ts', 'const x = readFileSync("file")')
    const result = await run(makeState([filePath]))
    if (result.findings.length > 0) {
      expect(result.findings.every(f => f.lens === 'performance')).toBe(true)
    }
  })
})
