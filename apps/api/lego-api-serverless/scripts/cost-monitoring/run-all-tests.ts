#!/usr/bin/env node
/**
 * Comprehensive Test Suite for Cost Monitoring System
 * Story 1.4: Cost Monitoring and Budget Alerts
 *
 * This script runs all validation and integration tests for the cost monitoring system.
 */

import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

// ES module compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface TestSuite {
  name: string
  script: string
  description: string
  required: boolean
}

const testSuites: TestSuite[] = [
  {
    name: 'Budget Configuration Validation',
    script: 'validate-budget-configuration.ts',
    description: 'Validates AWS Budget and SNS topic configuration',
    required: true,
  },
  {
    name: 'Dashboard Validation',
    script: 'validate-dashboard.ts',
    description: 'Validates CloudWatch dashboard and cost data availability',
    required: true,
  },
  {
    name: 'Integration Tests',
    script: 'integration-test.ts',
    description: 'End-to-end integration testing of all components',
    required: true,
  },
  {
    name: 'Cost Report Generation',
    script: 'generate-cost-report.ts',
    description: 'Tests cost report generation functionality',
    required: false,
  },
]

interface TestResult {
  suite: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  duration: number
  output?: string
  error?: string
}

/**
 * Run a single test suite
 */
async function runTestSuite(suite: TestSuite, stage: string): Promise<TestResult> {
  const startTime = Date.now()
  const scriptPath = path.join(__dirname, suite.script)

  console.log(`🔄 Running ${suite.name}...`)

  try {
    // Check if script exists
    if (!existsSync(scriptPath)) {
      return {
        suite: suite.name,
        status: 'SKIP',
        duration: Date.now() - startTime,
        error: 'Script file not found',
      }
    }

    // Execute the test script
    const output = execSync(`npx tsx ${scriptPath} ${stage}`, {
      encoding: 'utf8',
      timeout: 60000, // 60 second timeout
      stdio: 'pipe',
    })

    return {
      suite: suite.name,
      status: 'PASS',
      duration: Date.now() - startTime,
      output: output.trim(),
    }
  } catch (error: any) {
    const duration = Date.now() - startTime

    // Handle different types of errors
    if (error.status === 1) {
      // Test failed but script ran
      return {
        suite: suite.name,
        status: 'FAIL',
        duration,
        output: error.stdout?.toString() || '',
        error: error.stderr?.toString() || error.message,
      }
    } else {
      // Script execution error
      return {
        suite: suite.name,
        status: 'FAIL',
        duration,
        error: error.message || 'Unknown error',
      }
    }
  }
}

/**
 * Print test results summary
 */
function printSummary(results: TestResult[]) {
  console.log('\n' + '═'.repeat(80))
  console.log('   COST MONITORING TEST SUITE SUMMARY')
  console.log('═'.repeat(80))
  console.log()

  let passCount = 0
  let failCount = 0
  let skipCount = 0
  let totalDuration = 0

  for (const result of results) {
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️'

    console.log(`${statusIcon} ${result.suite} (${result.duration}ms)`)

    if (result.status === 'FAIL' && result.error) {
      console.log(`   Error: ${result.error}`)
    }

    if (result.status === 'PASS') passCount++
    else if (result.status === 'FAIL') failCount++
    else skipCount++

    totalDuration += result.duration
  }

  console.log('\n' + '─'.repeat(80))
  console.log(`Results: ${passCount} passed, ${failCount} failed, ${skipCount} skipped`)
  console.log(`Total execution time: ${totalDuration}ms`)
  console.log('─'.repeat(80))

  return { passCount, failCount, skipCount }
}

/**
 * Print detailed results for failed tests
 */
function printDetailedResults(results: TestResult[]) {
  const failedTests = results.filter(r => r.status === 'FAIL')

  if (failedTests.length === 0) {
    return
  }

  console.log('\n' + '═'.repeat(80))
  console.log('   DETAILED FAILURE INFORMATION')
  console.log('═'.repeat(80))

  for (const result of failedTests) {
    console.log(`\n❌ ${result.suite}`)
    console.log('─'.repeat(40))

    if (result.error) {
      console.log('Error:')
      console.log(result.error)
    }

    if (result.output) {
      console.log('\nOutput:')
      console.log(result.output)
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const stage = process.argv[2] || 'dev'
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v')

  console.log('🧪 Cost Monitoring Test Suite')
  console.log('═'.repeat(80))
  console.log(`Stage: ${stage}`)
  console.log(`Verbose: ${verbose}`)
  console.log(`Test Suites: ${testSuites.length}`)
  console.log('═'.repeat(80))

  const results: TestResult[] = []

  // Run each test suite sequentially
  for (const suite of testSuites) {
    console.log(`\n📋 ${suite.description}`)

    const result = await runTestSuite(suite, stage)
    results.push(result)

    // Print immediate result
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️'
    console.log(`${statusIcon} ${result.status} (${result.duration}ms)`)

    // Print output if verbose or if test failed
    if (verbose || result.status === 'FAIL') {
      if (result.output) {
        console.log('\nOutput:')
        console.log(result.output)
      }
      if (result.error) {
        console.log('\nError:')
        console.log(result.error)
      }
    }
  }

  // Print summary
  const { passCount, failCount, skipCount } = printSummary(results)

  // Print detailed failure information
  if (!verbose) {
    printDetailedResults(results)
  }

  // Final status
  console.log('\n' + '═'.repeat(80))

  if (failCount === 0) {
    console.log('🎉 All tests passed! Cost monitoring system is ready.')

    // Print next steps
    console.log('\n📋 Next Steps:')
    console.log('1. Monitor the CloudWatch dashboard for cost metrics')
    console.log('2. Set up email subscriptions for budget alerts')
    console.log('3. Review monthly cost reports')
    console.log('4. Adjust budget thresholds as needed')

    process.exit(0)
  } else {
    const requiredFailures = results.filter(
      r => r.status === 'FAIL' && testSuites.find(s => s.name === r.suite)?.required,
    ).length

    if (requiredFailures > 0) {
      console.log('❌ Required tests failed! Please fix the issues before proceeding.')
      process.exit(1)
    } else {
      console.log('⚠️  Some optional tests failed, but core functionality is working.')
      process.exit(0)
    }
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
