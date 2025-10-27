#!/usr/bin/env tsx

/**
 * Comprehensive Test Runner for Auth Package
 *
 * This script runs all types of tests for the auth package:
 * - Unit tests (Vitest)
 * - Integration tests (Vitest)
 * - Component tests (Vitest + Testing Library)
 * - Type checking (TypeScript)
 * - Linting (ESLint)
 *
 * Usage:
 *   pnpm test:all          # Run all tests
 *   pnpm test:unit         # Run only unit tests
 *   pnpm test:integration  # Run only integration tests
 *   pnpm test:components   # Run only component tests
 *   pnpm test:watch        # Run tests in watch mode
 *   pnpm test:coverage     # Run tests with coverage
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

interface TestConfig {
  name: string
  command: string
  description: string
  required: boolean
}

const TEST_CONFIGS: TestConfig[] = [
  {
    name: 'type-check',
    command: 'tsc --noEmit',
    description: 'TypeScript type checking',
    required: true,
  },
  {
    name: 'lint',
    command: 'eslint src --ext .ts,.tsx --max-warnings 0',
    description: 'ESLint code quality checks',
    required: true,
  },
  {
    name: 'unit',
    command: 'vitest run src/**/*.test.ts',
    description: 'Unit tests for utilities and core logic',
    required: true,
  },
  {
    name: 'integration',
    command: 'vitest run src/**/*.integration.test.tsx',
    description: 'Integration tests for complete flows',
    required: true,
  },
  {
    name: 'components',
    command: 'vitest run src/components/**/*.test.tsx',
    description: 'Component tests with React Testing Library',
    required: true,
  },
]

class TestRunner {
  private results: Map<string, { success: boolean; duration: number; output?: string }> = new Map()
  private startTime = Date.now()

  constructor(
    private options: {
      verbose?: boolean
      coverage?: boolean
      watch?: boolean
      filter?: string[]
    } = {},
  ) {}

  async runAll(): Promise<boolean> {
    console.log('🧪 Running Auth Package Test Suite\n')

    const testsToRun = this.options.filter
      ? TEST_CONFIGS.filter(config => this.options.filter!.includes(config.name))
      : TEST_CONFIGS

    let allPassed = true

    for (const config of testsToRun) {
      const success = await this.runTest(config)
      if (!success && config.required) {
        allPassed = false
      }
    }

    this.printSummary()
    return allPassed
  }

  private async runTest(config: TestConfig): Promise<boolean> {
    const startTime = Date.now()
    console.log(`\n📋 Running ${config.name}: ${config.description}`)

    try {
      let command = config.command

      // Add coverage flag if requested
      if (this.options.coverage && command.includes('vitest')) {
        command += ' --coverage'
      }

      // Add watch flag if requested
      if (this.options.watch && command.includes('vitest')) {
        command = command.replace('vitest run', 'vitest')
      }

      const output = execSync(command, {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: this.options.verbose ? 'inherit' : 'pipe',
      })

      const duration = Date.now() - startTime
      this.results.set(config.name, { success: true, duration, output })

      console.log(`✅ ${config.name} passed (${duration}ms)`)
      return true
    } catch (error: any) {
      const duration = Date.now() - startTime
      this.results.set(config.name, {
        success: false,
        duration,
        output: error.stdout || error.message,
      })

      console.log(`❌ ${config.name} failed (${duration}ms)`)

      if (this.options.verbose && error.stdout) {
        console.log('\nOutput:')
        console.log(error.stdout)
      }

      return false
    }
  }

  private printSummary(): void {
    const totalDuration = Date.now() - this.startTime
    const passed = Array.from(this.results.values()).filter(r => r.success).length
    const total = this.results.size

    console.log('\n' + '='.repeat(60))
    console.log('📊 Test Summary')
    console.log('='.repeat(60))

    for (const [name, result] of this.results) {
      const status = result.success ? '✅' : '❌'
      const duration = `${result.duration}ms`
      console.log(`${status} ${name.padEnd(15)} ${duration.padStart(8)}`)
    }

    console.log('='.repeat(60))
    console.log(`📈 Results: ${passed}/${total} passed`)
    console.log(`⏱️  Total time: ${totalDuration}ms`)

    if (passed === total) {
      console.log('🎉 All tests passed!')
    } else {
      console.log('💥 Some tests failed. Check the output above for details.')
    }

    // Coverage report location
    if (this.options.coverage) {
      const coverageDir = join(process.cwd(), 'coverage')
      if (existsSync(coverageDir)) {
        console.log(`📋 Coverage report: ${coverageDir}/index.html`)
      }
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    coverage: args.includes('--coverage') || args.includes('-c'),
    watch: args.includes('--watch') || args.includes('-w'),
    filter: args.filter(arg => !arg.startsWith('-')),
  }

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Auth Package Test Runner

Usage:
  pnpm test:all [options]           Run all tests
  pnpm test:unit [options]          Run unit tests only
  pnpm test:integration [options]   Run integration tests only
  pnpm test:components [options]    Run component tests only

Options:
  --verbose, -v     Show detailed output
  --coverage, -c    Generate coverage report
  --watch, -w       Run tests in watch mode
  --help, -h        Show this help message

Available test types:
${TEST_CONFIGS.map(config => `  ${config.name.padEnd(12)} ${config.description}`).join('\n')}
    `)
    process.exit(0)
  }

  const runner = new TestRunner(options)
  const success = await runner.runAll()

  process.exit(success ? 0 : 1)
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test runner failed:', error)
    process.exit(1)
  })
}

export { TestRunner, TEST_CONFIGS }
