import { describe, it, expect } from 'vitest'
import { CliOptionsSchema } from '../__types__/index.js'

/**
 * Mirrors the parseArgs() logic from index.ts for testability.
 * This is a pure function extracted from the CLI entry point.
 */
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
          throw new Error('--single requires a MOC number')
        }
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

describe('CLI arg parsing', () => {
  it('--list-only sets listOnly: true', () => {
    const raw = parseArgs(['node', 'index.ts', '--list-only'])
    const options = CliOptionsSchema.parse(raw)
    expect(options.listOnly).toBe(true)
  })

  it('--single MOC-12345 sets single to "12345"', () => {
    const raw = parseArgs(['node', 'index.ts', '--single', 'MOC-12345'])
    const options = CliOptionsSchema.parse(raw)
    expect(options.single).toBe('12345')
  })

  it('--single 12345 (without MOC- prefix) sets single to "12345"', () => {
    const raw = parseArgs(['node', 'index.ts', '--single', '12345'])
    const options = CliOptionsSchema.parse(raw)
    expect(options.single).toBe('12345')
  })

  it('--single without value throws error', () => {
    expect(() => parseArgs(['node', 'index.ts', '--single'])).toThrow(
      '--single requires a MOC number',
    )
  })

  it('--single followed by another flag throws error', () => {
    expect(() => parseArgs(['node', 'index.ts', '--single', '--dry-run'])).toThrow(
      '--single requires a MOC number',
    )
  })

  it('--list-only combined with --liked-mocs', () => {
    const raw = parseArgs(['node', 'index.ts', '--list-only', '--liked-mocs'])
    const options = CliOptionsSchema.parse(raw)
    expect(options.listOnly).toBe(true)
    expect(options.likedMocs).toBe(true)
  })

  it('--single combined with --force', () => {
    const raw = parseArgs(['node', 'index.ts', '--single', 'MOC-99999', '--force'])
    const options = CliOptionsSchema.parse(raw)
    expect(options.single).toBe('99999')
    expect(options.force).toBe(true)
  })

  it('--single combined with --dry-run', () => {
    const raw = parseArgs(['node', 'index.ts', '--single', '54321', '--dry-run'])
    const options = CliOptionsSchema.parse(raw)
    expect(options.single).toBe('54321')
    expect(options.dryRun).toBe(true)
  })
})
