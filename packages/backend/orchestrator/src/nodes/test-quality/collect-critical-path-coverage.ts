/**
 * Critical Path Coverage Collector
 *
 * Runs `pnpm test --coverage` scoped to configurable critical-path module
 * patterns and parses the resulting coverage JSON to extract line, branch,
 * and function coverage for matching modules.
 *
 * Uses a child_process.spawn approach so it can be wrapped with withTimeout.
 *
 * APIP-4040 AC-5
 */

import { spawn } from 'node:child_process'
import { readFile, access } from 'node:fs/promises'
import path from 'node:path'
import {
  CriticalPathCoverageResultSchema,
  type CriticalPathCoverageResult,
  type ModuleCoverage,
} from './schemas.js'

// ──────────────────────────────────────────────────────────────────────────────
// Types for the vitest JSON coverage output
// ──────────────────────────────────────────────────────────────────────────────

interface V8CoverageSummary {
  total: number
  covered: number
  pct: number
}

interface V8FileSummary {
  lines: V8CoverageSummary
  branches: V8CoverageSummary
  functions: V8CoverageSummary
  statements: V8CoverageSummary
}

interface V8CoverageReport {
  total?: V8FileSummary
  [filePath: string]: V8FileSummary | undefined
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Runs a command and returns stdout/stderr as a promise.
 */
function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: true })
    let stdout = ''
    let stderr = ''

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`Command timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    child.on('close', code => {
      clearTimeout(timer)
      resolve({ stdout, stderr, exitCode: code ?? 0 })
    })

    child.on('error', err => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

/**
 * Checks whether a file path (from coverage report) matches any of the
 * configured critical-path glob-like patterns.
 * We use simple substring matching for reliability without a glob library.
 */
function matchesAnyPattern(filePath: string, patterns: string[]): boolean {
  const normalized = filePath.replace(/\\/g, '/')
  return patterns.some(pattern => {
    // Convert glob pattern to a simple string match
    // Strip leading/trailing wildcards and check inclusion
    const stripped = pattern.replace(/^\*+/, '').replace(/\*+$/, '')
    return normalized.includes(stripped)
  })
}

/**
 * Parses a vitest v8 JSON coverage summary into ModuleCoverage entries.
 */
function parseCoverageReport(
  report: V8CoverageReport,
  patterns: string[],
): { modules: ModuleCoverage[]; totalLine: number; totalBranch: number; totalFn: number } {
  const modules: ModuleCoverage[] = []
  let linePctSum = 0
  let branchPctSum = 0
  let fnPctSum = 0

  for (const [filePath, summary] of Object.entries(report)) {
    if (filePath === 'total' || !summary) continue
    if (!matchesAnyPattern(filePath, patterns)) continue

    modules.push({
      pattern: filePath,
      lineCoverage: summary.lines.pct,
      branchCoverage: summary.branches.pct,
      functionCoverage: summary.functions.pct,
    })

    linePctSum += summary.lines.pct
    branchPctSum += summary.branches.pct
    fnPctSum += summary.functions.pct
  }

  const count = modules.length || 1
  return {
    modules,
    totalLine: linePctSum / count,
    totalBranch: branchPctSum / count,
    totalFn: fnPctSum / count,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Collects critical-path coverage by running vitest with --coverage.
 *
 * @param criticalPathPatterns - Glob-like patterns identifying critical modules
 * @param coverageFloor - Minimum line coverage (0–1) that counts as passing
 * @param scanRoot - Working directory for vitest (defaults to cwd)
 * @param timeoutMs - Max ms to wait for vitest (default: 5 min)
 * @returns CriticalPathCoverageResult
 */
export async function collectCriticalPathCoverage(
  criticalPathPatterns: string[] = [
    'packages/backend/orchestrator/src/graphs/',
    'packages/backend/orchestrator/src/nodes/',
    'packages/backend/orchestrator/src/runner/',
  ],
  coverageFloor: number = 0.8,
  scanRoot: string = '.',
  timeoutMs: number = 5 * 60 * 1000,
): Promise<CriticalPathCoverageResult> {
  const collectedAt = new Date().toISOString()
  const resolvedRoot = path.resolve(scanRoot)

  try {
    // Run vitest with JSON coverage reporter
    const { exitCode } = await runCommand(
      'pnpm',
      [
        'vitest',
        'run',
        '--coverage',
        '--coverage.reporter=json-summary',
        '--coverage.reportsDirectory=coverage',
      ],
      resolvedRoot,
      timeoutMs,
    )

    // Vitest may exit with non-zero if tests fail, but coverage may still be written
    // Attempt to read coverage regardless
    const coverageSummaryPath = path.join(resolvedRoot, 'coverage', 'coverage-summary.json')

    let coverageReport: V8CoverageReport
    try {
      await access(coverageSummaryPath)
      const raw = await readFile(coverageSummaryPath, 'utf-8')
      coverageReport = JSON.parse(raw) as V8CoverageReport
    } catch {
      // Coverage file not found — may mean no tests ran or vitest failed
      return CriticalPathCoverageResultSchema.parse({
        overallLineCoverage: 0,
        overallBranchCoverage: 0,
        overallFunctionCoverage: 0,
        meetsFloor: false,
        moduleCoverage: [],
        collectedAt,
        success: false,
        error: `Coverage file not found (vitest exit code: ${exitCode})`,
      })
    }

    const { modules, totalLine, totalBranch, totalFn } = parseCoverageReport(
      coverageReport,
      criticalPathPatterns,
    )

    const meetsFloor = totalLine / 100 >= coverageFloor

    return CriticalPathCoverageResultSchema.parse({
      overallLineCoverage: totalLine,
      overallBranchCoverage: totalBranch,
      overallFunctionCoverage: totalFn,
      meetsFloor,
      moduleCoverage: modules,
      collectedAt,
      success: true,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error during critical path coverage collection'

    return CriticalPathCoverageResultSchema.parse({
      overallLineCoverage: 0,
      overallBranchCoverage: 0,
      overallFunctionCoverage: 0,
      meetsFloor: false,
      moduleCoverage: [],
      collectedAt,
      success: false,
      error: errorMessage,
    })
  }
}
