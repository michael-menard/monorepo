#!/usr/bin/env node
/**
 * Integration Test for Cost Monitoring System
 * Story 1.4: Cost Monitoring and Budget Alerts (Task 8)
 *
 * This script performs end-to-end integration testing of the cost monitoring
 * system including budget alerts, dashboard, and cost metrics publishing.
 */

import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ES module compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize AWS clients
const cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION || 'us-east-1' })
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' })

interface TestResult {
  test: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  duration?: number
  details?: any
}

/**
 * Test cost metrics publishing Lambda function
 */
async function testCostMetricsPublisher(stage: string): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const functionName = `user-metrics-${stage}-cost-metrics-publisher`

    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        source: 'integration-test',
        detail: {
          testRun: true,
          timestamp: new Date().toISOString(),
        },
      }),
    })

    const response = await lambdaClient.send(command)
    const duration = Date.now() - startTime

    if (response.StatusCode === 200) {
      const payload = response.Payload ? JSON.parse(Buffer.from(response.Payload).toString()) : {}

      return {
        test: 'Cost Metrics Publisher Lambda',
        status: 'PASS',
        message: 'Lambda function executed successfully',
        duration,
        details: {
          statusCode: response.StatusCode,
          executedVersion: response.ExecutedVersion,
          payload: payload,
        },
      }
    } else {
      return {
        test: 'Cost Metrics Publisher Lambda',
        status: 'FAIL',
        message: `Lambda execution failed with status code: ${response.StatusCode}`,
        duration,
        details: {
          statusCode: response.StatusCode,
          functionError: response.FunctionError,
        },
      }
    }
  } catch (error) {
    return {
      test: 'Cost Metrics Publisher Lambda',
      status: 'FAIL',
      message: `Error invoking Lambda: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Test custom CloudWatch metrics publishing
 */
async function testCustomMetrics(stage: string): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const testMetricValue = Math.random() * 100

    const command = new PutMetricDataCommand({
      Namespace: 'UserMetrics/CostMonitoring',
      MetricData: [
        {
          MetricName: 'IntegrationTestMetric',
          Value: testMetricValue,
          Unit: 'Count',
          Dimensions: [
            {
              Name: 'Stage',
              Value: stage,
            },
            {
              Name: 'TestType',
              Value: 'Integration',
            },
          ],
          Timestamp: new Date(),
        },
      ],
    })

    await cloudWatchClient.send(command)
    const duration = Date.now() - startTime

    return {
      test: 'Custom CloudWatch Metrics',
      status: 'PASS',
      message: 'Successfully published test metric to CloudWatch',
      duration,
      details: {
        namespace: 'UserMetrics/CostMonitoring',
        metricName: 'IntegrationTestMetric',
        value: testMetricValue,
        stage,
      },
    }
  } catch (error) {
    return {
      test: 'Custom CloudWatch Metrics',
      status: 'FAIL',
      message: `Error publishing metric: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Test cost report generation script
 */
async function testCostReportGeneration(stage: string): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const scriptPath = path.join(__dirname, 'generate-cost-report.ts')

    // Check if script exists
    if (!existsSync(scriptPath)) {
      return {
        test: 'Cost Report Generation',
        status: 'SKIP',
        message: 'Cost report generation script not found',
        duration: Date.now() - startTime,
      }
    }

    // Execute the cost report generation script
    const output = execSync(`npx tsx ${scriptPath} ${stage} --test`, {
      encoding: 'utf8',
      timeout: 30000, // 30 second timeout
    })

    const duration = Date.now() - startTime

    return {
      test: 'Cost Report Generation',
      status: 'PASS',
      message: 'Cost report generation script executed successfully',
      duration,
      details: {
        output: output.trim(),
      },
    }
  } catch (error) {
    return {
      test: 'Cost Report Generation',
      status: 'FAIL',
      message: `Error running cost report script: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Test budget validation
 */
async function testBudgetValidation(stage: string): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const scriptPath = path.join(__dirname, 'validate-budget-configuration.ts')

    // Execute the budget validation script
    const output = execSync(`npx tsx ${scriptPath} ${stage}`, {
      encoding: 'utf8',
      timeout: 30000, // 30 second timeout
    })

    const duration = Date.now() - startTime

    return {
      test: 'Budget Configuration Validation',
      status: 'PASS',
      message: 'Budget validation completed successfully',
      duration,
      details: {
        output: output.trim(),
      },
    }
  } catch (error) {
    const duration = Date.now() - startTime

    // Check if it's a validation failure (exit code 1) vs actual error
    if (error instanceof Error && 'status' in error && error.status === 1) {
      return {
        test: 'Budget Configuration Validation',
        status: 'FAIL',
        message: 'Budget validation found configuration issues',
        duration,
        details: {
          output: error.stdout || error.message,
        },
      }
    }

    return {
      test: 'Budget Configuration Validation',
      status: 'FAIL',
      message: `Error running budget validation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration,
    }
  }
}

/**
 * Test dashboard validation
 */
async function testDashboardValidation(stage: string): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const scriptPath = path.join(__dirname, 'validate-dashboard.ts')

    // Execute the dashboard validation script
    const output = execSync(`npx tsx ${scriptPath} ${stage}`, {
      encoding: 'utf8',
      timeout: 30000, // 30 second timeout
    })

    const duration = Date.now() - startTime

    return {
      test: 'Dashboard Validation',
      status: 'PASS',
      message: 'Dashboard validation completed successfully',
      duration,
      details: {
        output: output.trim(),
      },
    }
  } catch (error) {
    const duration = Date.now() - startTime

    // Check if it's a validation failure (exit code 1) vs actual error
    if (error instanceof Error && 'status' in error && error.status === 1) {
      return {
        test: 'Dashboard Validation',
        status: 'FAIL',
        message: 'Dashboard validation found configuration issues',
        duration,
        details: {
          output: error.stdout || error.message,
        },
      }
    }

    return {
      test: 'Dashboard Validation',
      status: 'FAIL',
      message: `Error running dashboard validation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration,
    }
  }
}

/**
 * Print test results
 */
function printResults(results: TestResult[]) {
  console.log('═'.repeat(80))
  console.log('   COST MONITORING INTEGRATION TEST RESULTS')
  console.log('═'.repeat(80))
  console.log()

  let passCount = 0
  let failCount = 0
  let skipCount = 0
  let totalDuration = 0

  for (const result of results) {
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️'

    const duration = result.duration ? ` (${result.duration}ms)` : ''
    console.log(`${statusIcon} ${result.test}: ${result.message}${duration}`)

    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
    }
    console.log()

    if (result.status === 'PASS') passCount++
    else if (result.status === 'FAIL') failCount++
    else skipCount++

    if (result.duration) totalDuration += result.duration
  }

  console.log('─'.repeat(80))
  console.log(`Summary: ${passCount} passed, ${failCount} failed, ${skipCount} skipped`)
  console.log(`Total execution time: ${totalDuration}ms`)
  console.log('─'.repeat(80))

  return { passCount, failCount, skipCount }
}

/**
 * Main execution
 */
async function main() {
  const stage = process.argv[2] || 'dev'

  console.log(`🧪 Running cost monitoring integration tests for stage: ${stage}\n`)

  try {
    // Run all integration tests
    const results = await Promise.all([
      testCostMetricsPublisher(stage),
      testCustomMetrics(stage),
      testCostReportGeneration(stage),
      testBudgetValidation(stage),
      testDashboardValidation(stage),
    ])

    // Print results
    const { passCount, failCount, skipCount } = printResults(results)

    // Exit with appropriate code
    if (failCount > 0) {
      console.log('❌ Integration tests failed! Please fix the issues above.')
      process.exit(1)
    } else if (skipCount > 0) {
      console.log('⚠️  Integration tests completed with some tests skipped.')
      process.exit(0)
    } else {
      console.log('✅ All integration tests passed!')
      process.exit(0)
    }
  } catch (error) {
    console.error('❌ Error during integration testing:', error)
    process.exit(1)
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
