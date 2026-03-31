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

const execAsync = promisify(exec)

// ============================================================================
// Configuration
// ============================================================================

/**
 * Root directory for all file operations.
 * All paths are resolved relative to this and cannot escape it.
 */
const MONOREPO_ROOT = process.env.MONOREPO_ROOT ?? '/Users/michaelmenard/Development/monorepo'

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
    resolvedPath = resolve(MONOREPO_ROOT, inputPath)
  }

  // Normalize and check for traversal
  const normalizedPath = resolve(resolvedPath)
  const relativePath = relative(MONOREPO_ROOT, normalizedPath)

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
        return `ERROR: File not found: ${path}`
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
      const cmd = `rg --color=never --max-count=50 --heading --line-number "${pattern.replace(/"/g, '\\"')}" "${MONOREPO_ROOT}" 2>/dev/null || true`

      const { stdout, stderr } = await execAsync(cmd, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      })

      const durationMs = Date.now() - startTime

      if (stderr && !stdout) {
        logger.warn('tool-adapters: search returned stderr only', { pattern, stderr })
      }

      const result = stdout || 'No matches found.'

      logger.debug('tool-adapters: search completed', {
        pattern,
        resultLength: result.length,
        durationMs,
      })

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
      const filterArg = filter ? `--filter="${filter.replace(/"/g, '\\"')}"` : ''
      const cmd = `cd "${MONOREPO_ROOT}" && pnpm vitest run ${filterArg} --reporter=verbose 2>&1`

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
      const output = (err as any)?.stdout || (err as any)?.stderr || errorMessage

      logger.warn('tool-adapters: tests failed or errored', {
        filter,
        durationMs,
        error: errorMessage,
      })

      const failures = extractTestFailures(output)

      return {
        passed: false,
        output: String(output).slice(0, 100000),
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
    runTests: createRunTestsAdapter(),
  }
}

export type ToolAdapters = ReturnType<typeof createToolAdapters>
