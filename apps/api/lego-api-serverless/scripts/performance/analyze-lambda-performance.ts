/**
 * Lambda Performance Analysis Script
 * Story 3.5: Performance Validation & Optimization
 *
 * Analyzes Lambda cold start times and execution duration to validate
 * that EMF instrumentation adds less than 50ms overhead.
 */

import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  type FilteredLogEvent,
} from '@aws-sdk/client-cloudwatch-logs'

interface LambdaMetrics {
  functionName: string
  coldStarts: number
  warmStarts: number
  avgColdStartDuration: number
  avgWarmStartDuration: number
  p50Duration: number
  p95Duration: number
  p99Duration: number
  maxDuration: number
  minDuration: number
  avgMemoryUsed: number
  maxMemoryUsed: number
  invocations: number
}

interface PerformanceComparison {
  baseline: LambdaMetrics
  instrumented: LambdaMetrics
  coldStartOverhead: number
  warmStartOverhead: number
  p95Overhead: number
  meetsRequirement: boolean
}

const OVERHEAD_THRESHOLD_MS = 50
const LOOKBACK_HOURS = 24

/**
 * Parse Lambda log line for metrics
 */
function parseLambdaMetrics(logEvent: FilteredLogEvent): {
  duration: number
  memoryUsed: number
  isColdStart: boolean
} | null {
  const message = logEvent.message || ''

  // Parse REPORT line: REPORT RequestId: xxx Duration: 123.45 ms Billed Duration: 124 ms Memory Size: 1024 MB Max Memory Used: 128 MB Init Duration: 456.78 ms
  const reportMatch = message.match(
    /REPORT.*Duration: ([\d.]+) ms.*Max Memory Used: ([\d.]+) MB(?:.*Init Duration: ([\d.]+) ms)?/,
  )

  if (reportMatch) {
    const duration = parseFloat(reportMatch[1])
    const memoryUsed = parseFloat(reportMatch[2])
    const isColdStart = !!reportMatch[3] // Has Init Duration = cold start

    return { duration, memoryUsed, isColdStart }
  }

  return null
}

/**
 * Calculate percentile
 */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

/**
 * Fetch and analyze Lambda metrics
 */
async function analyzeLambdaMetrics(
  functionName: string,
  logGroupName: string,
  hoursBack: number = LOOKBACK_HOURS,
): Promise<LambdaMetrics> {
  const client = new CloudWatchLogsClient({})

  const startTime = Date.now() - hoursBack * 60 * 60 * 1000
  const endTime = Date.now()

  console.log(`📊 Analyzing ${functionName} from last ${hoursBack} hours...`)

  const command = new FilterLogEventsCommand({
    logGroupName,
    startTime,
    endTime,
    filterPattern: 'REPORT',
    limit: 10000,
  })

  try {
    const response = await client.send(command)
    const events = response.events || []

    const coldStartDurations: number[] = []
    const warmStartDurations: number[] = []
    const allDurations: number[] = []
    const memoryUsages: number[] = []

    events.forEach(event => {
      const metrics = parseLambdaMetrics(event)
      if (!metrics) return

      allDurations.push(metrics.duration)
      memoryUsages.push(metrics.memoryUsed)

      if (metrics.isColdStart) {
        coldStartDurations.push(metrics.duration)
      } else {
        warmStartDurations.push(metrics.duration)
      }
    })

    const avgColdStart =
      coldStartDurations.length > 0
        ? coldStartDurations.reduce((a, b) => a + b, 0) / coldStartDurations.length
        : 0

    const avgWarmStart =
      warmStartDurations.length > 0
        ? warmStartDurations.reduce((a, b) => a + b, 0) / warmStartDurations.length
        : 0

    return {
      functionName,
      coldStarts: coldStartDurations.length,
      warmStarts: warmStartDurations.length,
      avgColdStartDuration: avgColdStart,
      avgWarmStartDuration: avgWarmStart,
      p50Duration: calculatePercentile(allDurations, 50),
      p95Duration: calculatePercentile(allDurations, 95),
      p99Duration: calculatePercentile(allDurations, 99),
      maxDuration: allDurations.length > 0 ? Math.max(...allDurations) : 0,
      minDuration: allDurations.length > 0 ? Math.min(...allDurations) : 0,
      avgMemoryUsed:
        memoryUsages.length > 0 ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length : 0,
      maxMemoryUsed: memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0,
      invocations: events.length,
    }
  } catch (error) {
    console.error(`❌ Error analyzing ${functionName}:`, error)
    throw error
  }
}

/**
 * Compare baseline vs instrumented performance
 */
function comparePerformance(
  baseline: LambdaMetrics,
  instrumented: LambdaMetrics,
): PerformanceComparison {
  const coldStartOverhead = instrumented.avgColdStartDuration - baseline.avgColdStartDuration
  const warmStartOverhead = instrumented.avgWarmStartDuration - baseline.avgWarmStartDuration
  const p95Overhead = instrumented.p95Duration - baseline.p95Duration

  const meetsRequirement =
    Math.max(coldStartOverhead, warmStartOverhead, p95Overhead) < OVERHEAD_THRESHOLD_MS

  return {
    baseline,
    instrumented,
    coldStartOverhead,
    warmStartOverhead,
    p95Overhead,
    meetsRequirement,
  }
}

/**
 * Print performance report
 */
function printPerformanceReport(metrics: LambdaMetrics): void {
  console.log(`\n📈 ${metrics.functionName} Performance Metrics:`)
  console.log(`  Invocations:      ${metrics.invocations}`)
  console.log(`  Cold Starts:      ${metrics.coldStarts}`)
  console.log(`  Warm Starts:      ${metrics.warmStarts}`)
  console.log(`\n  Duration Metrics:`)
  console.log(`    Avg Cold Start: ${metrics.avgColdStartDuration.toFixed(2)}ms`)
  console.log(`    Avg Warm Start: ${metrics.avgWarmStartDuration.toFixed(2)}ms`)
  console.log(`    P50:            ${metrics.p50Duration.toFixed(2)}ms`)
  console.log(`    P95:            ${metrics.p95Duration.toFixed(2)}ms`)
  console.log(`    P99:            ${metrics.p99Duration.toFixed(2)}ms`)
  console.log(`    Min:            ${metrics.minDuration.toFixed(2)}ms`)
  console.log(`    Max:            ${metrics.maxDuration.toFixed(2)}ms`)
  console.log(`\n  Memory Usage:`)
  console.log(`    Avg:            ${metrics.avgMemoryUsed.toFixed(2)}MB`)
  console.log(`    Max:            ${metrics.maxMemoryUsed.toFixed(2)}MB`)
}

/**
 * Print comparison report
 */
function printComparisonReport(comparison: PerformanceComparison): void {
  console.log('\n━'.repeat(60))
  console.log('📊 Performance Comparison: Baseline vs Instrumented')
  console.log('━'.repeat(60))

  printPerformanceReport(comparison.baseline)
  printPerformanceReport(comparison.instrumented)

  console.log('\n📈 Overhead Analysis:')
  console.log(
    `  Cold Start:     ${comparison.coldStartOverhead > 0 ? '+' : ''}${comparison.coldStartOverhead.toFixed(2)}ms`,
  )
  console.log(
    `  Warm Start:     ${comparison.warmStartOverhead > 0 ? '+' : ''}${comparison.warmStartOverhead.toFixed(2)}ms`,
  )
  console.log(
    `  P95:            ${comparison.p95Overhead > 0 ? '+' : ''}${comparison.p95Overhead.toFixed(2)}ms`,
  )
  console.log(`\n  Threshold:      ${OVERHEAD_THRESHOLD_MS}ms`)
  console.log(`  Status:         ${comparison.meetsRequirement ? '✅ PASS' : '❌ FAIL'}`)

  if (!comparison.meetsRequirement) {
    const maxOverhead = Math.max(
      comparison.coldStartOverhead,
      comparison.warmStartOverhead,
      comparison.p95Overhead,
    )
    console.log(
      `  ⚠️  Max overhead (${maxOverhead.toFixed(2)}ms) exceeds ${OVERHEAD_THRESHOLD_MS}ms threshold`,
    )
  }

  console.log('\n━'.repeat(60))
}

/**
 * Main execution
 */
async function main() {
  try {
    const stage = process.env.STAGE || 'dev'

    // Example: Analyze Web Vitals ingestion function
    console.log('🔍 Analyzing Lambda Performance...\n')

    const webVitalsMetrics = await analyzeLambdaMetrics(
      'WebVitalsIngestion',
      `/aws/lambda/${stage}-web-vitals-ingestion`,
    )

    const errorIngestionMetrics = await analyzeLambdaMetrics(
      'FrontendErrorIngestion',
      `/aws/lambda/${stage}-frontend-error-ingestion`,
    )

    // Print individual reports
    printPerformanceReport(webVitalsMetrics)
    printPerformanceReport(errorIngestionMetrics)

    // Save to JSON
    const report = {
      timestamp: new Date().toISOString(),
      stage,
      webVitals: webVitalsMetrics,
      errorIngestion: errorIngestionMetrics,
    }

    const fs = require('fs')
    const path = require('path')
    const outputDir = path.join(process.cwd(), 'performance-reports')
    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(
      path.join(outputDir, 'lambda-performance.json'),
      JSON.stringify(report, null, 2),
    )

    console.log('\n💾 Performance report saved to performance-reports/lambda-performance.json')

    // Note: For before/after comparison, you would load baseline metrics
    // from a previous run and compare them
    console.log('\n💡 Tip: Save this report as baseline before adding instrumentation,')
    console.log('   then run again after instrumentation to compare performance.')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
