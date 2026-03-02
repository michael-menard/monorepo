/**
 * Unit tests for runPnpmAudit()
 *
 * Story: APIP-4030 - Dependency Auditor
 * Covers: HP-4 (valid JSON), EC-2 (malformed JSON)
 */

import { describe, expect, it, vi, afterEach } from 'vitest'
import { runPnpmAudit, PnpmAuditOutputSchema } from '../run-pnpm-audit.js'
import { logger } from '@repo/logger'

vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}))

const VALID_PNPM_AUDIT_OUTPUT = {
  auditReportVersion: 2,
  vulnerabilities: {
    lodash: {
      severity: 'high',
      title: 'Prototype Pollution',
      url: 'https://github.com/advisories/GHSA-35jh-r3h4-6jhm',
      cves: ['CVE-2021-12345'],
      fixAvailable: true,
      via: ['lodash'],
    },
  },
  metadata: {
    vulnerabilities: { high: 1, total: 1 },
  },
}

describe('runPnpmAudit', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('HP-4: parses valid JSON output correctly', async () => {
    const mockRunner = vi.fn().mockResolvedValue(JSON.stringify(VALID_PNPM_AUDIT_OUTPUT))

    const findings = await runPnpmAudit('/workspace', { toolRunner: mockRunner as any })

    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      package: 'lodash',
      severity: 'high',
      cve: 'CVE-2021-12345',
      fixAvailable: true,
    })
    expect(mockRunner).toHaveBeenCalledWith('pnpm', ['audit', '--json'], '/workspace')
  })

  it('HP-4: PnpmAuditOutputSchema.parse succeeds on valid output', () => {
    expect(() => PnpmAuditOutputSchema.parse(VALID_PNPM_AUDIT_OUTPUT)).not.toThrow()
  })

  it('EC-2: returns empty array for malformed JSON with logger.warn', async () => {
    const malformedRunner = vi.fn().mockResolvedValue('not valid json at all {{{')

    const findings = await runPnpmAudit('/workspace', { toolRunner: malformedRunner as any })

    expect(findings).toEqual([])
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining('failed to parse pnpm audit JSON output'),
      expect.any(Object),
    )
  })

  it('EC-2: returns empty array for empty output with logger.warn', async () => {
    const emptyRunner = vi.fn().mockResolvedValue('')

    const findings = await runPnpmAudit('/workspace', { toolRunner: emptyRunner as any })

    expect(findings).toEqual([])
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining('pnpm audit returned empty output'),
    )
  })

  it('returns empty array when toolRunner throws', async () => {
    const failingRunner = vi.fn().mockRejectedValue(new Error('command not found'))

    const findings = await runPnpmAudit('/workspace', { toolRunner: failingRunner as any })

    expect(findings).toEqual([])
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining('failed to run pnpm audit'),
      expect.any(Object),
    )
  })

  it('returns empty array when output has no vulnerabilities key', async () => {
    const noVulnsRunner = vi.fn().mockResolvedValue(
      JSON.stringify({ auditReportVersion: 2, metadata: { vulnerabilities: { total: 0 } } }),
    )

    const findings = await runPnpmAudit('/workspace', { toolRunner: noVulnsRunner as any })

    expect(findings).toEqual([])
  })

  it('handles fixAvailable as object (pnpm v9 format)', async () => {
    const v9Output = {
      vulnerabilities: {
        express: {
          severity: 'critical',
          title: 'RCE',
          cves: ['CVE-2024-99999'],
          fixAvailable: { name: 'express', version: '5.0.0', isSemVerMajor: true },
        },
      },
    }
    const mockRunner = vi.fn().mockResolvedValue(JSON.stringify(v9Output))

    const findings = await runPnpmAudit('/workspace', { toolRunner: mockRunner as any })

    expect(findings[0]).toMatchObject({
      package: 'express',
      severity: 'critical',
      fixAvailable: true,
    })
  })
})
