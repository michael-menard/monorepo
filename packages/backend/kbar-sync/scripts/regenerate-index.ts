#!/usr/bin/env npx tsx
/**
 * regenerate:index CLI Command
 * KBAR-0240
 *
 * Regenerates the stories index for a given epic using generateStoriesIndex().
 *
 * Usage:
 *   regenerate:index --epic KBAR
 *   regenerate:index --epic KBAR --output /path/to/stories.index.md
 *   regenerate:index --epic KBAR --dry-run
 *   regenerate:index --help
 *
 * Exit codes:
 *   0 - Index generated (or dry-run matched existing)
 *   1 - Generation failed, or dry-run content differs from existing
 *   2 - DB connection failure / fatal error
 */

import { readFile, writeFile } from 'node:fs/promises'
import { RegenerateIndexCLIOptionsSchema } from './__types__/cli-options.js'

// ============================================================================
// Help Text
// ============================================================================

const HELP_TEXT = `
regenerate:index - Regenerate the stories index for an epic

USAGE:
  regenerate:index --epic <name> [options]

REQUIRED FLAGS:
  --epic <name>            Epic name to generate the stories index for (e.g., "KBAR")

OPTIONAL FLAGS:
  --output <path>          File path to write the generated index to
  --dry-run                Print result to stdout; compare with existing file
                           Exit 0 if content matches, 1 if differs
  --verbose                Enable verbose logging
  --force                  Skip staleness check; regenerate unconditionally
  --help                   Show this help message

EXIT CODES:
  0 - Index generated successfully (or dry-run matched existing)
  1 - Generation failed, or dry-run content differs from existing
  2 - DB connection failure / fatal error

EXAMPLES:
  # Generate index for KBAR epic
  regenerate:index --epic KBAR

  # Write to a specific output file
  regenerate:index --epic KBAR --output plans/future/platform/kb-artifact-migration/stories.index.md

  # Dry-run: print and compare without writing
  regenerate:index --epic KBAR --dry-run

  # Force regeneration skipping staleness check
  regenerate:index --epic KBAR --force
`.trim()

// ============================================================================
// Re-throw helper for process.exit mock errors in tests
// ============================================================================

function rethrowExitError(error: unknown): void {
  if (error instanceof Error && /^(exit:|process\.exit\()\d+\)?$/.test(error.message)) {
    throw error
  }
}

// ============================================================================
// Arg Parsing
// ============================================================================

export function parseArgs(args: string[]): Record<string, unknown> | null {
  if (args.includes('--help') || args.includes('-h')) {
    return null
  }

  const opts: Record<string, unknown> = {}
  let i = 0

  while (i < args.length) {
    const arg = args[i]

    if (arg === '--epic') {
      opts.epic = args[++i]
    } else if (arg === '--output') {
      opts.output = args[++i]
    } else if (arg === '--dry-run') {
      opts.dryRun = true
    } else if (arg === '--verbose') {
      opts.verbose = true
    } else if (arg === '--force') {
      opts.force = true
    }

    i++
  }

  return opts
}

// ============================================================================
// Main
// ============================================================================

export async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // Handle --help BEFORE any imports that require DB env vars
  const rawOpts = parseArgs(args)
  if (rawOpts === null) {
    process.stdout.write(HELP_TEXT + '\n')
    process.exit(0)
  }

  // Validate options with Zod
  const parseResult = RegenerateIndexCLIOptionsSchema.safeParse(rawOpts)
  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map(e => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n')
    process.stderr.write(`[regenerate:index] ERROR: Invalid options:\n${errors}\n`)
    process.stderr.write(`Run 'regenerate:index --help' for usage.\n`)
    process.exit(1)
  }

  const opts = parseResult.data
  const { epic, output, dryRun, verbose, force } = opts

  if (verbose) {
    const { logger } = await import('@repo/logger')
    logger.info(
      `[regenerate:index] Starting index regeneration: epic=${epic} dryRun=${dryRun} force=${force}`,
    )
  }

  // Dynamic import: generateStoriesIndex may not exist yet (KBAR-0230 not merged)
  let generateStoriesIndex: ((opts: { epic: string; verbose?: boolean }) => Promise<string>) | null =
    null

  try {
    const mod = await import('../src/index.js')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generateStoriesIndex = (mod as any).generateStoriesIndex ?? null
  } catch (error) {
    rethrowExitError(error)
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('connection') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
      process.stderr.write(`[regenerate:index] ERROR: DB connection failed\n`)
      process.exit(2)
    }
    process.stderr.write(`[regenerate:index] ERROR: Failed to load kbar-sync module: ${msg}\n`)
    process.exit(1)
  }

  if (generateStoriesIndex === null) {
    process.stderr.write(
      `[regenerate:index] ERROR: generateStoriesIndex() is not yet available in @repo/kbar-sync.\n`,
    )
    process.stderr.write(
      `  This function will be available after KBAR-0230 is merged.\n`,
    )
    process.exit(1)
  }

  let result: string
  try {
    result = await generateStoriesIndex({ epic, verbose })
  } catch (error) {
    rethrowExitError(error)
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('connection') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
      process.stderr.write(`[regenerate:index] ERROR: DB connection failed\n`)
      process.exit(2)
    }
    process.stderr.write(`[regenerate:index] ERROR: Index generation failed: ${msg}\n`)
    process.exit(1)
  }

  // =========================================================================
  // --dry-run: Print to stdout and compare with existing file
  // =========================================================================
  if (dryRun) {
    process.stdout.write(result)
    process.stdout.write('\n')

    if (output) {
      let existing: string | null = null
      try {
        existing = await readFile(output, 'utf-8')
      } catch {
        // File does not exist — treat as "differs"
      }

      if (existing === null) {
        process.stdout.write(`[regenerate:index] DRY-RUN: No existing file at ${output}\n`)
        process.exit(1)
      }

      if (result.trim() === existing.trim()) {
        process.stdout.write(`[regenerate:index] DRY-RUN: Content matches existing file\n`)
        process.exit(0)
      } else {
        process.stdout.write(`[regenerate:index] DRY-RUN: Content differs from existing file\n`)
        process.exit(1)
      }
    }

    // No output path: just print and exit 0
    process.exit(0)
  }

  // =========================================================================
  // --output: Write result to file
  // =========================================================================
  if (output) {
    try {
      await writeFile(output, result, 'utf-8')
      if (verbose) {
        const { logger } = await import('@repo/logger')
        logger.info(`[regenerate:index] Written to ${output}`)
      }
      process.stdout.write(`[regenerate:index] Index written to ${output}\n`)
      process.exit(0)
    } catch (error) {
      rethrowExitError(error)
      const msg = error instanceof Error ? error.message : String(error)
      process.stderr.write(`[regenerate:index] ERROR: Failed to write output file: ${msg}\n`)
      process.exit(1)
    }
  }

  // Default: print to stdout
  process.stdout.write(result)
  process.stdout.write('\n')
  process.exit(0)
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
