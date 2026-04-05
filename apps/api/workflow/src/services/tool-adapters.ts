/**
 * Tool Adapters
 *
 * Provides tool adapter implementations for LangGraph workflow nodes.
 * These adapters implement the file I/O and test execution tools that
 * the implementation_executor node uses.
 *
 * SECURITY: All file operations are sandboxed to the monorepo root.
 * Path traversal attempts are blocked.
 *
 * @module services/tool-adapters
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve, dirname, relative, isAbsolute } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from '@repo/logger'
import type {
  ReadFileFn,
  WriteFileFn,
  SearchCodebaseFn,
  RunTestsFn,
} from '../nodes/dev-implement-v2/implementation-executor.js'
import type { DiffReaderFn } from '../nodes/review-v2/diff-analyzer.js'

const execAsync = promisify(exec)

// ============================================================================
// Configuration
// ============================================================================

/**
 * Root directory for all file operations.
 * Read lazily so callers can set MONOREPO_ROOT after module load (e.g. in scripts).
 */
function getMonorepoRoot(): string {
  return process.env.MONOREPO_ROOT ?? '/Users/michaelmenard/Development/monorepo'
}

/**
 * Maximum file size to read (10MB).
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Test execution timeout (5 minutes).
 */
const TEST_TIMEOUT_MS = 5 * 60 * 1000

// ============================================================================
// Path Security
// ============================================================================

/**
 * Resolves a path to an absolute path within the monorepo.
 * Blocks path traversal attempts.
 *
 * @param inputPath - Path to resolve (relative or absolute)
 * @returns Resolved absolute path
 * @throws Error if path escapes monorepo root
 */
export function resolveSafePath(inputPath: string): string {
  // Handle absolute paths
  let resolvedPath: string
  if (isAbsolute(inputPath)) {
    resolvedPath = inputPath
  } else {
    resolvedPath = resolve(getMonorepoRoot(), inputPath)
  }

  // Normalize and check for traversal
  const normalizedPath = resolve(resolvedPath)
  const relativePath = relative(getMonorepoRoot(), normalizedPath)

  // Check for path traversal (starts with .. or is absolute)
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error(`Path traversal blocked: ${inputPath} resolves outside monorepo`)
  }

  return normalizedPath
}

// ============================================================================
// Read File Adapter
// ============================================================================

/**
 * Creates a read file adapter.
 * Reads file contents with size limits and path security.
 */
export function createReadFileAdapter(): ReadFileFn {
  return async (path: string): Promise<string> => {
    const startTime = Date.now()

    try {
      const safePath = resolveSafePath(path)

      // Check if file exists
      if (!existsSync(safePath)) {
        logger.warn('tool-adapters: file not found', { path: safePath })
        // Help the model recover by listing nearby files
        const dir = dirname(safePath)
        let hint = ''
        if (existsSync(dir)) {
          try {
            const { stdout } = await execAsync(`ls -1 "${dir}" 2>/dev/null | head -20`, {
              timeout: 5000,
            })
            if (stdout.trim()) {
              hint = `\nFiles in ${relative(getMonorepoRoot(), dir)}/:\n${stdout.trim()}`
            }
          } catch {
            // ignore
          }
        } else {
          // Directory doesn't exist — suggest searching
          hint = `\nDirectory does not exist. Try search_codebase to find the correct path.`
        }
        return `ERROR: File not found: ${path}${hint}\nHINT: Use search_codebase to find the correct path, or list_directory to explore.`
      }

      // Read file with encoding
      const content = await readFile(safePath, 'utf-8')

      // Check size limit
      if (content.length > MAX_FILE_SIZE) {
        logger.warn('tool-adapters: file too large', {
          path: safePath,
          size: content.length,
          maxSize: MAX_FILE_SIZE,
        })
        return `ERROR: File too large (${content.length} bytes, max ${MAX_FILE_SIZE})`
      }

      const durationMs = Date.now() - startTime
      logger.debug('tool-adapters: read file', {
        path: safePath,
        size: content.length,
        durationMs,
      })

      return content
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      logger.error('tool-adapters: read file failed', { path, error: errorMessage })
      return `ERROR: ${errorMessage}`
    }
  }
}

// ============================================================================
// Write File Adapter
// ============================================================================

/**
 * Creates a write file adapter.
 * Writes file contents with path security and directory creation.
 */
export function createWriteFileAdapter(): WriteFileFn {
  return async (path: string, content: string): Promise<void> => {
    const startTime = Date.now()

    try {
      const safePath = resolveSafePath(path)
      const dir = dirname(safePath)

      // Create directory if needed
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true })
        logger.debug('tool-adapters: created directory', { dir })
      }

      // Write file
      await writeFile(safePath, content, 'utf-8')

      const durationMs = Date.now() - startTime
      logger.info('tool-adapters: wrote file', {
        path: safePath,
        size: content.length,
        durationMs,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      logger.error('tool-adapters: write file failed', { path, error: errorMessage })
      throw new Error(`Failed to write file: ${errorMessage}`)
    }
  }
}

// ============================================================================
// Search Codebase Adapter
// ============================================================================

/**
 * Creates a codebase search adapter.
 * Uses ripgrep (rg) for fast codebase searching.
 */
export function createSearchCodebaseAdapter(): SearchCodebaseFn {
  return async (pattern: string): Promise<string> => {
    const startTime = Date.now()

    try {
      // Use ripgrep for fast searching
      // Limit results to prevent overwhelming output
      const cmd = `rg --color=never --max-count=50 --heading --line-number "${pattern.replace(/"/g, '\\"')}" "${getMonorepoRoot()}" 2>/dev/null || true`

      const { stdout, stderr } = await execAsync(cmd, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      })

      const durationMs = Date.now() - startTime

      if (stderr && !stdout) {
        logger.warn('tool-adapters: search returned stderr only', { pattern, stderr })
      }

      const result = stdout || ''

      logger.debug('tool-adapters: search completed', {
        pattern,
        resultLength: result.length,
        durationMs,
      })

      if (!result.trim()) {
        // Help the model by listing top-level directories
        const root = getMonorepoRoot()
        let dirHint = ''
        try {
          const { stdout: dirs } = await execAsync(
            `ls -1d "${root}"/apps/*/ "${root}"/packages/*/ 2>/dev/null | sed 's|${root}/||g'`,
            { timeout: 5000 },
          )
          if (dirs.trim()) {
            dirHint = `\nAvailable app/package directories:\n${dirs.trim()}`
          }
        } catch {
          // ignore
        }
        return `No matches found for pattern: "${pattern}".${dirHint}\nHINT: Try a broader pattern, a different search term, or use list_directory to explore the codebase structure.`
      }

      // Truncate if too long
      if (result.length > 50000) {
        return result.slice(0, 50000) + '\n... (truncated)'
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      logger.error('tool-adapters: search failed', { pattern, error: errorMessage })
      return `ERROR: Search failed: ${errorMessage}`
    }
  }
}

// ============================================================================
// List Directory Adapter
// ============================================================================

export type ListDirectoryFn = (path: string) => Promise<string>

/**
 * Creates a list directory adapter.
 * Lists directory contents with type indicators — helps the model navigate the codebase.
 */
export function createListDirectoryAdapter(): ListDirectoryFn {
  return async (dirPath: string): Promise<string> => {
    try {
      const safePath = resolveSafePath(dirPath || '.')

      if (!existsSync(safePath)) {
        return `ERROR: Directory not found: ${dirPath}\nHINT: Use search_codebase to find the correct path.`
      }

      const { stdout } = await execAsync(`ls -1F "${safePath}" 2>/dev/null | head -50`, {
        timeout: 5000,
      })

      if (!stdout.trim()) {
        return `Directory is empty: ${dirPath}`
      }

      const relPath = relative(getMonorepoRoot(), safePath) || '.'
      return `Contents of ${relPath}/:\n${stdout.trim()}`
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      return `ERROR: ${errorMessage}`
    }
  }
}

// ============================================================================
// Run Tests Adapter
// ============================================================================

/**
 * Test result from vitest.
 */
export type TestResult = {
  passed: boolean
  output: string
  failures: string[]
}

/**
 * Creates a test execution adapter.
 * Runs vitest with the given filter pattern.
 */
export function createRunTestsAdapter(): RunTestsFn {
  return async (filter: string): Promise<TestResult> => {
    const startTime = Date.now()

    try {
      // Build vitest command
      // Use --reporter=verbose for detailed output
      // --run to not watch
      // Pass filter as positional arg (file path or pattern), not --filter (which is for workspace filtering)
      const filterArg = filter ? `"${filter.replace(/"/g, '\\"')}"` : ''
      const cmd = `cd "${getMonorepoRoot()}" && pnpm vitest run ${filterArg} --reporter=verbose 2>&1`

      logger.info('tool-adapters: running tests', { filter, cmd })

      const { stdout } = await execAsync(cmd, {
        timeout: TEST_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          CI: 'true', // Ensure non-interactive mode
        },
      })

      const durationMs = Date.now() - startTime

      // Parse test output
      const passed = stdout.includes('✓') && !stdout.includes('FAIL')
      const failures = extractTestFailures(stdout)

      logger.info('tool-adapters: tests completed', {
        filter,
        passed,
        failureCount: failures.length,
        durationMs,
      })

      return {
        passed,
        output: stdout.slice(0, 100000), // Limit output size
        failures,
      }
    } catch (err) {
      const durationMs = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : String(err)

      // exec throws on non-zero exit code, which includes test failures
      const stdout = (err as any)?.stdout ?? ''
      const stderr = (err as any)?.stderr ?? ''
      const output = stdout || stderr || errorMessage

      logger.warn('tool-adapters: tests failed or errored', {
        filter,
        durationMs,
        error: errorMessage,
        hasStderr: !!stderr,
      })

      const failures = extractTestFailures(output)

      // Include stderr separately so the model can see build errors vs test failures
      const fullOutput =
        stderr && stdout ? `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}` : String(output)

      return {
        passed: false,
        output: fullOutput.slice(0, 100000),
        failures: failures.length > 0 ? failures : [errorMessage],
      }
    }
  }
}

/**
 * Extracts failure messages from vitest output.
 */
function extractTestFailures(output: string): string[] {
  const failures: string[] = []

  // Look for FAIL lines
  const failPattern = /FAIL\s+(.+)/g
  let match
  while ((match = failPattern.exec(output)) !== null) {
    failures.push(match[1].trim())
  }

  // Look for AssertionError lines
  const assertPattern = /AssertionError:(.+)/g
  while ((match = assertPattern.exec(output)) !== null) {
    failures.push(`AssertionError: ${match[1].trim()}`)
  }

  // Look for Error: lines
  const errorPattern = /Error:\s*(.+)/g
  while ((match = errorPattern.exec(output)) !== null) {
    const errorMsg = match[1].trim()
    if (errorMsg && !failures.some(f => f.includes(errorMsg))) {
      failures.push(errorMsg)
    }
  }

  return failures.slice(0, 20) // Limit to 20 failures
}

// ============================================================================
// Diff Reader Adapter
// ============================================================================

/**
 * Creates a diff reader adapter for the review-v2 graph.
 *
 * Runs `git diff` between the worktree branch and its merge base with main
 * to produce the list of files changed in this story's implementation.
 *
 * Falls back to `git status --short` if the diff command fails (e.g. new
 * worktrees with no upstream configured).
 */
export function createDiffReaderAdapter(): DiffReaderFn {
  return async worktreePath => {
    const startTime = Date.now()

    try {
      // Prefer diff against merge-base with main so we only see story changes
      const { stdout: diffStat } = await execAsync(
        `git -C "${worktreePath}" diff --stat $(git -C "${worktreePath}" merge-base HEAD origin/main 2>/dev/null || echo HEAD~1) HEAD 2>/dev/null`,
        { timeout: 30_000 },
      ).catch(() => ({ stdout: '' }))

      // Also get the actual diff content (first 2000 lines total)
      const { stdout: diffContent } = await execAsync(
        `git -C "${worktreePath}" diff $(git -C "${worktreePath}" merge-base HEAD origin/main 2>/dev/null || echo HEAD~1) HEAD -- 2>/dev/null | head -2000`,
        { timeout: 30_000 },
      ).catch(() => ({ stdout: '' }))

      if (diffStat.trim()) {
        const files = parseDiffStat(diffStat, diffContent)
        const durationMs = Date.now() - startTime
        logger.info('tool-adapters: diff reader complete (merge-base)', {
          worktreePath,
          fileCount: files.length,
          durationMs,
        })
        return files
      }

      // Fallback: untracked + modified files via git status
      const { stdout: statusOut } = await execAsync(
        `git -C "${worktreePath}" status --short 2>/dev/null`,
        { timeout: 10_000 },
      ).catch(() => ({ stdout: '' }))

      const files = parseGitStatus(statusOut)
      const durationMs = Date.now() - startTime
      logger.info('tool-adapters: diff reader complete (git status fallback)', {
        worktreePath,
        fileCount: files.length,
        durationMs,
      })
      return files
    } catch (err) {
      logger.warn('tool-adapters: diff reader failed', {
        worktreePath,
        error: err instanceof Error ? err.message : String(err),
      })
      return []
    }
  }
}

/**
 * Parses `git diff --stat` output into DiffReaderFn result entries.
 * Uses the full diff content to count actual lines added/removed per file.
 */
function parseDiffStat(
  statOutput: string,
  diffContent: string,
): Array<{
  path: string
  changeType: 'created' | 'modified' | 'deleted'
  linesAdded: number
  linesRemoved: number
  content?: string
}> {
  const results: Array<{
    path: string
    changeType: 'created' | 'modified' | 'deleted'
    linesAdded: number
    linesRemoved: number
    content?: string
  }> = []

  // Split diff content into per-file sections
  const fileSections = new Map<string, string>()
  const fileSectionRegex = /^diff --git a\/.+ b\/(.+)$/gm
  let match: RegExpExecArray | null
  const sectionStarts: Array<{ path: string; index: number }> = []

  while ((match = fileSectionRegex.exec(diffContent)) !== null) {
    sectionStarts.push({ path: match[1], index: match.index })
  }
  for (let i = 0; i < sectionStarts.length; i++) {
    const start = sectionStarts[i]!
    const end = sectionStarts[i + 1]?.index ?? diffContent.length
    fileSections.set(start.path, diffContent.slice(start.index, end))
  }

  // Parse stat lines: " path/to/file | 42 ++++----"
  const statLineRegex = /^\s*(.+?)\s+\|\s+(\d+)\s*([\+\-]*)/gm
  while ((match = statLineRegex.exec(statOutput)) !== null) {
    const path = match[1].trim()
    if (path === '' || path.includes('changed') || path.includes('insertion')) continue

    const section = fileSections.get(path) ?? ''

    // Count actual +/- lines in the diff section
    const lines = section.split('\n')
    const linesAdded = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length
    const linesRemoved = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length

    // Determine change type from diff header
    let changeType: 'created' | 'modified' | 'deleted' = 'modified'
    if (section.includes('new file mode')) changeType = 'created'
    else if (section.includes('deleted file mode')) changeType = 'deleted'

    // Include first 2000 chars of file diff as content hint
    const content = section.slice(0, 2000)

    results.push({ path, changeType, linesAdded, linesRemoved, content })
  }

  return results
}

/**
 * Parses `git status --short` output into DiffReaderFn result entries.
 * Used as a fallback when no merge-base diff is available.
 */
function parseGitStatus(statusOutput: string): Array<{
  path: string
  changeType: 'created' | 'modified' | 'deleted'
  linesAdded: number
  linesRemoved: number
}> {
  return statusOutput
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const code = line.slice(0, 2).trim()
      const path = line.slice(3).trim()
      let changeType: 'created' | 'modified' | 'deleted' = 'modified'
      if (code === '??' || code === 'A') changeType = 'created'
      else if (code === 'D') changeType = 'deleted'
      return { path, changeType, linesAdded: 0, linesRemoved: 0 }
    })
    .filter(f => !f.path.endsWith('/')) // exclude bare directory entries
}

// ============================================================================
// Composite Adapter Config
// ============================================================================

/**
 * Returns a complete set of tool adapters for the executor node.
 */
export function createToolAdapters() {
  return {
    readFile: createReadFileAdapter(),
    writeFile: createWriteFileAdapter(),
    searchCodebase: createSearchCodebaseAdapter(),
    listDirectory: createListDirectoryAdapter(),
    runTests: createRunTestsAdapter(),
    diffReader: createDiffReaderAdapter(),
  }
}

export type ToolAdapters = ReturnType<typeof createToolAdapters>
