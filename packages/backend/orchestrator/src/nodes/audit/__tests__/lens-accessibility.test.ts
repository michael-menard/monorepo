import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, writeFile, rm } from 'fs/promises'

import { run } from '../lens-accessibility.js'
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

describe('lens-accessibility', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `audit-a11y-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })

  it('returns valid LensResultSchema output with lens === "a11y" (not "accessibility")', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'Clean.tsx', 'export function Clean() { return null }')
    const result = await run(makeState([filePath]))
    expect(() => LensResultSchema.parse(result)).not.toThrow()
    expect(result.lens).toBe('a11y')
    expect(result.lens).not.toBe('accessibility')
  })

  it('detects icon-only button missing aria-label', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'IconBtn.tsx', [
      'export function IconBtn() {',
      '  return <button><StarIcon /></button>',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('aria-label'))).toBe(true)
    expect(result.findings.some(f => f.severity === 'high')).toBe(true)
    // AC-14: all findings use lens === 'a11y'
    expect(result.findings.every(f => f.lens === 'a11y')).toBe(true)
  })

  it('icon button WITH aria-label suppresses finding', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'IconBtnGood.tsx', [
      'export function IconBtnGood() {',
      '  return <button aria-label="Star"><StarIcon /></button>',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.findings.filter(f => f.title.includes('aria-label')).length).toBe(0)
  })

  it('detects <img> missing alt attribute', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'Image.tsx', [
      'export function Image() {',
      '  return <img src="photo.jpg" />',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('alt'))).toBe(true)
  })

  it('detects <div onClick> without keyboard handler', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'DivClick.tsx', [
      'export function DivClick() {',
      '  return <div onClick={handleClick}>click me</div>',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('keyboard'))).toBe(true)
  })

  it('<div onClick> with onKeyDown suppresses finding', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'DivKeyboard.tsx', [
      'export function DivKeyboard() {',
      '  return <div onClick={handleClick} onKeyDown={handleKey} role="button">click me</div>',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    const keyboardFindings = result.findings.filter(f => f.title.includes('keyboard'))
    expect(keyboardFindings.length).toBe(0)
  })

  it('non-apps/web/ files produce 0 findings', async () => {
    const apiDir = join(testDir, 'apps', 'api', 'src')
    await mkdir(apiDir, { recursive: true })
    const filePath = await createFile(apiDir, 'Handler.tsx', [
      '  return <img src="photo.jpg" />',
      '  return <button><StarIcon /></button>',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
  })

  it('non-.tsx files (e.g. .ts) produce 0 findings', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'util.ts', '<img src="photo.jpg" />')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
  })

  it('empty file (0 bytes) → total_findings: 0', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'Empty.tsx', '')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
    expect(result.findings).toEqual([])
    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('non-existent path → empty findings, no throw', async () => {
    const nonExistent = join(testDir, 'apps', 'web', 'main-app', 'src', 'DoesNotExist.tsx')
    const result = await run(makeState([nonExistent]))
    expect(result.total_findings).toBe(0)
    expect(result.findings).toEqual([])
    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('all findings use finding.lens === "a11y" not "accessibility" (AC-14)', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'Multi.tsx', [
      'export function Multi() {',
      '  return <>',
      '    <img src="photo.jpg" />',
      '    <div onClick={handleClick}>click</div>',
      '  </>',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.findings.every(f => f.lens === 'a11y')).toBe(true)
    expect(result.findings.some(f => (f.lens as string) === 'accessibility')).toBe(false)
  })

  it('empty state targetFiles → 0 findings (AC-10)', async () => {
    const result = await run(makeState([]))
    expect(result.total_findings).toBe(0)
    expect(result.lens).toBe('a11y')
    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('by_severity counts match findings array', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'MultiIssues.tsx', [
      'export function MultiIssues() {',
      '  return <>',
      '    <img src="photo.jpg" />',
      '    <button><StarIcon /></button>',
      '    <div onClick={handleClick}>click</div>',
      '  </>',
      '}',
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
