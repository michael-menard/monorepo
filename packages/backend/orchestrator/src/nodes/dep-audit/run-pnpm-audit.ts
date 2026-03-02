/**
 * Run Pnpm Audit
 *
 * Shells out to `pnpm audit --json` and parses the output via a typed Zod schema
 * with .passthrough() to survive pnpm major version upgrades.
 *
 * Story: APIP-4030 - Dependency Auditor
 *
 * Design:
 * - Injectable toolRunner for full testability without spawning child processes
 * - PnpmAuditOutputSchema uses .passthrough() on unknown fields
 * - Handles parse failures gracefully (logger.warn + empty array)
 * - Never throws — caller receives empty findings on any error
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Schemas
// ============================================================================

/**
 * A single vulnerability advisory from pnpm audit --json.
 * Uses .passthrough() to survive schema additions in future pnpm versions.
 */
export const PnpmAdvisorySchema = z
  .object({
    severity: z.string(),
    title: z.string().optional(),
    url: z.string().optional(),
    cves: z.array(z.string()).optional(),
    fixAvailable: z.union([z.boolean(), z.object({}).passthrough()]).optional(),
    // via is an array describing the dependency chain
    via: z
      .array(z.union([z.string(), z.object({}).passthrough()]))
      .optional(),
  })
  .passthrough()

export type PnpmAdvisory = z.infer<typeof PnpmAdvisorySchema>

/**
 * The vulnerabilities map from pnpm audit output.
 * Key: package name, value: advisory details.
 */
export const PnpmVulnerabilitiesSchema = z.record(z.string(), PnpmAdvisorySchema)

/**
 * Top-level pnpm audit --json output schema.
 * Uses .passthrough() so unknown top-level keys don't cause parse failures.
 */
export const PnpmAuditOutputSchema = z
  .object({
    auditReportVersion: z.number().optional(),
    vulnerabilities: PnpmVulnerabilitiesSchema.optional(),
    metadata: z
      .object({
        vulnerabilities: z
          .object({
            info: z.number().optional(),
            low: z.number().optional(),
            moderate: z.number().optional(),
            high: z.number().optional(),
            critical: z.number().optional(),
            total: z.number().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

export type PnpmAuditOutput = z.infer<typeof PnpmAuditOutputSchema>

/**
 * A normalized vulnerability finding extracted from pnpm audit output.
 */
export const VulnerabilityFindingSchema = z.object({
  package: z.string(),
  severity: z.string(),
  cve: z.string().nullable(),
  title: z.string().nullable(),
  url: z.string().nullable(),
  fixAvailable: z.boolean(),
})

export type VulnerabilityFinding = z.infer<typeof VulnerabilityFindingSchema>

// ============================================================================
// Tool Runner Type
// ============================================================================

/**
 * Injectable tool runner for spawning CLI commands.
 * Returns stdout as a string.
 */
export type ToolRunner = (command: string, args: string[], cwd: string) => Promise<string>

// ============================================================================
// Default Tool Runner
// ============================================================================

/**
 * Default tool runner using child_process.spawn.
 */
async function defaultToolRunner(command: string, args: string[], cwd: string): Promise<string> {
  const { spawn } = await import('child_process')

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const proc = spawn(command, args, { cwd, shell: false })

    proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
    proc.stderr.on('data', () => {
      // pnpm audit writes audit advisory details to stdout, status info to stderr
      // We discard stderr
    })

    proc.on('close', _code => {
      // pnpm audit exits with non-zero if vulnerabilities are found — that's OK
      resolve(Buffer.concat(chunks).toString('utf-8'))
    })

    proc.on('error', err => reject(err))
  })
}

// ============================================================================
// Options Schema
// ============================================================================

export const RunPnpmAuditOptionsSchema = z.object({
  /** Injectable tool runner; defaults to child_process.spawn wrapper */
  toolRunner: z.function().optional(),
})

export type RunPnpmAuditOptions = z.infer<typeof RunPnpmAuditOptionsSchema>

// ============================================================================
// Implementation
// ============================================================================

/**
 * Extract the first CVE from a pnpm advisory's cves array.
 */
function extractCve(advisory: PnpmAdvisory): string | null {
  if (advisory.cves && advisory.cves.length > 0) {
    return advisory.cves[0] ?? null
  }
  return null
}

/**
 * Determine if fixAvailable is truthy (boolean true or an object with a name).
 */
function isFixAvailable(advisory: PnpmAdvisory): boolean {
  if (typeof advisory.fixAvailable === 'boolean') {
    return advisory.fixAvailable
  }
  if (typeof advisory.fixAvailable === 'object' && advisory.fixAvailable !== null) {
    return true
  }
  return false
}

/**
 * Run `pnpm audit --json` in the workspace root and return parsed vulnerability findings.
 *
 * @param workspaceRoot - Absolute path to the monorepo root
 * @param options - Injectable toolRunner for testing
 * @returns Array of VulnerabilityFinding; empty on any error
 *
 * @example
 * const findings = await runPnpmAudit('/path/to/monorepo')
 * // => [{ package: 'lodash', severity: 'high', cve: 'CVE-2021-12345', ... }]
 */
export async function runPnpmAudit(
  workspaceRoot: string,
  options: RunPnpmAuditOptions = {},
): Promise<VulnerabilityFinding[]> {
  const runner = (options.toolRunner as ToolRunner | undefined) ?? defaultToolRunner

  let rawOutput: string
  try {
    rawOutput = await runner('pnpm', ['audit', '--json'], workspaceRoot)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn('dep-audit.run-pnpm-audit: failed to run pnpm audit', { error: message })
    return []
  }

  if (!rawOutput || rawOutput.trim() === '') {
    logger.warn('dep-audit.run-pnpm-audit: pnpm audit returned empty output')
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawOutput)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn('dep-audit.run-pnpm-audit: failed to parse pnpm audit JSON output', {
      error: message,
      rawOutputPreview: rawOutput.slice(0, 200),
    })
    return []
  }

  const result = PnpmAuditOutputSchema.safeParse(parsed)
  if (!result.success) {
    logger.warn('dep-audit.run-pnpm-audit: pnpm audit output did not match expected schema', {
      error: result.error.message,
    })
    return []
  }

  const vulnerabilities = result.data.vulnerabilities ?? {}
  const findings: VulnerabilityFinding[] = []

  for (const [packageName, advisory] of Object.entries(vulnerabilities)) {
    findings.push(
      VulnerabilityFindingSchema.parse({
        package: packageName,
        severity: advisory.severity,
        cve: extractCve(advisory),
        title: advisory.title ?? null,
        url: advisory.url ?? null,
        fixAvailable: isFixAvailable(advisory),
      }),
    )
  }

  return findings
}
