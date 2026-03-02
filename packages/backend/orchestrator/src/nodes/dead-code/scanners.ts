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
    if (err instanceof Error && 'stdout' in err) {
      output = (err as { stdout: string }).stdout || ''
    } else {
      output = err instanceof Error ? err.message : String(err)
    }
  }

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
    listOutput = await execFn('npx tsc --listFiles --noEmit 2>&1 || true')
  } catch (err) {
    listOutput = err instanceof Error ? err.message : String(err)
  }

  try {
    // Use tsc trace to find import relationships
    traceOutput = await execFn(
      'npx tsc --traceResolution --noEmit 2>&1 | grep "Resolved to" | sort -u || true',
    )
  } catch (err) {
    traceOutput = err instanceof Error ? err.message : String(err)
  }

  // Parse files from --listFiles output
  const allFiles = listOutput
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.endsWith('.ts') || l.endsWith('.tsx'))
    .filter(l => !l.includes('node_modules'))
    .filter(l => !l.endsWith('.d.ts'))

  // Build set of files that appear as resolved imports
  const importedFiles = new Set<string>()
  for (const line of traceOutput.split('\n')) {
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
type DepcheckOutput = {
  dependencies?: string[]
  devDependencies?: string[]
}

/**
 * Scan for unused dependencies using depcheck.
 *
 * Finds all package.json files in the monorepo and runs depcheck on each.
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
  // Find all package.json files (excluding node_modules)
  let packageJsonPaths: string[] = []

  try {
    const findOutput = await execFn(
      `find ${repoRoot} -name "package.json" -not -path "*/node_modules/*" -not -path "*/.git/*"`,
    )
    packageJsonPaths = findOutput
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
  } catch (err) {
    packageJsonPaths = []
  }

  const allFindings: UnusedDepFinding[] = []

  for (const packageJsonPath of packageJsonPaths) {
    if (allFindings.length >= config.maxFindingsPerRun) break

    const packageDir = packageJsonPath.replace('/package.json', '')

    let depcheckOutput: string
    try {
      depcheckOutput = await execFn(`npx depcheck ${packageDir} --json`)
    } catch (err) {
      // depcheck exits non-zero when it finds unused deps
      if (err instanceof Error && 'stdout' in err) {
        depcheckOutput = (err as { stdout: string }).stdout || ''
      } else {
        continue
      }
    }

    let parsed: DepcheckOutput
    try {
      parsed = JSON.parse(depcheckOutput) as DepcheckOutput
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
