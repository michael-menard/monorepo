#!/usr/bin/env node
/**
 * Validate performance metrics against defined thresholds
 * Exits with code 1 if any threshold is not met
 */

import fs from 'fs'
import path from 'path'

interface Metrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  requestRate: number
  responseTime: {
    p95: number
    p99: number
    median: number
  }
  errorRate: number
  cacheHitRate: number | null
  successRate: number
}

interface Threshold {
  name: string
  value: number
  threshold: number
  comparator: '<' | '>' | '<=' | '>='
  unit: string
  pass: boolean
  critical: boolean
}

function validateThresholds(metricsPath: string): boolean {
  // Read metrics file
  if (!fs.existsSync(metricsPath)) {
    console.error(`❌ Error: Metrics file not found at ${metricsPath}`)
    process.exit(1)
  }

  const metricsContent = fs.readFileSync(metricsPath, 'utf-8')
  const metrics: Metrics = JSON.parse(metricsContent)

  // Define thresholds based on acceptance criteria
  const thresholds: Threshold[] = [
    {
      name: 'Response Time (p95)',
      value: metrics.responseTime.p95,
      threshold: 500,
      comparator: '<',
      unit: 'ms',
      pass: metrics.responseTime.p95 < 500,
      critical: true,
    },
    {
      name: 'Response Time (p99) / Cold Start',
      value: metrics.responseTime.p99,
      threshold: 2000,
      comparator: '<',
      unit: 'ms',
      pass: metrics.responseTime.p99 < 2000,
      critical: true,
    },
    {
      name: 'API Throughput',
      value: metrics.requestRate,
      threshold: 100,
      comparator: '>',
      unit: 'req/sec',
      pass: metrics.requestRate > 100,
      critical: true,
    },
    {
      name: 'Error Rate',
      value: metrics.errorRate,
      threshold: 1,
      comparator: '<',
      unit: '%',
      pass: metrics.errorRate < 1,
      critical: true,
    },
    {
      name: 'Success Rate',
      value: metrics.successRate,
      threshold: 99,
      comparator: '>',
      unit: '%',
      pass: metrics.successRate > 99,
      critical: true,
    },
  ]

  // Add cache hit rate threshold if available
  if (metrics.cacheHitRate !== null) {
    thresholds.push({
      name: 'Redis Cache Hit Rate',
      value: metrics.cacheHitRate,
      threshold: 80,
      comparator: '>',
      unit: '%',
      pass: metrics.cacheHitRate > 80,
      critical: false,
    })
  }

  // Print header
  console.log('\n🔍 Threshold Validation\n')
  console.log('═'.repeat(80))
  console.log('Metric                              Value        Threshold   Status      Critical')
  console.log('═'.repeat(80))

  let allPassed = true
  let criticalFailures = 0

  // Validate each threshold
  thresholds.forEach(threshold => {
    const status = threshold.pass ? '✅ PASS' : '❌ FAIL'
    const criticalMark = threshold.critical ? '⚠️  YES' : '    NO'

    const valueStr = `${threshold.value.toFixed(2)} ${threshold.unit}`
    const thresholdStr = `${threshold.comparator} ${threshold.threshold} ${threshold.unit}`

    console.log(
      `${threshold.name.padEnd(35)} ${valueStr.padEnd(12)} ${thresholdStr.padEnd(11)} ${status.padEnd(11)} ${criticalMark}`,
    )

    if (!threshold.pass) {
      allPassed = false
      if (threshold.critical) {
        criticalFailures++
      }
    }
  })

  console.log('═'.repeat(80))

  // Summary
  const passedCount = thresholds.filter(t => t.pass).length
  const totalCount = thresholds.length

  console.log(`\n📊 Summary: ${passedCount}/${totalCount} thresholds passed`)

  if (criticalFailures > 0) {
    console.log(`\n❌ CRITICAL: ${criticalFailures} critical threshold(s) failed!`)
  }

  if (!allPassed) {
    console.log('\n❌ Validation FAILED: One or more thresholds not met.')
    console.log('\n💡 Recommendations:')

    if (metrics.responseTime.p95 >= 500) {
      console.log('   - Optimize Lambda memory allocation')
      console.log('   - Review database query performance and indexes')
      console.log('   - Check for N+1 query problems')
    }

    if (metrics.requestRate <= 100) {
      console.log('   - Check Lambda concurrency limits')
      console.log('   - Review API Gateway throttling settings')
      console.log('   - Verify RDS connection pool configuration')
    }

    if (metrics.errorRate >= 1) {
      console.log('   - Review application logs for error patterns')
      console.log('   - Check database connection exhaustion')
      console.log('   - Verify timeout configurations')
    }

    if (metrics.cacheHitRate !== null && metrics.cacheHitRate <= 80) {
      console.log('   - Review cache invalidation strategy')
      console.log('   - Increase cache TTL if appropriate')
      console.log('   - Verify Redis connection configuration')
    }

    console.log('')
    return false
  }

  console.log('\n✅ Validation PASSED: All thresholds met!')
  console.log('')
  return true
}

// Main execution
const args = process.argv.slice(2)

if (args.length < 1) {
  console.error('Usage: validate-thresholds.ts <metrics.json>')
  console.error('Example: validate-thresholds.ts results/metrics.json')
  process.exit(1)
}

const metricsPath = path.resolve(args[0])
const passed = validateThresholds(metricsPath)

process.exit(passed ? 0 : 1)
