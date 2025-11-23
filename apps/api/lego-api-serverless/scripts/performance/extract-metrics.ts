#!/usr/bin/env node
/**
 * Extract key metrics from Artillery JSON report
 * Outputs simplified metrics for validation and comparison
 */

import fs from 'fs'
import path from 'path'

interface ArtilleryReport {
  aggregate: {
    counters: {
      'http.requests': number
      'http.responses': number
      'http.codes.200'?: number
      'http.codes.201'?: number
      'http.codes.400'?: number
      'http.codes.401'?: number
      'http.codes.403'?: number
      'http.codes.404'?: number
      'http.codes.500'?: number
      'http.codes.502'?: number
      'http.codes.503'?: number
      'cache.hit'?: number
      'cache.miss'?: number
      'lambda.cold_start'?: number
    }
    rates: {
      'http.request_rate': number
    }
    summaries: {
      'http.response_time': {
        min: number
        max: number
        mean: number
        median: number
        p95: number
        p99: number
      }
    }
  }
}

interface ExtractedMetrics {
  testDate: string
  environment: string
  totalRequests: number
  totalResponses: number
  successfulRequests: number
  failedRequests: number
  requestRate: number
  responseTime: {
    min: number
    max: number
    mean: number
    median: number
    p95: number
    p99: number
  }
  errorRate: number
  cacheHitRate: number | null
  coldStarts: number | null
  successRate: number
}

function extractMetrics(reportPath: string, outputPath: string): void {
  // Read Artillery report
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ Error: Report file not found at ${reportPath}`)
    process.exit(1)
  }

  const reportContent = fs.readFileSync(reportPath, 'utf-8')
  const report: ArtilleryReport = JSON.parse(reportContent)

  // Extract counters
  const counters = report.aggregate.counters
  const totalRequests = counters['http.requests'] || 0
  const totalResponses = counters['http.responses'] || 0

  // Calculate successful requests (2xx status codes)
  const successfulRequests = (counters['http.codes.200'] || 0) + (counters['http.codes.201'] || 0)

  // Calculate failed requests (5xx status codes)
  const failedRequests =
    (counters['http.codes.500'] || 0) +
    (counters['http.codes.502'] || 0) +
    (counters['http.codes.503'] || 0)

  // Calculate rates
  const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0

  // Calculate cache hit rate
  const cacheHits = counters['cache.hit'] || 0
  const cacheMisses = counters['cache.miss'] || 0
  const totalCacheOps = cacheHits + cacheMisses
  const cacheHitRate = totalCacheOps > 0 ? (cacheHits / totalCacheOps) * 100 : null

  // Get cold starts
  const coldStarts = counters['lambda.cold_start'] || null

  // Extract metrics
  const metrics: ExtractedMetrics = {
    testDate: new Date().toISOString(),
    environment: process.env.ENVIRONMENT || 'SST Production',
    totalRequests,
    totalResponses,
    successfulRequests,
    failedRequests,
    requestRate: report.aggregate.rates['http.request_rate'] || 0,
    responseTime: {
      min: report.aggregate.summaries['http.response_time'].min,
      max: report.aggregate.summaries['http.response_time'].max,
      mean: report.aggregate.summaries['http.response_time'].mean,
      median: report.aggregate.summaries['http.response_time'].median,
      p95: report.aggregate.summaries['http.response_time'].p95,
      p99: report.aggregate.summaries['http.response_time'].p99,
    },
    errorRate,
    cacheHitRate,
    coldStarts,
    successRate,
  }

  // Write metrics to output file
  fs.writeFileSync(outputPath, JSON.stringify(metrics, null, 2))

  // Print summary
  console.log('\n📊 Extracted Metrics Summary\n')
  console.log('═'.repeat(60))
  console.log(`Test Date:           ${metrics.testDate}`)
  console.log(`Environment:         ${metrics.environment}`)
  console.log('═'.repeat(60))
  console.log('\n📈 Request Statistics')
  console.log(`Total Requests:      ${metrics.totalRequests.toLocaleString()}`)
  console.log(`Successful Requests: ${metrics.successfulRequests.toLocaleString()} (${metrics.successRate.toFixed(2)}%)`)
  console.log(`Failed Requests:     ${metrics.failedRequests.toLocaleString()} (${metrics.errorRate.toFixed(2)}%)`)
  console.log(`Request Rate:        ${metrics.requestRate.toFixed(2)} req/sec`)

  console.log('\n⏱️  Response Time Percentiles')
  console.log(`Min:                 ${metrics.responseTime.min.toFixed(2)} ms`)
  console.log(`Mean:                ${metrics.responseTime.mean.toFixed(2)} ms`)
  console.log(`Median (p50):        ${metrics.responseTime.median.toFixed(2)} ms`)
  console.log(`p95:                 ${metrics.responseTime.p95.toFixed(2)} ms`)
  console.log(`p99:                 ${metrics.responseTime.p99.toFixed(2)} ms`)
  console.log(`Max:                 ${metrics.responseTime.max.toFixed(2)} ms`)

  if (metrics.cacheHitRate !== null) {
    console.log('\n💾 Cache Performance')
    console.log(`Cache Hit Rate:      ${metrics.cacheHitRate.toFixed(2)}%`)
  }

  if (metrics.coldStarts !== null) {
    console.log('\n🥶 Lambda Cold Starts')
    console.log(`Total Cold Starts:   ${metrics.coldStarts}`)
  }

  console.log('\n═'.repeat(60))
  console.log(`✅ Metrics saved to: ${outputPath}`)
  console.log('═'.repeat(60) + '\n')
}

// Main execution
const args = process.argv.slice(2)

if (args.length < 1) {
  console.error('Usage: extract-metrics.ts <artillery-report.json> [output-path]')
  console.error('Example: extract-metrics.ts results/artillery-report.json results/metrics.json')
  process.exit(1)
}

const reportPath = path.resolve(args[0])
const outputPath = args[1]
  ? path.resolve(args[1])
  : path.join(path.dirname(reportPath), 'metrics.json')

extractMetrics(reportPath, outputPath)
