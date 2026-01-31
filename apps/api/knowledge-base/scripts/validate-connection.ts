#!/usr/bin/env node
/**
 * MCP Connection Validator
 *
 * Validates all prerequisites for the Knowledge Base MCP server:
 * - Docker daemon running
 * - KB database container healthy
 * - MCP server built
 * - Environment variables set
 * - Database connectivity
 * - OpenAI API key validity
 * - End-to-end MCP server test
 *
 * @see KNOW-039 AC3-AC7, AC16-AC18, AC20, AC23
 */

import * as fs from 'fs'
import * as path from 'path'
import { spawn, execSync, type ChildProcess } from 'child_process'

// ANSI color codes
const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
}

// Quiet mode flag
let quietMode = false

/**
 * Print message (respects quiet mode for non-error messages)
 */
function log(message: string, color?: keyof typeof COLORS): void {
  if (quietMode && color !== 'red') return
  if (color && COLORS[color]) {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`)
  } else {
    console.log(message)
  }
}

/**
 * Check result interface
 */
interface CheckResult {
  name: string
  passed: boolean
  message: string
  suggestion?: string
}

/**
 * Print check result
 */
function printResult(result: CheckResult): void {
  const icon = result.passed ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`
  const status = result.passed ? '' : ` - ${result.message}`

  console.log(`${icon} ${result.name}${status}`)

  if (!result.passed && result.suggestion && !quietMode) {
    console.log(`  ${COLORS.gray}${result.suggestion}${COLORS.reset}`)
  }
}

/**
 * Resolve the monorepo root directory.
 */
function findMonorepoRoot(): string {
  let dir = __dirname
  const maxDepth = 10
  let depth = 0

  while (depth < maxDepth) {
    const workspaceFile = path.join(dir, 'pnpm-workspace.yaml')
    if (fs.existsSync(workspaceFile)) {
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
    depth++
  }

  return path.resolve(__dirname, '../../../../')
}

/**
 * Execute command and return output
 */
function exec(command: string, timeoutMs = 10000): { success: boolean; output: string } {
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      timeout: timeoutMs,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return { success: true, output: output.trim() }
  } catch (err) {
    const error = err as { stderr?: Buffer | string; message?: string }
    const stderr = error.stderr
      ? typeof error.stderr === 'string'
        ? error.stderr
        : error.stderr.toString()
      : ''
    return {
      success: false,
      output: stderr || error.message || 'Command failed',
    }
  }
}

/**
 * Check 1: Docker daemon running
 */
async function checkDockerRunning(): Promise<CheckResult> {
  const result = exec('docker info')

  if (result.success) {
    return {
      name: 'Docker daemon running',
      passed: true,
      message: '',
    }
  }

  return {
    name: 'Docker daemon running',
    passed: false,
    message: 'Docker is not running',
    suggestion: 'Start Docker Desktop and try again',
  }
}

/**
 * Detect Docker platform (AC20)
 */
function detectDockerPlatform(): string {
  const result = exec('docker version --format "{{.Server.Os}}/{{.Server.Arch}}"')
  if (!result.success) return 'unknown'

  // Check for specific platforms
  const colimaCheck = exec('colima status 2>&1')
  if (colimaCheck.success && colimaCheck.output.includes('Running')) {
    return 'Colima'
  }

  // Check for Docker Desktop
  const desktopCheck = exec('docker version --format "{{.Client.Context}}"')
  if (desktopCheck.success && desktopCheck.output.includes('desktop')) {
    return 'Docker Desktop'
  }

  return 'Docker Engine'
}

/**
 * Check 2: KB database container healthy
 */
async function checkDatabaseContainer(): Promise<CheckResult> {
  // First check if container exists
  const containerCheck = exec(
    'docker ps -a --filter "name=knowledge-base-postgres" --format "{{.Names}}"',
  )

  if (!containerCheck.success || !containerCheck.output.includes('knowledge-base-postgres')) {
    return {
      name: 'KB database container',
      passed: false,
      message: 'Container not found',
      suggestion: 'Run: cd apps/api/knowledge-base && docker-compose up -d',
    }
  }

  // Check if container is running and healthy
  const healthCheck = exec(
    'docker inspect --format="{{.State.Health.Status}}" knowledge-base-postgres 2>/dev/null || docker inspect --format="{{.State.Status}}" knowledge-base-postgres',
  )

  const status = healthCheck.output.toLowerCase()

  if (status === 'healthy' || status === 'running') {
    return {
      name: 'KB database container healthy',
      passed: true,
      message: '',
    }
  }

  return {
    name: 'KB database container healthy',
    passed: false,
    message: `Container status: ${status}`,
    suggestion: 'Run: docker-compose up -d && docker-compose ps',
  }
}

/**
 * Check 3: MCP server built
 */
async function checkMcpServerBuilt(monorepoRoot: string): Promise<CheckResult> {
  const distPath = path.join(monorepoRoot, 'apps/api/knowledge-base/dist/mcp-server/index.js')

  if (!fs.existsSync(distPath)) {
    return {
      name: 'MCP server built',
      passed: false,
      message: 'dist/mcp-server/index.js not found',
      suggestion: 'Run: cd apps/api/knowledge-base && pnpm build',
    }
  }

  return {
    name: 'MCP server built',
    passed: true,
    message: '',
  }
}

/**
 * Check 4: Build not stale (AC17)
 */
async function checkBuildNotStale(monorepoRoot: string): Promise<CheckResult> {
  const distPath = path.join(monorepoRoot, 'apps/api/knowledge-base/dist/mcp-server/index.js')
  const srcDir = path.join(monorepoRoot, 'apps/api/knowledge-base/src')

  if (!fs.existsSync(distPath)) {
    return {
      name: 'Build freshness',
      passed: false,
      message: 'Build does not exist',
      suggestion: 'Run: pnpm build',
    }
  }

  const distStat = fs.statSync(distPath)

  // Check if any src file is newer than dist
  function findNewestFile(dir: string): number {
    let newest = 0
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          newest = Math.max(newest, findNewestFile(fullPath))
        } else if (entry.name.endsWith('.ts')) {
          const stat = fs.statSync(fullPath)
          newest = Math.max(newest, stat.mtimeMs)
        }
      }
    } catch {
      // Ignore errors
    }
    return newest
  }

  const newestSrc = findNewestFile(srcDir)

  if (newestSrc > distStat.mtimeMs) {
    return {
      name: 'Build freshness',
      passed: false,
      message: 'Source files are newer than build',
      suggestion: 'Run: pnpm build',
    }
  }

  return {
    name: 'Build freshness',
    passed: true,
    message: '',
  }
}

/**
 * Check 5: DATABASE_URL set
 */
async function checkDatabaseUrl(): Promise<CheckResult> {
  const dbUrl = process.env.DATABASE_URL

  if (!dbUrl) {
    return {
      name: 'DATABASE_URL set',
      passed: false,
      message: 'Environment variable not set',
      suggestion: 'Export DATABASE_URL or add to .env file',
    }
  }

  // Mask password in log
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':***@')
  return {
    name: `DATABASE_URL set (${maskedUrl.substring(0, 50)}...)`,
    passed: true,
    message: '',
  }
}

/**
 * Check 6: OPENAI_API_KEY set
 */
async function checkOpenAIApiKey(): Promise<CheckResult> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return {
      name: 'OPENAI_API_KEY set',
      passed: false,
      message: 'Environment variable not set',
      suggestion: 'Export OPENAI_API_KEY or add to .env file',
    }
  }

  // Never echo the key - just show prefix
  const prefix = apiKey.substring(0, 7)
  return {
    name: `OPENAI_API_KEY set (${prefix}...)`,
    passed: true,
    message: '',
  }
}

/**
 * Check 7: Database connectivity (AC4)
 */
async function checkDatabaseConnectivity(): Promise<CheckResult> {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    return {
      name: 'Database connectivity',
      passed: false,
      message: 'DATABASE_URL not set',
      suggestion: 'Set DATABASE_URL first',
    }
  }

  // Try to connect using psql or pg_isready
  const result = exec(`docker exec knowledge-base-postgres pg_isready -U kbuser -d knowledgebase`)

  if (result.success) {
    return {
      name: 'Database connectivity',
      passed: true,
      message: '',
    }
  }

  // Parse connection details for error message (mask password)
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':***@')

  return {
    name: 'Database connectivity',
    passed: false,
    message: 'Cannot connect to database',
    suggestion: `Check DATABASE_URL and ensure container is running. URL: ${maskedUrl}`,
  }
}

/**
 * Check 8: OpenAI API key valid (AC5)
 */
async function checkOpenAIApiKeyValid(): Promise<CheckResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      name: 'OpenAI API key valid',
      passed: false,
      message: 'OPENAI_API_KEY not set',
      suggestion: 'Set OPENAI_API_KEY first',
    }
  }

  // Make a simple models list call to validate the key
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (response.ok) {
      return {
        name: 'OpenAI API key valid',
        passed: true,
        message: '',
      }
    }

    const errorText = await response.text()
    // Don't leak the key in error messages
    const safeError = errorText.replace(apiKey, '***')

    return {
      name: 'OpenAI API key valid',
      passed: false,
      message: `API returned ${response.status}`,
      suggestion: `Check OPENAI_API_KEY. Error: ${safeError.substring(0, 100)}`,
    }
  } catch (err) {
    return {
      name: 'OpenAI API key valid',
      passed: false,
      message: 'Network error',
      suggestion: 'Check internet connection and try again',
    }
  }
}

/**
 * Check 9: MCP server responds (AC6)
 */
async function checkMcpServerResponds(monorepoRoot: string): Promise<CheckResult> {
  const mcpPath = path.join(monorepoRoot, 'apps/api/knowledge-base/dist/mcp-server/index.js')

  if (!fs.existsSync(mcpPath)) {
    return {
      name: 'MCP server responds',
      passed: false,
      message: 'MCP server not built',
      suggestion: 'Run: pnpm build first',
    }
  }

  return new Promise(resolve => {
    let mcpProcess: ChildProcess | null = null
    let resolved = false
    let output = ''

    const cleanup = () => {
      if (mcpProcess && !mcpProcess.killed) {
        mcpProcess.kill('SIGTERM')
      }
    }

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        cleanup()
        resolve({
          name: 'MCP server responds',
          passed: false,
          message: 'Timeout waiting for MCP server',
          suggestion: 'Check MCP server logs for errors',
        })
      }
    }, 15000)

    try {
      mcpProcess = spawn('node', [mcpPath], {
        env: {
          ...process.env,
          // Ensure environment variables are passed
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      mcpProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString()
      })

      mcpProcess.stderr?.on('data', (data: Buffer) => {
        output += data.toString()
        // Check for startup success message
        if (output.includes('MCP server started') || output.includes('listening')) {
          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            cleanup()
            resolve({
              name: 'MCP server responds',
              passed: true,
              message: '',
            })
          }
        }
      })

      mcpProcess.on('error', err => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          cleanup()
          resolve({
            name: 'MCP server responds',
            passed: false,
            message: `Failed to start: ${err.message}`,
            suggestion: 'Check Node.js installation and MCP server build',
          })
        }
      })

      mcpProcess.on('exit', code => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          // Exit code 0 means clean shutdown (server started and stopped)
          // Non-zero means error
          if (code !== 0 && code !== null) {
            resolve({
              name: 'MCP server responds',
              passed: false,
              message: `Server exited with code ${code}`,
              suggestion: 'Check environment variables and database connection',
            })
          }
        }
      })

      // Give the server a moment to start, then verify it's running
      setTimeout(() => {
        if (!resolved && mcpProcess && !mcpProcess.killed) {
          resolved = true
          clearTimeout(timeout)
          cleanup()
          resolve({
            name: 'MCP server responds',
            passed: true,
            message: '',
          })
        }
      }, 3000)
    } catch (err) {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        cleanup()
        resolve({
          name: 'MCP server responds',
          passed: false,
          message: `Exception: ${err instanceof Error ? err.message : String(err)}`,
          suggestion: 'Check Node.js installation',
        })
      }
    }
  })
}

/**
 * Check for existing MCP server process (AC18)
 */
async function checkNoExistingMcpProcess(): Promise<CheckResult> {
  // Check for existing node processes running mcp-server
  const result = exec('pgrep -f "mcp-server/index.js" || true')

  if (result.success && result.output && result.output.trim()) {
    return {
      name: 'No conflicting MCP process',
      passed: false,
      message: 'Another MCP server process is running',
      suggestion: `Kill existing process: kill ${result.output.trim()}`,
    }
  }

  return {
    name: 'No conflicting MCP process',
    passed: true,
    message: '',
  }
}

/**
 * Main validation function
 */
async function main(): Promise<void> {
  // Parse args
  quietMode = process.argv.includes('--quiet') || process.argv.includes('-q')

  log('')
  log('MCP Connection Validator', 'bold')
  log('Checking all prerequisites for Knowledge Base MCP server')
  log('')

  const monorepoRoot = findMonorepoRoot()
  log(`Monorepo root: ${monorepoRoot}`, 'gray')

  // Detect Docker platform (AC20)
  const dockerPlatform = detectDockerPlatform()
  log(`Docker platform: ${dockerPlatform}`, 'gray')
  log('')

  const checks: CheckResult[] = []

  // Run all checks
  log('Running checks...', 'blue')
  log('')

  // Infrastructure checks
  checks.push(await checkDockerRunning())
  printResult(checks[checks.length - 1])

  checks.push(await checkDatabaseContainer())
  printResult(checks[checks.length - 1])

  checks.push(await checkMcpServerBuilt(monorepoRoot))
  printResult(checks[checks.length - 1])

  checks.push(await checkBuildNotStale(monorepoRoot))
  printResult(checks[checks.length - 1])

  // Environment checks
  checks.push(await checkDatabaseUrl())
  printResult(checks[checks.length - 1])

  checks.push(await checkOpenAIApiKey())
  printResult(checks[checks.length - 1])

  // Connectivity checks
  checks.push(await checkDatabaseConnectivity())
  printResult(checks[checks.length - 1])

  checks.push(await checkOpenAIApiKeyValid())
  printResult(checks[checks.length - 1])

  // Process checks
  checks.push(await checkNoExistingMcpProcess())
  printResult(checks[checks.length - 1])

  // MCP server check (only if prerequisites pass)
  const prereqsPassed = checks.slice(0, -1).every(c => c.passed)
  if (prereqsPassed) {
    checks.push(await checkMcpServerResponds(monorepoRoot))
    printResult(checks[checks.length - 1])
  } else {
    log('')
    log('Skipping MCP server check - fix above issues first', 'yellow')
  }

  // Summary
  log('')
  const passed = checks.filter(c => c.passed).length
  const failed = checks.filter(c => !c.passed).length

  if (failed === 0) {
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'green')
    log(`All ${passed} checks passed!`, 'green')
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'green')
    log('')
    log('The Knowledge Base MCP server is ready to use with Claude Code.')
  } else {
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'red')
    log(`${failed} check(s) failed, ${passed} passed`, 'red')
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'red')
    log('')
    log('Fix the issues above and run this validator again.')
    process.exit(1)
  }
}

// Run main
main().catch(err => {
  console.error(
    `${COLORS.red}✗${COLORS.reset} Validation failed: ${err instanceof Error ? err.message : String(err)}`,
  )
  process.exit(1)
})
