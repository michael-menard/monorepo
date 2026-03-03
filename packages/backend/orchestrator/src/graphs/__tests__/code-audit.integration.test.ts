import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, readdir, rm } from 'fs/promises'

import { runCodeAudit } from '../code-audit.js'
import { AuditFindingsSchema } from '../../artifacts/audit-findings.js'

describe('code-audit integration — pipeline mode', () => {
  let testDir: string
  let auditDir: string
  let plansDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `audit-integration-${Date.now()}`)
    auditDir = join(testDir, 'audit')
    plansDir = testDir
    await mkdir(auditDir, { recursive: true })
    // Create a minimal target directory with a src file
    await mkdir(join(testDir, 'src'), { recursive: true })
    const { writeFile } = await import('fs/promises')
    await writeFile(join(testDir, 'src/index.ts'), 'export const x = 1')
  })

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('pipeline mode E2E: runCodeAudit writes valid FINDINGS YAML to auditDir', async () => {
    const result = await runCodeAudit({
      mode: 'pipeline',
      scope: 'full',
      lenses: [],
      target: join(testDir, 'src'),
      auditDir,
      plansDir,
    })

    // Result should be valid AuditFindings
    expect(result).toBeDefined()
    expect(result?.schema).toBe(1)
    expect(result?.mode).toBe('pipeline')
    expect(() => AuditFindingsSchema.parse(result)).not.toThrow()

    // FINDINGS yaml should be written to auditDir
    const files = await readdir(auditDir)
    expect(files.some(f => f.startsWith('FINDINGS-') && f.endsWith('.yaml'))).toBe(true)
  })

  it('pipeline mode: returns AuditFindings with correct schema=1', async () => {
    const result = await runCodeAudit({
      mode: 'pipeline',
      scope: 'full',
      lenses: [],
      target: join(testDir, 'src'),
      auditDir,
      plansDir,
    })

    expect(result?.schema).toBe(1)
    expect(result?.mode).toBe('pipeline')
    expect(result?.scope).toBe('full')
  })

  it('accepts auditDir/plansDir in config and writes to temp dir (not plans/audit)', async () => {
    const customAuditDir = join(testDir, 'custom-audit')
    await mkdir(customAuditDir, { recursive: true })

    await runCodeAudit({
      mode: 'pipeline',
      scope: 'full',
      lenses: [],
      target: join(testDir, 'src'),
      auditDir: customAuditDir,
      plansDir,
    })

    // Should write to custom dir
    const files = await readdir(customAuditDir)
    expect(files.some(f => f.startsWith('FINDINGS-'))).toBe(true)
  })
})

describe('code-audit integration — roundtable mode', () => {
  let testDir: string
  let auditDir: string
  let plansDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `audit-roundtable-${Date.now()}`)
    auditDir = join(testDir, 'audit')
    plansDir = testDir
    await mkdir(auditDir, { recursive: true })
    await mkdir(join(testDir, 'src'), { recursive: true })
    const { writeFile } = await import('fs/promises')
    await writeFile(join(testDir, 'src/app.ts'), 'export const app = () => {}')
  })

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('roundtable mode E2E: runCodeAudit writes valid FINDINGS YAML to auditDir', async () => {
    const result = await runCodeAudit({
      mode: 'roundtable',
      scope: 'full',
      lenses: [],
      target: join(testDir, 'src'),
      auditDir,
      plansDir,
    })

    expect(result).toBeDefined()
    expect(result?.mode).toBe('roundtable')
    expect(() => AuditFindingsSchema.parse(result)).not.toThrow()

    const files = await readdir(auditDir)
    expect(files.some(f => f.startsWith('FINDINGS-') && f.endsWith('.yaml'))).toBe(true)
  })

  it('roundtable mode: returns AuditFindings with correct schema=1', async () => {
    const result = await runCodeAudit({
      mode: 'roundtable',
      scope: 'full',
      lenses: [],
      target: join(testDir, 'src'),
      auditDir,
      plansDir,
    })

    expect(result?.schema).toBe(1)
    expect(result?.mode).toBe('roundtable')
  })
})
