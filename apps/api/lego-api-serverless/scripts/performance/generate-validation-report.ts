#!/usr/bin/env node
/**
 * Generate comprehensive validation report in Markdown format
 * Combines all analysis results into a single report
 */

import fs from 'fs'
import path from 'path'

interface Metrics {
  environment: string
  responseTime: {
    p95: number
    p99: number
  }
  requestRate: number
  errorRate: number
  successRate: number
  cacheHitRate: number | null
}

interface CostAnalysis {
  comparison: {
    meetsTarget: boolean
    savings: number
    savingsPercent: number
  }
  monthlyProjection: number
  baseline: {
    monthlyCost: number
  }
}

interface ColdStartAnalysis {
  summary: {
    functionsFailing: number
    functionsPassingTarget: number
    totalFunctions: number
    maxColdStartP99: number
  }
  functions: Array<{
    functionName: string
    coldStartP99: number
    meetsTarget: boolean
  }>
}

interface Comparison {
  baseline: {
    environment: string
    testDate: string
  }
  comparisons: Array<{
    metric: string
    baseline: number
    current: number
    change: number
    changePercent: number
    improved: boolean
    unit: string
    lowerIsBetter: boolean
  }>
}

function loadJson(filePath: string): unknown | null {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }
  } catch (error) {
    console.warn(`⚠️  Could not load ${filePath}:`, error)
  }
  return null
}

function generateReport(resultsDir: string, outputPath: string): void {
  const metricsPath = path.join(resultsDir, 'metrics.json')
  const comparisonPath = path.join(resultsDir, 'comparison-report.json')
  const costPath = path.join(resultsDir, 'cost-analysis.json')
  const coldStartPath = path.join(resultsDir, 'cold-start-analysis.json')

  // Load all data
  const metrics = loadJson(metricsPath) as Metrics | null
  const comparison = loadJson(comparisonPath) as Comparison | null
  const cost = loadJson(costPath) as CostAnalysis | null
  const coldStart = loadJson(coldStartPath) as ColdStartAnalysis | null

  if (!metrics) {
    console.error('❌ Error: metrics.json not found. Run performance tests first.')
    process.exit(1)
  }

  // Build report
  let markdown = '# LEGO API SST Migration - Performance & Cost Validation Report\n\n'
  markdown += `**Date**: ${new Date().toLocaleDateString()}\n`
  markdown += '**Performed By**: Automated Performance Validation Suite\n'
  markdown += `**Environment**: ${metrics.environment}\n`
  markdown += '\n---\n\n'

  // Executive Summary
  const performancePassed =
    metrics.responseTime.p95 < 500 &&
    metrics.responseTime.p99 < 2000 &&
    metrics.requestRate > 100 &&
    metrics.errorRate < 1

  const costPassed = cost ? cost.comparison.meetsTarget : null
  const coldStartPassed = coldStart ? coldStart.summary.functionsFailing === 0 : null

  const allPassed =
    performancePassed && (costPassed === null || costPassed) && (coldStartPassed === null || coldStartPassed)

  markdown += '## Executive Summary\n\n'
  markdown += allPassed ? '✅ **VALIDATION PASSED**: All performance and cost targets met.\n\n' : '⚠️  **VALIDATION INCOMPLETE OR FAILED**: Review details below.\n\n'

  markdown += 'The SST migration delivers:\n'
  markdown += `- **Response time p95**: ${metrics.responseTime.p95.toFixed(0)}ms ${metrics.responseTime.p95 < 500 ? '(✅ within 500ms target)' : '(❌ exceeds 500ms target)'}\n`
  markdown += `- **Throughput**: ${metrics.requestRate.toFixed(0)} req/sec ${metrics.requestRate > 100 ? '(✅ exceeds 100 req/sec target)' : '(❌ below 100 req/sec target)'}\n`
  markdown += `- **Error Rate**: ${metrics.errorRate.toFixed(2)}% ${metrics.errorRate < 1 ? '(✅ under 1% target)' : '(❌ exceeds 1% target)'}\n`

  if (cost) {
    const savingsPercent = cost.comparison.savingsPercent
    markdown += `- **Cost ${cost.comparison.meetsTarget ? 'reduction' : 'increase'}**: ${Math.abs(savingsPercent).toFixed(1)}% compared to ECS baseline ${cost.comparison.meetsTarget ? '✅' : '❌'}\n`
  }

  if (coldStart) {
    markdown += `- **Cold starts p99**: ${coldStart.summary.maxColdStartP99.toFixed(0)}ms ${coldStart.summary.maxColdStartP99 < 2000 ? '(✅ within 2s target)' : '(❌ exceeds 2s target)'}\n`
  }

  markdown += '\n---\n\n'

  // Performance Metrics
  markdown += '## Performance Metrics\n\n'
  markdown += '| Metric | Value | Target | Status |\n'
  markdown += '|--------|-------|--------|--------|\n'
  markdown += `| Response Time (p95) | ${metrics.responseTime.p95.toFixed(0)}ms | <500ms | ${metrics.responseTime.p95 < 500 ? '✅ PASS' : '❌ FAIL'} |\n`
  markdown += `| Response Time (p99) | ${metrics.responseTime.p99.toFixed(0)}ms | <2000ms | ${metrics.responseTime.p99 < 2000 ? '✅ PASS' : '❌ FAIL'} |\n`
  markdown += `| Throughput | ${metrics.requestRate.toFixed(0)} req/sec | >100 req/sec | ${metrics.requestRate > 100 ? '✅ PASS' : '❌ FAIL'} |\n`
  markdown += `| Error Rate | ${metrics.errorRate.toFixed(2)}% | <1% | ${metrics.errorRate < 1 ? '✅ PASS' : '❌ FAIL'} |\n`
  markdown += `| Success Rate | ${metrics.successRate.toFixed(2)}% | >99% | ${metrics.successRate > 99 ? '✅ PASS' : '❌ FAIL'} |\n`

  if (metrics.cacheHitRate !== null) {
    markdown += `| Cache Hit Rate | ${metrics.cacheHitRate.toFixed(1)}% | >80% | ${metrics.cacheHitRate > 80 ? '✅ PASS' : '❌ FAIL'} |\n`
  }

  markdown += '\n---\n\n'

  // Cost Analysis
  if (cost && 'costs' in cost && typeof cost.costs === 'object') {
    markdown += '## Cost Analysis\n\n'
    markdown += '| Service | Monthly Cost |\n'
    markdown += '|---------|-------------|\n'
    Object.entries(cost.costs as Record<string, number>).forEach(([service, amount]) => {
      markdown += `| ${service} | $${amount.toFixed(2)} |\n`
    })
    markdown += `| **Total** | **$${cost.monthlyProjection.toFixed(2)}** |\n\n`

    markdown += `**ECS Baseline**: $${cost.baseline.monthlyCost.toFixed(2)}/month\n`
    markdown += `**SST Projection**: $${cost.monthlyProjection.toFixed(2)}/month\n`
    markdown += `**${cost.comparison.savings >= 0 ? 'Savings' : 'Increase'}**: $${Math.abs(cost.comparison.savings).toFixed(2)}/month (${cost.comparison.savings >= 0 ? '-' : '+'}${Math.abs(cost.comparison.savingsPercent).toFixed(1)}%)\n\n`

    markdown += cost.comparison.meetsTarget
      ? '✅ **Cost Target Met**: SST ≤ ECS Baseline\n\n'
      : '❌ **Cost Target NOT Met**: SST > ECS Baseline\n\n'

    markdown += '---\n\n'
  }

  // Cold Start Analysis
  if (coldStart) {
    markdown += '## Lambda Cold Start Analysis\n\n'
    markdown += '| Function | Cold Start (p99) | Status |\n'
    markdown += '|----------|------------------|--------|\n'

    coldStart.functions.forEach((func) => {
      const coldStartMs = func.coldStartP99 > 0 ? `${func.coldStartP99.toFixed(0)}ms` : 'N/A'
      const status = func.meetsTarget ? '✅ PASS' : func.coldStartP99 > 0 ? '❌ FAIL' : '⚠️  No Data'
      markdown += `| ${func.functionName} | ${coldStartMs} | ${status} |\n`
    })

    markdown += '\n'
    markdown += `**Summary**: ${coldStart.summary.functionsPassingTarget}/${coldStart.summary.totalFunctions} functions meet target (<2000ms p99)\n\n`

    markdown += coldStart.summary.functionsFailing === 0
      ? '✅ All functions meet cold start target\n\n'
      : `⚠️  ${coldStart.summary.functionsFailing} function(s) exceed cold start target\n\n`

    markdown += '---\n\n'
  }

  // Load Testing Results
  if (comparison) {
    markdown += '## Performance Comparison (SST vs ECS)\n\n'
    markdown += '| Metric | ECS Baseline | SST Current | Change | Status |\n'
    markdown += '|--------|--------------|-------------|--------|--------|\n'

    comparison.comparisons.forEach((comp) => {
      const changeStr = `${comp.change >= 0 ? '+' : ''}${comp.change.toFixed(1)} (${comp.changePercent >= 0 ? '+' : ''}${comp.changePercent.toFixed(1)}%)`
      const status = comp.improved ? '✅ Improved' : comp.improved === false ? '⚠️  Regression' : '→ Neutral'
      markdown += `| ${comp.metric} | ${comp.baseline.toFixed(1)} ${comp.unit} | ${comp.current.toFixed(1)} ${comp.unit} | ${changeStr} | ${status} |\n`
    })

    markdown += '\n---\n\n'
  }

  // Recommendations
  markdown += '## Recommendations\n\n'

  const recommendations: string[] = []

  if (performancePassed && (costPassed === null || costPassed) && (coldStartPassed === null || coldStartPassed)) {
    recommendations.push('✅ **Proceed with ECS Decommission**: All performance and cost targets met.')
  }

  if (metrics.responseTime.p95 >= 450) {
    recommendations.push('⚠️  Response time approaching limit - monitor closely')
  }

  if (metrics.cacheHitRate !== null && metrics.cacheHitRate < 85) {
    recommendations.push('📈 Cache hit rate could be improved - review caching strategy')
  }

  if (coldStart && coldStart.summary.maxColdStartP99 > 1500) {
    recommendations.push('🥶 Consider provisioned concurrency for functions with high cold start times')
  }

  if (cost && cost.monthlyProjection > cost.baseline.monthlyCost * 0.9) {
    recommendations.push('💰 Monitor costs closely - approaching ECS baseline')
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ No issues identified - system performing optimally')
  }

  recommendations.forEach((rec) => {
    markdown += `${rec}\n`
  })

  markdown += '\n---\n\n'

  // Approval Section
  markdown += '## Approval\n\n'
  markdown += '- [ ] DevOps Lead\n'
  markdown += '- [ ] Engineering Manager\n'
  markdown += '- [ ] Product Owner\n\n'
  markdown += '**Approved on**: ___________\n'

  // Write report
  fs.writeFileSync(outputPath, markdown)

  console.log('\n📄 Validation Report Generated\n')
  console.log('═'.repeat(70))
  console.log(`Report saved to: ${outputPath}`)
  console.log('═'.repeat(70))
  console.log('')
  console.log('📋 Summary:')
  console.log(`   Performance:  ${performancePassed ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`   Cost:         ${costPassed === null ? '⚠️  SKIPPED' : costPassed ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`   Cold Starts:  ${coldStartPassed === null ? '⚠️  SKIPPED' : coldStartPassed ? '✅ PASSED' : '❌ FAILED'}`)
  console.log('')
}

// Main execution
const args = process.argv.slice(2)

if (args.length < 1) {
  console.error('Usage: generate-validation-report.ts <results-dir> [output-path]')
  console.error('Example: generate-validation-report.ts tests/performance/results')
  process.exit(1)
}

const resultsDir = path.resolve(args[0])
const outputPath = args[1]
  ? path.resolve(args[1])
  : path.join(resultsDir, 'validation-report.md')

generateReport(resultsDir, outputPath)
