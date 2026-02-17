#!/usr/bin/env node

import { fileURLToPath } from 'url'
import path from 'path'
import { existsSync } from 'fs'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { seedPhases } from './phase-seeder.js'
import { seedCapabilities } from './capability-seeder.js'
import { seedAgents } from './agent-seeder.js'
import { seedCommands } from './command-seeder.js'
import { seedSkills } from './skill-seeder.js'

import { z } from 'zod'

const SeedTableResultSchema = z.object({
  table: z.string(),
  rowCount: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
})

type SeedTableResult = z.infer<typeof SeedTableResultSchema>

// Parse CLI arguments
const args = process.argv.slice(2)
const targetArg = args.find(arg => arg.startsWith('--target='))
const target = targetArg ? targetArg.split('=')[1] : 'all'
const dryRun = args.includes('--dry-run')

// Valid targets
const validTargets = ['phases', 'capabilities', 'agents', 'commands', 'skills', 'all']
if (!validTargets.includes(target)) {
  logger.error('Invalid target', {
    target,
    validTargets,
    message: `Valid targets: ${validTargets.join(', ')}`,
  })
  process.exit(1)
}

// Resolve paths relative to monorepo root
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const monorepoRoot = path.resolve(__dirname, '../../../../..')
const storiesIndexPath = path.join(monorepoRoot, 'plans/future/platform/wint/stories.index.md')
const agentsDir = path.join(monorepoRoot, '.claude/agents')
const commandsDir = path.join(monorepoRoot, '.claude/commands')
const skillsDir = path.join(monorepoRoot, '.claude/skills')

/**
 * Pre-flight checks: verify data sources are accessible
 */
function runPreflightChecks(): boolean {
  const checks = [
    { name: 'stories.index.md', path: storiesIndexPath },
    { name: 'agents directory', path: agentsDir },
    { name: 'commands directory', path: commandsDir },
    { name: 'skills directory', path: skillsDir },
  ]

  let allPassed = true
  for (const check of checks) {
    if (!existsSync(check.path)) {
      logger.error('Pre-flight check failed', {
        check: check.name,
        path: check.path,
        error: 'Path does not exist',
      })
      allPassed = false
    }
  }

  return allPassed
}

/**
 * Main CLI entry point
 */
async function main() {
  const startTime = Date.now()

  logger.info('Starting WINT seed', {
    target,
    dryRun,
    paths: {
      storiesIndex: storiesIndexPath,
      agents: agentsDir,
      commands: commandsDir,
      skills: skillsDir,
    },
  })

  // Run pre-flight checks
  if (!runPreflightChecks()) {
    logger.error('Pre-flight checks failed')
    process.exit(1)
  }

  if (dryRun) {
    logger.info('Dry run mode - no database changes will be made')
    logger.info('Pre-flight checks passed')
    process.exit(0)
  }

  try {
    // Execute seeding within single transaction
    await db.transaction(async tx => {
      const results: SeedTableResult[] = []

      if (target === 'all' || target === 'phases') {
        logger.info('Seeding phases...')
        const result = await seedPhases(tx, storiesIndexPath)
        results.push({ table: 'phases', ...result })
      }

      if (target === 'all' || target === 'capabilities') {
        logger.info('Seeding capabilities...')
        const result = await seedCapabilities(tx)
        results.push({ table: 'capabilities', ...result })
      }

      if (target === 'all' || target === 'agents') {
        logger.info('Seeding agents...')
        const result = await seedAgents(tx, agentsDir)
        results.push({ table: 'agents', ...result })
      }

      if (target === 'all' || target === 'commands') {
        logger.info('Seeding commands...')
        const result = await seedCommands(tx, commandsDir)
        results.push({ table: 'commands', ...result })
      }

      if (target === 'all' || target === 'skills') {
        logger.info('Seeding skills...')
        const result = await seedSkills(tx, skillsDir)
        results.push({ table: 'skills', ...result })
      }

      // Log summary
      const duration = Date.now() - startTime
      const totalRows = results.reduce((sum, r) => sum + r.rowCount, 0)
      const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0)

      logger.info('Seeding complete', {
        duration: `${duration}ms`,
        totalRows,
        totalWarnings,
        results: results.map(r => ({
          table: r.table,
          rowCount: r.rowCount,
          warningCount: r.warnings.length,
        })),
      })

      if (totalWarnings > 0) {
        logger.warn('Seeding completed with warnings', {
          warningCount: totalWarnings,
          warnings: results.flatMap(r => r.warnings),
        })
      }
    })

    logger.info('Transaction committed successfully')
    process.exit(0)
  } catch (err) {
    const error = err as Error
    logger.error('Seeding failed, transaction rolled back', {
      error: error.message,
      stack: error.stack,
    })
    process.exit(1)
  }
}

// Run main function
main()
