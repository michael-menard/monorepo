import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, writeFile, rm } from 'fs/promises'

import { run } from '../lens-ui-ux.js'
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

describe('lens-ui-ux', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `audit-uiux-${Date.now()}`)
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
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'Clean.tsx', 'export function Clean() { return null }')
    const result = await run(makeState([filePath]))
    expect(() => LensResultSchema.parse(result)).not.toThrow()
    expect(result.lens).toBe('ui-ux')
  })

  it('detects inline styles — style={{}}', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'Inline.tsx', [
      'export function Inline() {',
      '  return <div style={{ color: "red" }}>hello</div>',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('Inline styles'))).toBe(true)
    expect(result.findings.some(f => f.severity === 'high')).toBe(true)
  })

  it('style={{calc(...)}} is exempt from inline style finding', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'CalcStyle.tsx', [
      'export function CalcStyle() {',
      '  return <div style={{ width: "calc(100% - 40px)" }}>hello</div>',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    const inlineFindings = result.findings.filter(f => f.title.includes('Inline styles'))
    expect(inlineFindings.length).toBe(0)
  })

  it('detects arbitrary hex color class', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'Color.tsx', [
      'export function Color() {',
      '  return <div className="text-[#ff0000]">hello</div>',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('Arbitrary color'))).toBe(true)
  })

  it('detects .css file import', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'WithCss.tsx', [
      "import './styles.css'",
      'export function WithCss() { return null }',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('CSS file'))).toBe(true)
  })

  it('detects CSS-in-JS usage (styled.)', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'Styled.tsx', [
      "import styled from 'styled-components'",
      'const Div = styled.div`color: red`',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('CSS-in-JS'))).toBe(true)
  })

  it('non-apps/web/ files produce 0 findings', async () => {
    const apiDir = join(testDir, 'apps', 'api', 'src')
    await mkdir(apiDir, { recursive: true })
    const filePath = await createFile(apiDir, 'Handler.tsx', [
      '  return <div style={{ color: "red" }}>hello</div>',
      "  import './styles.css'",
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
  })

  it('packages/ directory (non apps/web/) produces 0 findings', async () => {
    const pkgDir = join(testDir, 'packages', 'core', 'src')
    await mkdir(pkgDir, { recursive: true })
    const filePath = await createFile(pkgDir, 'Component.tsx', '<div style={{ color: "red" }} />')
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

  it('findings have lens === "ui-ux" (unconditional — uses known positive fixture)', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    // Use inline style — a known positive that will always produce a finding
    const filePath = await createFile(webDir, 'HasFinding.tsx', [
      'export function HasFinding() {',
      '  return <div style={{ color: "red" }}>x</div>',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.every(f => f.lens === 'ui-ux')).toBe(true)
  })

  it('empty state targetFiles → 0 findings', async () => {
    const result = await run(makeState([]))
    expect(result.total_findings).toBe(0)
    expect(result.lens).toBe('ui-ux')
    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('by_severity counts match findings array', async () => {
    const webDir = join(testDir, 'apps', 'web', 'main-app', 'src')
    await mkdir(webDir, { recursive: true })
    const filePath = await createFile(webDir, 'Multi.tsx', [
      'export function Multi() {',
      '  return <div style={{ color: "red" }} className="text-[#ff0000]">x</div>',
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
