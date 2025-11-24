#!/usr/bin/env node
/**
 * Compare current performance metrics with ECS baseline
 * Shows improvements/regressions and percentage changes
 */

import fs from 'fs'
import path from 'path'

interface Metrics {
  testDate: string
  environment: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  requestRate: number
  responseTime: {
    min?: number
    max?: number
    mean?: number
    median: number
    p95: number
    p99: number
  }
  errorRate: number
  successRate: number
  cacheHitRate: number | null
  coldStarts?: number | null
}

interface Comparison {
  metric: string
  baseline: number
  current: number
  change: number
  changePercent: number
  unit: string
  improved: boolean | null
  lowerIsBetter: boolean
}

function formatChange(change: number, changePercent: number, lowerIsBetter: boolean): string {
  const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→'
  const color =
    change === 0 ? '' : lowerIsBetter ? (change < 0 ? '✅' : '⚠️ ') : change > 0 ? '✅' : '⚠️ '

  const sign = change > 0 ? '+' : ''
  return `${color} ${arrow} ${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(1)}%)`
}

function compareBaselines(currentPath: string, baselinePath: string): void {
  // Read files
  if (!fs.existsSync(currentPath)) {
    console.error(`❌ Error: Current metrics file not found at ${currentPath}`)
    process.exit(1)
  }

  if (!fs.existsSync(baselinePath)) {
    console.error(`❌ Error: Baseline metrics file not found at ${baselinePath}`)
    process.exit(1)
  }

  const current: Metrics = JSON.parse(fs.readFileSync(currentPath, 'utf-8'))
  const baseline: Metrics = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'))

  // Build comparisons
  const comparisons: Comparison[] = [
    {
      metric: 'Response Time (p95)',
      baseline: baseline.responseTime.p95,
      current: current.responseTime.p95,
      change: current.responseTime.p95 - baseline.responseTime.p95,
      changePercent:
        ((current.responseTime.p95 - baseline.responseTime.p95) / baseline.responseTime.p95) * 100,
      unit: 'ms',
      improved: current.responseTime.p95 < baseline.responseTime.p95,
      lowerIsBetter: true,
    },
    {
      metric: 'Response Time (p99)',
      baseline: baseline.responseTime.p99,
      current: current.responseTime.p99,
      change: current.responseTime.p99 - baseline.responseTime.p99,
      changePercent:
        ((current.responseTime.p99 - baseline.responseTime.p99) / baseline.responseTime.p99) * 100,
      unit: 'ms',
      improved: current.responseTime.p99 < baseline.responseTime.p99,
      lowerIsBetter: true,
    },
    {
      metric: 'Response Time (Median)',
      baseline: baseline.responseTime.median,
      current: current.responseTime.median,
      change: current.responseTime.median - baseline.responseTime.median,
      changePercent:
        ((current.responseTime.median - baseline.responseTime.median) /
          baseline.responseTime.median) *
        100,
      unit: 'ms',
      improved: current.responseTime.median < baseline.responseTime.median,
      lowerIsBetter: true,
    },
    {
      metric: 'Throughput',
      baseline: baseline.requestRate,
      current: current.requestRate,
      change: current.requestRate - baseline.requestRate,
      changePercent: ((current.requestRate - baseline.requestRate) / baseline.requestRate) * 100,
      unit: 'req/sec',
      improved: current.requestRate > baseline.requestRate,
      lowerIsBetter: false,
    },
    {
      metric: 'Error Rate',
      baseline: baseline.errorRate,
      current: current.errorRate,
      change: current.errorRate - baseline.errorRate,
      changePercent: ((current.errorRate - baseline.errorRate) / baseline.errorRate) * 100,
      unit: '%',
      improved: current.errorRate < baseline.errorRate,
      lowerIsBetter: true,
    },
    {
      metric: 'Success Rate',
      baseline: baseline.successRate,
      current: current.successRate,
      change: current.successRate - baseline.successRate,
      changePercent: ((current.successRate - baseline.successRate) / baseline.successRate) * 100,
      unit: '%',
      improved: current.successRate > baseline.successRate,
      lowerIsBetter: false,
    },
  ]

  // Add cache hit rate if both have it
  if (baseline.cacheHitRate !== null && current.cacheHitRate !== null) {
    comparisons.push({
      metric: 'Cache Hit Rate',
      baseline: baseline.cacheHitRate,
      current: current.cacheHitRate,
      change: current.cacheHitRate - baseline.cacheHitRate,
      changePercent: ((current.cacheHitRate - baseline.cacheHitRate) / baseline.cacheHitRate) * 100,
      unit: '%',
      improved: current.cacheHitRate > baseline.cacheHitRate,
      lowerIsBetter: false,
    })
  }

  // Print comparison
  console.log('\n📊 Performance Comparison: SST vs ECS Baseline\n')
  console.log('═'.repeat(90))
  console.log(
    'Metric                    Baseline       Current        Change                    Status',
  )
  console.log('═'.repeat(90))

  let improvements = 0
  let regressions = 0
  let neutral = 0

  comparisons.forEach(comp => {
    const baselineStr = `${comp.baseline.toFixed(2)} ${comp.unit}`
    const currentStr = `${comp.current.toFixed(2)} ${comp.unit}`
    const changeStr = formatChange(comp.change, comp.changePercent, comp.lowerIsBetter)

    console.log(
      `${comp.metric.padEnd(25)} ${baselineStr.padEnd(14)} ${currentStr.padEnd(14)} ${changeStr.padEnd(25)}`,
    )

    if (comp.improved === true) improvements++
    else if (comp.improved === false) regressions++
    else neutral++
  })

  console.log('═'.repeat(90))

  // Summary
  console.log(`\n📈 Summary:`)
  console.log(`   Improvements: ${improvements}`)
  console.log(`   Regressions:  ${regressions}`)
  console.log(`   Neutral:      ${neutral}`)

  // Overall assessment
  if (regressions === 0) {
    console.log('\n✅ Performance meets or exceeds ECS baseline!')
  } else if (regressions > improvements) {
    console.log('\n⚠️  Warning: Performance has regressed compared to ECS baseline')
  } else {
    console.log('\n✅ Overall performance is better than ECS baseline')
  }

  // Environment info
  console.log('\n📋 Test Information:')
  console.log(
    `   Baseline:  ${baseline.environment} (${new Date(baseline.testDate).toLocaleDateString()})`,
  )
  console.log(
    `   Current:   ${current.environment} (${new Date(current.testDate).toLocaleDateString()})`,
  )
  console.log('')

  // Save comparison report
  const reportPath = path.join(path.dirname(currentPath), 'comparison-report.json')
  const report = {
    baseline: {
      environment: baseline.environment,
      testDate: baseline.testDate,
    },
    current: {
      environment: current.environment,
      testDate: current.testDate,
    },
    comparisons,
    summary: {
      improvements,
      regressions,
      neutral,
    },
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`📄 Comparison report saved to: ${reportPath}\n`)
}

// Main execution
const args = process.argv.slice(2)

if (args.length < 2) {
  console.error('Usage: compare-baselines.ts <current-metrics.json> <baseline-metrics.json>')
  console.error('Example: compare-baselines.ts results/metrics.json baselines/ecs-baseline.json')
  process.exit(1)
}

const currentPath = path.resolve(args[0])
const baselinePath = path.resolve(args[1])

compareBaselines(currentPath, baselinePath)
