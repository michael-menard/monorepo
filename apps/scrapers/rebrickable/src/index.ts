import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { logger } from '@repo/logger'
import { CliOptionsSchema, EnvConfigSchema } from './__types__/index.js'
import {
  runPipeline,
  runBackfillPipeline,
  runBackfillSingle,
  runListOnly,
  runSingle,
} from './scraper/pipeline.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

function parseArgs(argv: string[]) {
  const args = argv.slice(2)
  const options: Record<string, unknown> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--headed':
        options.headed = true
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--resume':
        options.resume = true
        break
      case '--force':
        options.force = true
        break
      case '--retry-failed':
        options.retryFailed = true
        break
      case '--retry-missing':
        options.retryMissing = true
        break
      case '--liked-mocs':
        options.likedMocs = true
        break
      case '--ignore-robots':
        options.ignoreRobots = true
        break
      case '--list-only':
        options.listOnly = true
        break
      case '--single': {
        const value = args[i + 1]
        if (!value || value.startsWith('--')) {
          logger.error('[config] --single requires a MOC number (e.g., --single MOC-12345)')
          process.exit(1)
        }
        // Accept both "MOC-12345" and "12345" formats
        options.single = value.replace(/^MOC-/i, '')
        i++
        break
      }
      case '--limit':
        options.limit = parseInt(args[++i], 10)
        break
      default:
        if (arg.startsWith('--limit=')) {
          options.limit = parseInt(arg.split('=')[1], 10)
        }
    }
  }

  return options
}

async function main(): Promise<void> {
  logger.info('═══════════════════════════════════════════════════════')
  logger.info('  Rebrickable MOC Instructions Scraper')
  logger.info('═══════════════════════════════════════════════════════')

  // Parse CLI args
  const rawOptions = parseArgs(process.argv)
  const options = CliOptionsSchema.parse(rawOptions)

  // Validate environment
  const envResult = EnvConfigSchema.safeParse(process.env)
  if (!envResult.success) {
    const missing = envResult.error.issues.map(i => i.path.join('.')).join(', ')
    logger.error(`[config] Missing or invalid environment variables: ${missing}`)
    logger.error('[config] Copy .env.example to .env and fill in your values')
    process.exit(1)
  }

  const envConfig = envResult.data

  logger.info('[config] Options:', {
    headed: options.headed,
    dryRun: options.dryRun,
    resume: options.resume,
    force: options.force,
    retryFailed: options.retryFailed,
    retryMissing: options.retryMissing,
    likedMocs: options.likedMocs,
    listOnly: options.listOnly,
    single: options.single ?? 'none',
    limit: options.limit ?? 'all',
    ignoreRobots: options.ignoreRobots,
  })

  if (options.listOnly) {
    await runListOnly(options, {
      username: envConfig.REBRICKABLE_USERNAME,
      password: envConfig.REBRICKABLE_PASSWORD,
      userSlug: envConfig.REBRICKABLE_USER_SLUG,
      rateLimit: envConfig.SCRAPER_RATE_LIMIT,
      minDelayMs: envConfig.SCRAPER_MIN_DELAY_MS,
    })
  } else if (options.single && options.retryMissing) {
    await runBackfillSingle(options, {
      username: envConfig.REBRICKABLE_USERNAME,
      password: envConfig.REBRICKABLE_PASSWORD,
      bucket: envConfig.SCRAPER_BUCKET,
      rateLimit: envConfig.SCRAPER_RATE_LIMIT,
      minDelayMs: envConfig.SCRAPER_MIN_DELAY_MS,
    })
  } else if (options.single) {
    await runSingle(options, {
      username: envConfig.REBRICKABLE_USERNAME,
      password: envConfig.REBRICKABLE_PASSWORD,
      userSlug: envConfig.REBRICKABLE_USER_SLUG,
      bucket: envConfig.SCRAPER_BUCKET,
      rateLimit: envConfig.SCRAPER_RATE_LIMIT,
      minDelayMs: envConfig.SCRAPER_MIN_DELAY_MS,
    })
  } else if (options.retryMissing) {
    await runBackfillPipeline(options, {
      username: envConfig.REBRICKABLE_USERNAME,
      password: envConfig.REBRICKABLE_PASSWORD,
      bucket: envConfig.SCRAPER_BUCKET,
      rateLimit: envConfig.SCRAPER_RATE_LIMIT,
      minDelayMs: envConfig.SCRAPER_MIN_DELAY_MS,
    })
  } else {
    await runPipeline(options, {
      username: envConfig.REBRICKABLE_USERNAME,
      password: envConfig.REBRICKABLE_PASSWORD,
      userSlug: envConfig.REBRICKABLE_USER_SLUG,
      bucket: envConfig.SCRAPER_BUCKET,
      rateLimit: envConfig.SCRAPER_RATE_LIMIT,
      minDelayMs: envConfig.SCRAPER_MIN_DELAY_MS,
    })
  }
}

main().catch(error => {
  logger.error('[scraper] Unhandled error:', {
    error: error instanceof Error ? error.message : String(error),
  })
  process.exit(1)
})
