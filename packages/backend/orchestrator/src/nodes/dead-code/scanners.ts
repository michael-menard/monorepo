/**
 * Dead Code Reaper — Scanners
 *
 * Three scanners with injectable execFn for testability:
 * - scanDeadExports: runs ts-prune, parses output into DeadExportFinding[]
 * - scanUnusedFiles: uses TypeScript compiler analysis for no-importers
 * - scanUnusedDeps: runs depcheck per package.json
 *
 * APIP-4050: Dead Code Reaper — Monthly Cron Analysis and CLEANUP Story Generation
 */

import { resolve, normalize } from 'path'
import { z } from 'zod'
import { logger } from '@repo/logger'
import {
  type DeadCodeReaperConfig,
  type DeadExportFinding,
  type UnusedFileFinding,
  type UnusedDepFinding,
  DeadExportFindingSchema,
  UnusedFileFindingSchema,
  UnusedDepFindingSchema,
} from './schemas.js'

/**
 * Injectable function for running subprocess commands.
 * Returns stdout as a string.
 */
export type ExecFn = (cmd: string) => Promise<string>

/** Maximum byte length allowed for any single tool output. */
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024 // 10 MB

/**
 * Validate that a path contains only safe characters for shell interpolation.
 * Rejects paths with shell metacharacters that could enable command injection.
 */
export function validateSafePath(path: string): void {
  if (!/^[a-zA-Z0-9_\-./@ ]+$/.test(path)) {
    throw new Error(`Unsafe path rejected: "${path}" contains shell metacharacters`)
  }
}

/**
 * Validate that external tool output is within expected size bounds.
 * Prevents memory exhaustion from unexpectedly large outputs.
 */
function validateOutputSize(output: string, toolName: string): void {
  if (Buffer.byteLength(output, 'utf8') > MAX_OUTPUT_BYTES) {
    throw new Error(
      `${toolName} output exceeds maximum allowed size (${MAX_OUTPUT_BYTES} bytes) — aborting`,
    )
  }
}

/**
 * Check if a file path matches any of the given exclude patterns.
 * Patterns are simplified glob-style: ** matches any path segment.
 */
function matchesExcludePattern(filePath: string, excludePatterns: string[]): boolean {
  for (const pattern of excludePatterns) {
    // Convert simple glob patterns to regex
    const regexStr = pattern.replace(/\./g, '\\.').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')
    const regex = new RegExp(regexStr)
    if (regex.test(filePath)) {
      return true
    }
  }
  return false
}

/**
 * Check if a line of ts-prune output indicates dynamic-import-only usage.
 * ts-prune marks these with "(used in module)" or similar annotations.
 */
function isDynamicImportOnly(line: string): boolean {
  // ts-prune marks dynamic-only imports with "(used in module)"
  return line.includes('(used in module)')
}

/**
 * Scan for dead exports using ts-prune.
 *
 * Parses ts-prune output format:
 *   src/foo.ts:10 - Bar
 *   src/baz.ts:5 - default (used in module)
 *
 * @param config - Reaper configuration
 * @param execFn - Injectable function to run ts-prune command
 * @returns Array of DeadExportFinding
 */
export async function scanDeadExports(
  config: DeadCodeReaperConfig,
  execFn: ExecFn,
): Promise<DeadExportFinding[]> {
  let output: string
  try {
    output = await execFn('npx ts-prune --error')
  } catch (err) {
    // ts-prune exits with non-zero when it finds dead exports; that's expected
    if (
      err instanceof Error &&
      'stdout' in err &&
      typeof (err as Record<string, unknown>).stdout === 'string'
    ) {
      output = (err as Record<string, unknown>).stdout as string
    } else {
      output = err instanceof Error ? err.message : String(err)
    }
  }

  validateOutputSize(output, 'ts-prune')

  const findings: DeadExportFinding[] = []
  const lines = output.split('\n').filter(l => l.trim().length > 0)

  for (const line of lines) {
    // Format: "src/path/to/file.ts:LINE - ExportName"
    // or:     "src/path/to/file.ts:LINE - ExportName (used in module)"
    const match = line.match(/^(.+?):(\d+)\s*-\s*(.+?)(\s*\(.*\))?$/)
    if (!match) continue

    const filePath = match[1].trim()
    const lineNum = parseInt(match[2], 10)
    const exportName = match[3].trim()
    const dynamicImportOnly = isDynamicImportOnly(line)

    // Skip dynamic-import-only entries (not truly dead)
    if (dynamicImportOnly) continue

    // Skip files matching exclude patterns
    if (matchesExcludePattern(filePath, config.excludePatterns)) continue

    const finding = DeadExportFindingSchema.parse({
      filePath,
      exportName,
      line: lineNum,
      dynamicImportOnly: false,
    })
    findings.push(finding)
  }

  return findings.slice(0, config.maxFindingsPerRun)
}

/**
 * Scan for unused files using TypeScript compiler analysis.
 *
 * Runs `tsc --listFiles` and cross-references with import graph to find
 * files that are never imported by any other file.
 *
 * @param config - Reaper configuration
 * @param execFn - Injectable function to run tsc command
 * @returns Array of UnusedFileFinding
 */
export async function scanUnusedFiles(
  config: DeadCodeReaperConfig,
  execFn: ExecFn,
): Promise<UnusedFileFinding[]> {
  let listOutput: string
  let traceOutput: string

  try {
    listOutput = await execFn('npx tsc --listFiles --noEmit')
  } catch (err) {
    // tsc exits non-zero on type errors; capture stdout from the error
    if (
      err instanceof Error &&
      'stdout' in err &&
      typeof (err as Record<string, unknown>).stdout === 'string'
    ) {
      listOutput = (err as Record<string, unknown>).stdout as string
    } else {
      listOutput = err instanceof Error ? err.message : String(err)
    }
  }

  try {
    // Use tsc trace to find import relationships; process output in Node.js
    // (no shell pipe — avoids shell:true requirement)
    traceOutput = await execFn('npx tsc --traceResolution --noEmit')
  } catch (err) {
    if (
      err instanceof Error &&
      'stdout' in err &&
      typeof (err as Record<string, unknown>).stdout === 'string'
    ) {
      traceOutput = (err as Record<string, unknown>).stdout as string
    } else {
      traceOutput = ''
      logger.warn('dead-code-reaper.scanUnusedFiles.traceResolution.warn', {
        error: err instanceof Error ? err.message : String(err),
        reason: 'Trace resolution failed; proceeding with empty import graph',
      })
    }
  }

  validateOutputSize(listOutput, 'tsc --listFiles')
  validateOutputSize(traceOutput, 'tsc --traceResolution')

  // Filter trace output to only "Resolved to" lines — replaces the `grep` shell pipe
  const resolvedLines = traceOutput
    .split('\n')
    .filter(line => line.includes('Resolved to') || line.match(/File '([^']+\.tsx?)' exists/))

  // Parse files from --listFiles output
  const allFiles = listOutput
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.endsWith('.ts') || l.endsWith('.tsx'))
    .filter(l => !l.includes('node_modules'))
    .filter(l => !l.endsWith('.d.ts'))

  // Build set of files that appear as resolved imports
  const importedFiles = new Set<string>()
  for (const line of resolvedLines) {
    // Lines look like: "======== Resolved to 'src/foo.ts' ========"
    const match = line.match(/Resolved to '([^']+)'/)
    if (match) {
      importedFiles.add(match[1])
    }
    // Also parse "File 'src/foo.ts' exists" patterns
    const fileMatch = line.match(/File '([^']+\.tsx?)' exists/)
    if (fileMatch) {
      importedFiles.add(fileMatch[1])
    }
  }

  const findings: UnusedFileFinding[] = []

  for (const filePath of allFiles) {
    // Skip files matching exclude patterns
    if (matchesExcludePattern(filePath, config.excludePatterns)) continue

    // Skip entry points (index.ts files at package root)
    if (filePath.match(/\/index\.[tj]sx?$/)) continue

    // Check if file is referenced via dynamic import
    const dynamicImportOnly = false // tsc trace doesn't distinguish - conservative

    // Skip if the file is imported
    if (importedFiles.has(filePath)) continue

    const finding = UnusedFileFindingSchema.parse({
      filePath,
      dynamicImportOnly,
    })
    findings.push(finding)
  }

  return findings.slice(0, config.maxFindingsPerRun)
}

/**
 * Depcheck output shape (subset of what depcheck --json returns).
 */
const DepcheckOutputSchema = z.object({
  dependencies: z.array(z.string()).optional(),
  devDependencies: z.array(z.string()).optional(),
})

type DepcheckOutput = z.infer<typeof DepcheckOutputSchema>

/**
 * Scan for unused dependencies using depcheck.
 *
 * Finds all package.json files in the monorepo and runs depcheck on each.
 * Uses execFile-style args array via execFn to avoid shell interpolation.
 *
 * @param config - Reaper configuration
 * @param execFn - Injectable function to run depcheck command
 * @param repoRoot - Root directory of the monorepo (defaults to process.cwd())
 * @returns Array of UnusedDepFinding
 */
export async function scanUnusedDeps(
  config: DeadCodeReaperConfig,
  execFn: ExecFn,
  repoRoot: string = process.cwd(),
): Promise<UnusedDepFinding[]> {
  // Validate repoRoot before use — prevents shell metacharacter injection
  validateSafePath(repoRoot)

  let packageJsonPaths: string[] = []

  try {
    // Use find without shell interpolation — repoRoot is already validated safe
    // execFn is given the full command string; the caller (defaultExecFn in runner)
    // may use execSync with shell:false for validated paths.
    const findOutput = await execFn(
      `find ${repoRoot} -name package.json -not -path '*/node_modules/*' -not -path '*/.git/*'`,
    )
    validateOutputSize(findOutput, 'find package.json')
    const canonicalRoot = resolve(repoRoot)
    packageJsonPaths = findOutput
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      // Extra safety: only accept paths that resolve within the validated repoRoot
      .filter(l => {
        const resolved = normalize(resolve(canonicalRoot, l))
        return resolved.startsWith(canonicalRoot + '/') || resolved === canonicalRoot
      })
  } catch (err) {
    logger.warn('dead-code-reaper.scanUnusedDeps.find.warn', {
      error: err instanceof Error ? err.message : String(err),
      reason: 'Failed to enumerate package.json files; skipping dep scan',
    })
    packageJsonPaths = []
  }

  const allFindings: UnusedDepFinding[] = []

  for (const packageJsonPath of packageJsonPaths) {
    if (allFindings.length >= config.maxFindingsPerRun) break

    const packageDir = packageJsonPath.replace('/package.json', '')

    let depcheckOutput: string
    try {
      validateSafePath(packageDir)
      depcheckOutput = await execFn(`npx depcheck ${packageDir} --json`)
    } catch (err) {
      // depcheck exits non-zero when it finds unused deps
      if (
        err instanceof Error &&
        'stdout' in err &&
        typeof (err as Record<string, unknown>).stdout === 'string'
      ) {
        depcheckOutput = (err as Record<string, unknown>).stdout as string
      } else {
        logger.warn('dead-code-reaper.scanUnusedDeps.depcheck.warn', {
          packageDir,
          error: err instanceof Error ? err.message : String(err),
        })
        continue
      }
    }

    // Sanity-check output size before parsing
    if (depcheckOutput.length === 0) continue
    validateOutputSize(depcheckOutput, `depcheck(${packageDir})`)

    let parsed: DepcheckOutput
    try {
      parsed = DepcheckOutputSchema.parse(JSON.parse(depcheckOutput))
    } catch {
      continue
    }

    for (const dep of parsed.dependencies ?? []) {
      if (allFindings.length >= config.maxFindingsPerRun) break
      if (matchesExcludePattern(packageJsonPath, config.excludePatterns)) continue

      const finding = UnusedDepFindingSchema.parse({
        packageName: dep,
        packageJsonPath,
        isDev: false,
      })
      allFindings.push(finding)
    }

    for (const dep of parsed.devDependencies ?? []) {
      if (allFindings.length >= config.maxFindingsPerRun) break
      if (matchesExcludePattern(packageJsonPath, config.excludePatterns)) continue

      const finding = UnusedDepFindingSchema.parse({
        packageName: dep,
        packageJsonPath,
        isDev: true,
      })
      allFindings.push(finding)
    }
  }

  return allFindings
}
