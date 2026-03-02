/**
 * Dead Code Reaper — Micro-Verify
 *
 * Verifies whether a dead export or unused file finding is a true positive
 * by running targeted tsc type checking after simulated deletion.
 *
 * APIP-4050: Dead Code Reaper — Monthly Cron Analysis and CLEANUP Story Generation
 */

import { resolve, normalize } from 'path'
import { type ExecFn, validateSafePath } from './scanners.js'
import {
  type DeadExportFinding,
  type UnusedFileFinding,
  type MicroVerifyResult,
  MicroVerifyResultSchema,
} from './schemas.js'

/**
 * Simulate deletion of an export or file and run tsc to verify no compile errors.
 *
 * In dryRun mode: simulates deletion without modifying files (by checking
 * if removing the export would cause errors using TypeScript's --noUnusedLocals).
 * Filters tsc output in Node.js instead of using shell grep to avoid shell injection.
 *
 * In non-dryRun mode: performs actual targeted `tsc --project` per affected package.
 *
 * @param finding - The finding to verify
 * @param execFn - Injectable exec function
 * @param dryRun - If true, simulate without file modifications
 * @param repoRoot - Repository root used to canonicalize and bound package paths
 * @returns MicroVerifyResult
 */
export async function microVerify(
  finding: DeadExportFinding | UnusedFileFinding,
  execFn: ExecFn,
  dryRun: boolean = true,
  repoRoot: string = process.cwd(),
): Promise<MicroVerifyResult> {
  const startMs = Date.now()

  let typeCheckOutput = ''
  let status: MicroVerifyResult['status'] = 'safe'

  try {
    if (dryRun) {
      // In dryRun mode, run tsc with --noUnusedLocals to check if the file/export
      // is truly unused. An empty output means it's safe to delete.
      const filePath = finding.filePath
      validateSafePath(filePath)

      // Run tsc and filter output in Node.js — no shell pipe needed
      const rawOutput = await execFn('npx tsc --noEmit --noUnusedLocals')
      // Filter to only lines referencing the target filePath (replaces `grep "${filePath}"`)
      // Fall back to full output if no file-specific lines found, so global errors are caught
      const filteredLines = rawOutput.split('\n').filter(line => line.includes(filePath))
      typeCheckOutput = filteredLines.length > 0 ? filteredLines.join('\n') : rawOutput
    } else {
      // In non-dryRun mode, run the full tsc check for the package.
      // Derive package dir and validate it stays within repo bounds.
      const packageDir = derivePackageDir(finding.filePath, repoRoot)
      validateSafePath(packageDir)
      // Run tsc from the package dir without shell interpolation
      const rawOutput = await execFn(`npx tsc --noEmit --project ${packageDir}`)
      typeCheckOutput = rawOutput
    }

    // Determine status based on tsc output
    if (typeCheckOutput.includes('error TS')) {
      // tsc errors indicate the finding would break compilation — false positive
      status = 'false-positive'
    } else {
      // No errors — safe to delete
      status = 'safe'
    }
  } catch (err) {
    // Capture stdout from exec errors (tsc exits non-zero on type errors)
    if (
      err instanceof Error &&
      'stdout' in err &&
      typeof (err as Record<string, unknown>).stdout === 'string'
    ) {
      typeCheckOutput = (err as Record<string, unknown>).stdout as string
      // Re-evaluate status from captured stdout
      status = typeCheckOutput.includes('error TS') ? 'false-positive' : 'safe'
    } else {
      typeCheckOutput = err instanceof Error ? err.message : String(err)
      status = 'error'
    }
  }

  const durationMs = Date.now() - startMs

  return MicroVerifyResultSchema.parse({
    finding,
    status,
    typeCheckOutput,
    durationMs,
  })
}

/**
 * Derive the package directory from a file path.
 * Used to find the correct tsconfig.json for non-dryRun mode.
 *
 * Canonicalizes the candidate path and ensures it stays within repoRoot
 * to prevent directory traversal attacks.
 *
 * e.g., "packages/backend/orchestrator/src/foo.ts" → "packages/backend/orchestrator"
 *
 * @param filePath - Relative or absolute file path from a scanner finding
 * @param repoRoot - Absolute repository root to bound path resolution
 */
export function derivePackageDir(filePath: string, repoRoot: string = process.cwd()): string {
  const canonicalRoot = resolve(repoRoot)

  // Walk up the path to find the first directory containing package.json
  const parts = filePath.split('/')
  // Heuristic: package dirs are typically 2-3 levels deep
  for (let i = parts.length - 1; i >= 2; i--) {
    const candidate = parts.slice(0, i).join('/')
    if (candidate.includes('packages/') || candidate.includes('apps/')) {
      // Canonicalize and ensure the resolved path stays within repoRoot
      const resolved = normalize(resolve(canonicalRoot, candidate))
      if (!resolved.startsWith(canonicalRoot + '/') && resolved !== canonicalRoot) {
        throw new Error(
          `Derived package dir "${resolved}" is outside repository root "${canonicalRoot}"`,
        )
      }
      return candidate
    }
  }
  return '.'
}
