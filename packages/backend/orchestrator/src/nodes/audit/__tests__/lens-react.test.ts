import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, writeFile, rm } from 'fs/promises'

import { run } from '../lens-react.js'
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

describe('lens-react', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `audit-react-${Date.now()}`)
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
    const filePath = await createFile(testDir, 'Clean.tsx', 'export function Clean() { return null }')
    const result = await run(makeState([filePath]))
    expect(() => LensResultSchema.parse(result)).not.toThrow()
    expect(result.lens).toBe('react')
  })

  it('detects addEventListener without removeEventListener', async () => {
    // Positive fixture: only addEventListener, no removeEventListener anywhere in file
    const filePath = await createFile(testDir, 'Listener.tsx', [
      'import { useEffect } from "react"',
      'export function Listener() {',
      '  useEffect(() => {',
      '    window.addEventListener("click", handler)',
      '  }, [])',
      '  return null',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('event listener'))).toBe(true)
    expect(result.findings.some(f => f.severity === 'high')).toBe(true)
  })

  it('addEventListener with removeEventListener suppresses finding (negPattern)', async () => {
    const filePath = await createFile(testDir, 'CleanListener.tsx', [
      'import { useEffect } from "react"',
      'export function CleanListener() {',
      '  useEffect(() => {',
      '    window.addEventListener("click", handler)',
      '    return () => window.removeEventListener("click", handler)',
      '  }, [])',
      '  return null',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    const listenerFindings = result.findings.filter(f => f.title.includes('event listener'))
    expect(listenerFindings.length).toBe(0)
  })

  it('detects document.getElementById direct DOM query', async () => {
    const filePath = await createFile(testDir, 'DomQuery.tsx', [
      'export function DomQuery() {',
      '  const el = document.getElementById("myDiv")',
      '  return null',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('DOM manipulation'))).toBe(true)
  })

  it('detects document.querySelector direct DOM query', async () => {
    const filePath = await createFile(testDir, 'DomQuerySel.tsx', [
      'export function DomQuerySel() {',
      '  const el = document.querySelector(".myClass")',
      '  return null',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('DOM query'))).toBe(true)
  })

  it('detects URL.createObjectURL without revokeObjectURL', async () => {
    // Positive fixture: only createObjectURL, no revokeObjectURL
    const filePath = await createFile(testDir, 'ObjectUrl.tsx', [
      'export function ObjectUrl() {',
      '  const url = URL.createObjectURL(blob)',
      '  return null',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBeGreaterThan(0)
    expect(result.findings.some(f => f.title.includes('revokeObjectURL'))).toBe(true)
  })

  it('URL.createObjectURL with revokeObjectURL suppresses finding', async () => {
    const filePath = await createFile(testDir, 'CleanObjectUrl.tsx', [
      'import { useEffect } from "react"',
      'export function CleanObjectUrl() {',
      '  useEffect(() => {',
      '    const url = URL.createObjectURL(blob)',
      '    return () => URL.revokeObjectURL(url)',
      '  }, [])',
      '  return null',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    const leakFindings = result.findings.filter(f => f.title.includes('revokeObjectURL'))
    expect(leakFindings.length).toBe(0)
  })

  it('.ts files (not .tsx) produce 0 findings', async () => {
    const filePath = await createFile(testDir, 'util.ts', [
      'window.addEventListener("click", handler)',
      'document.getElementById("x")',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
  })

  it('test files produce 0 findings', async () => {
    const filePath = await createFile(testDir, 'Component.test.tsx', [
      'window.addEventListener("click", handler)',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
  })

  it('empty file (0 bytes) → total_findings: 0', async () => {
    const filePath = await createFile(testDir, 'Empty.tsx', '')
    const result = await run(makeState([filePath]))
    expect(result.total_findings).toBe(0)
    expect(result.findings).toEqual([])
    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('non-existent path → empty findings, no throw', async () => {
    const nonExistent = join(testDir, 'DoesNotExist.tsx')
    const result = await run(makeState([nonExistent]))
    expect(result.total_findings).toBe(0)
    expect(result.findings).toEqual([])
    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('findings have lens === "react"', async () => {
    const filePath = await createFile(testDir, 'Bad.tsx', [
      'export function Bad() {',
      '  window.addEventListener("resize", handler)',
      '  return null',
      '}',
    ].join('\n'))
    const result = await run(makeState([filePath]))
    expect(result.findings.every(f => f.lens === 'react')).toBe(true)
  })

  it('empty state targetFiles → 0 findings', async () => {
    const result = await run(makeState([]))
    expect(result.total_findings).toBe(0)
    expect(result.lens).toBe('react')
    expect(() => LensResultSchema.parse(result)).not.toThrow()
  })

  it('by_severity counts match findings array', async () => {
    const filePath = await createFile(testDir, 'Multi.tsx', [
      'export function Multi() {',
      '  window.addEventListener("click", handler)',
      '  const el = document.getElementById("x")',
      '  const url = URL.createObjectURL(blob)',
      '  return null',
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
