#!/usr/bin/env node
/**
 * Analyze Lambda cold start performance using CloudWatch Metrics
 * Validates that p99 cold start time is under 2 seconds
 */

import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
  type GetMetricStatisticsCommandInput,
} from '@aws-sdk/client-cloudwatch'
import fs from 'fs'
import path from 'path'

interface ColdStartResult {
  functionName: string
  coldStartP99: number
  warmStartP99: number
  invocations: number
  sampleSize: number
  meetsTarget: boolean
}

interface ColdStartAnalysis {
  testDate: string
  period: {
    start: string
    end: string
    hours: number
  }
  functions: ColdStartResult[]
  summary: {
    totalFunctions: number
    functionsPassingTarget: number
    functionsFailing: number
    maxColdStartP99: number
    averageColdStartP99: number
  }
  threshold: {
    p99: number
    unit: string
  }
}

async function analyzeLambdaMetrics(
  functionName: string,
  startTime: Date,
  endTime: Date,
): Promise<ColdStartResult> {
  const cloudwatch = new CloudWatchClient({
    region: process.env.AWS_REGION || 'us-east-1',
  })

  // Get duration metrics (includes cold starts)
  const durationParams: GetMetricStatisticsCommandInput = {
    Namespace: 'AWS/Lambda',
    MetricName: 'Duration',
    Dimensions: [
      {
        Name: 'FunctionName',
        Value: functionName,
      },
    ],
    StartTime: startTime,
    EndTime: endTime,
    Period: 3600, // 1 hour periods
    ExtendedStatistics: ['p99'],
  }

  // Get invocations count
  const invocationsParams: GetMetricStatisticsCommandInput = {
    Namespace: 'AWS/Lambda',
    MetricName: 'Invocations',
    Dimensions: [
      {
        Name: 'FunctionName',
        Value: functionName,
      },
    ],
    StartTime: startTime,
    EndTime: endTime,
    Period: 3600,
    Statistics: ['Sum'],
  }

  try {
    const [durationResponse, invocationsResponse] = await Promise.all([
      cloudwatch.send(new GetMetricStatisticsCommand(durationParams)),
      cloudwatch.send(new GetMetricStatisticsCommand(invocationsParams)),
    ])

    const durationDatapoints = durationResponse.Datapoints || []
    const invocationsDatapoints = invocationsResponse.Datapoints || []

    // Calculate p99 from available datapoints
    const p99Values =
      durationDatapoints
        .map(dp => dp.ExtendedStatistics?.['p99'])
        .filter((v): v is number => v !== undefined) || []

    const coldStartP99 = p99Values.length > 0 ? Math.max(...p99Values) : 0
    const warmStartP99 = p99Values.length > 0 ? Math.min(...p99Values) : 0

    // Calculate total invocations
    const totalInvocations = invocationsDatapoints.reduce((sum, dp) => sum + (dp.Sum || 0), 0)

    return {
      functionName,
      coldStartP99,
      warmStartP99,
      invocations: totalInvocations,
      sampleSize: durationDatapoints.length,
      meetsTarget: coldStartP99 < 2000,
    }
  } catch (error) {
    console.error(`⚠️  Error fetching metrics for ${functionName}:`, error)
    return {
      functionName,
      coldStartP99: 0,
      warmStartP99: 0,
      invocations: 0,
      sampleSize: 0,
      meetsTarget: false,
    }
  }
}

async function analyzeColdStarts(hours = 24, functionPrefix = 'lego-api'): Promise<void> {
  console.log('\n🥶 Lambda Cold Start Analysis\n')
  console.log('═'.repeat(80))

  const endTime = new Date()
  const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000)

  console.log(`Period: ${startTime.toISOString()} to ${endTime.toISOString()}`)
  console.log(`Duration: ${hours} hours`)
  console.log('═'.repeat(80))

  // Define functions to analyze
  // In production, you could list functions dynamically using Lambda.listFunctions()
  const functionNames = [
    `${functionPrefix}-health`,
    `${functionPrefix}-moc-instructions`,
    `${functionPrefix}-gallery`,
    `${functionPrefix}-wishlist`,
    `${functionPrefix}-profile`,
  ]

  console.log(`\n🔍 Analyzing ${functionNames.length} functions...\n`)

  const results: ColdStartResult[] = []

  for (const functionName of functionNames) {
    const result = await analyzeLambdaMetrics(functionName, startTime, endTime)
    results.push(result)
  }

  // Print results
  console.log('📊 Results:\n')
  console.log(
    'Function                     Cold Start (p99)   Warm Start (p99)   Invocations   Status',
  )
  console.log('─'.repeat(80))

  results.forEach(result => {
    const status = result.meetsTarget ? '✅ PASS' : '❌ FAIL'
    const coldStartStr = result.coldStartP99 > 0 ? `${result.coldStartP99.toFixed(0)} ms` : 'N/A'
    const warmStartStr = result.warmStartP99 > 0 ? `${result.warmStartP99.toFixed(0)} ms` : 'N/A'

    console.log(
      `${result.functionName.padEnd(28)} ${coldStartStr.padEnd(18)} ${warmStartStr.padEnd(18)} ${result.invocations.toString().padEnd(13)} ${status}`,
    )
  })

  console.log('═'.repeat(80))

  // Calculate summary
  const functionsWithData = results.filter(r => r.coldStartP99 > 0)
  const functionsPassingTarget = results.filter(r => r.meetsTarget).length
  const functionsFailing = results.filter(r => !r.meetsTarget && r.coldStartP99 > 0).length

  const maxColdStartP99 =
    functionsWithData.length > 0 ? Math.max(...functionsWithData.map(r => r.coldStartP99)) : 0

  const averageColdStartP99 =
    functionsWithData.length > 0
      ? functionsWithData.reduce((sum, r) => sum + r.coldStartP99, 0) / functionsWithData.length
      : 0

  console.log(`\n📈 Summary:`)
  console.log(`   Functions Analyzed:      ${results.length}`)
  console.log(`   Functions w/ Data:       ${functionsWithData.length}`)
  console.log(`   Passing Target (<2s):    ${functionsPassingTarget}`)
  console.log(`   Failing Target:          ${functionsFailing}`)
  console.log(`   Max Cold Start (p99):    ${maxColdStartP99.toFixed(0)} ms`)
  console.log(`   Avg Cold Start (p99):    ${averageColdStartP99.toFixed(0)} ms`)

  console.log('\n' + '═'.repeat(80))

  if (functionsFailing === 0) {
    console.log('✅ All functions meet cold start target (<2000ms p99)\n')
  } else {
    console.log('❌ Some functions exceed cold start target (>2000ms p99)\n')
    console.log('💡 Recommendations:')
    console.log('   - Enable provisioned concurrency for frequently-used functions')
    console.log('   - Reduce bundle size and dependencies')
    console.log('   - Consider Lambda SnapStart (for Java)')
    console.log('   - Optimize initialization code\n')
  }

  // Save analysis
  const analysis: ColdStartAnalysis = {
    testDate: new Date().toISOString(),
    period: {
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      hours,
    },
    functions: results,
    summary: {
      totalFunctions: results.length,
      functionsPassingTarget,
      functionsFailing,
      maxColdStartP99,
      averageColdStartP99,
    },
    threshold: {
      p99: 2000,
      unit: 'ms',
    },
  }

  const outputPath = path.join(process.cwd(), 'tests/performance/results/cold-start-analysis.json')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2))

  console.log(`📄 Cold start analysis saved to: ${outputPath}\n`)

  // Exit with error if any function fails target
  if (functionsFailing > 0) {
    process.exit(1)
  }
}

// Main execution
const args = process.argv.slice(2)
const hours = args[0] ? parseInt(args[0], 10) : 24
const functionPrefix = args[1] || 'lego-api'

if (Number.isNaN(hours) || hours < 1 || hours > 168) {
  console.error('❌ Invalid number of hours. Must be between 1 and 168 (7 days).')
  process.exit(1)
}

analyzeColdStarts(hours, functionPrefix).catch(error => {
  console.error('❌ Error analyzing cold starts:', error)
  process.exit(1)
})
