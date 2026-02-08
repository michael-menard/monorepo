#!/usr/bin/env node
/**
 * MCP Configuration Generator
 *
 * Generates ~/.claude/mcp.json with the knowledge-base MCP server configuration.
 * Handles existing config backup and provides merge instructions.
 *
 * @see KNOW-039 AC1, AC2, AC19, AC27
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as readline from 'readline'
import { fileURLToPath } from 'url'

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ANSI color codes
const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
}

/**
 * Print colored message to stdout
 */
function log(message: string, color?: keyof typeof COLORS): void {
  if (color && COLORS[color]) {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`)
  } else {
    console.log(message)
  }
}

/**
 * Print success message with checkmark
 */
function success(message: string): void {
  log(`${COLORS.green}✓${COLORS.reset} ${message}`)
}

/**
 * Print warning message
 */
function warn(message: string): void {
  log(`${COLORS.yellow}!${COLORS.reset} ${message}`)
}

/**
 * Print error message
 */
function error(message: string): void {
  log(`${COLORS.red}✗${COLORS.reset} ${message}`)
}

/**
 * Resolve the monorepo root directory.
 * Walks up from current file looking for pnpm-workspace.yaml
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
    if (parent === dir) break // Reached filesystem root
    dir = parent
    depth++
  }

  // Fallback: assume we're in apps/api/knowledge-base/scripts
  return path.resolve(__dirname, '../../../../')
}

/**
 * Get the Claude config directory path (~/.claude)
 */
function getClaudeConfigDir(): string {
  return path.join(os.homedir(), '.claude')
}

/**
 * Get the MCP config file path (~/.claude/mcp.json)
 */
function getMcpConfigPath(): string {
  return path.join(getClaudeConfigDir(), 'mcp.json')
}

/**
 * Get the backup file path
 */
function getBackupPath(): string {
  return path.join(getClaudeConfigDir(), 'mcp.json.backup')
}

/**
 * Generate the MCP configuration object
 */
function generateConfig(monorepoRoot: string): object {
  const mcpServerPath = path.join(monorepoRoot, 'apps/api/knowledge-base/dist/mcp-server/index.js')

  return {
    mcpServers: {
      'knowledge-base': {
        command: 'node',
        args: [mcpServerPath],
        env: {
          DATABASE_URL: '${DATABASE_URL}',
          OPENAI_API_KEY: '${OPENAI_API_KEY}',
        },
      },
    },
  }
}

/**
 * Prompt user for yes/no confirmation
 */
async function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    rl.question(`${question} (y/N): `, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

/**
 * Check if running in non-interactive mode (e.g., CI)
 */
function isNonInteractive(): boolean {
  return !process.stdin.isTTY || process.env.CI === 'true'
}

/**
 * Print merge instructions for manual config merge
 */
function printMergeInstructions(config: object): void {
  log('\n--- Manual Merge Instructions ---', 'blue')
  log('Add the following to your existing ~/.claude/mcp.json under "mcpServers":')
  log('')
  const mcpServers = (config as { mcpServers: object }).mcpServers
  log(JSON.stringify(mcpServers, null, 2))
  log('')
  log('Example merged config:')
  log(`{
  "mcpServers": {
    // ... your existing servers ...,
    "knowledge-base": { ... the above config ... }
  }
}`)
}

/**
 * Main function
 */
async function main(): Promise<void> {
  log('')
  log('MCP Configuration Generator', 'bold')
  log('Generates ~/.claude/mcp.json for Knowledge Base MCP server')
  log('')

  // Check for --dry-run flag (AC27)
  const dryRun = process.argv.includes('--dry-run')
  if (dryRun) {
    log('DRY RUN MODE - No files will be written', 'yellow')
    log('')
  }

  // Find monorepo root
  const monorepoRoot = findMonorepoRoot()
  log(`Monorepo root: ${monorepoRoot}`)

  // Check if MCP server is built
  const mcpServerPath = path.join(monorepoRoot, 'apps/api/knowledge-base/dist/mcp-server/index.js')
  if (!fs.existsSync(mcpServerPath)) {
    warn(`MCP server not built. Build required at: ${mcpServerPath}`)
    warn('Run: cd apps/api/knowledge-base && pnpm build')
  }

  // Generate config
  const config = generateConfig(monorepoRoot)
  const configJson = JSON.stringify(config, null, 2)

  log('')
  log('Generated configuration:')
  log(configJson)
  log('')

  if (dryRun) {
    success('Dry run complete. No files written.')
    return
  }

  // Get paths
  const configDir = getClaudeConfigDir()
  const configPath = getMcpConfigPath()
  const backupPath = getBackupPath()

  // Check if config directory exists
  if (!fs.existsSync(configDir)) {
    log(`Creating directory: ${configDir}`)
    fs.mkdirSync(configDir, { recursive: true })
  }

  // Check if config file exists
  if (fs.existsSync(configPath)) {
    warn(`Config file already exists: ${configPath}`)
    log('')

    // Check for --force flag
    const force = process.argv.includes('--force')

    if (!force && !isNonInteractive()) {
      const overwrite = await promptYesNo('Overwrite existing config?')
      if (!overwrite) {
        log('')
        printMergeInstructions(config)
        log('')
        log('Exiting without changes.', 'yellow')
        return
      }
    }

    // Create backup (AC2, AC19)
    log(`Creating backup: ${backupPath}`)
    fs.copyFileSync(configPath, backupPath)
    success(`Backup created at: ${backupPath}`)
  }

  // Write config with atomic pattern (AC19)
  const tempPath = `${configPath}.tmp.${Date.now()}`

  try {
    // Write to temp file
    fs.writeFileSync(tempPath, configJson, { encoding: 'utf-8', mode: 0o644 })

    // Validate JSON
    JSON.parse(fs.readFileSync(tempPath, 'utf-8'))

    // Move to final location
    fs.renameSync(tempPath, configPath)

    success(`Config written to: ${configPath}`)
  } catch (err) {
    // Cleanup temp file on error
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }
    throw err
  }

  log('')
  log('--- Next Steps ---', 'blue')
  log('1. Ensure environment variables are set:')
  log('   export DATABASE_URL="postgresql://..."')
  log('   export OPENAI_API_KEY="sk-..."')
  log('')
  log('2. Validate the connection:')
  log('   pnpm kb:validate-connection')
  log('')
  log('3. Restart Claude Code to load the new MCP server')
  log('')
  success('Configuration complete!')
}

// Run main
main().catch(err => {
  error(`Failed: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
