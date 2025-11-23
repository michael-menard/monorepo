#!/usr/bin/env node
/**
 * Analyze AWS costs using Cost Explorer API
 * Compares SST deployment costs with ECS baseline
 */

import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  type GetCostAndUsageCommandInput,
} from '@aws-sdk/client-cost-explorer'
import fs from 'fs'
import path from 'path'

interface CostBreakdown {
  Lambda?: number
  'API Gateway'?: number
  RDS?: number
  ElastiCache?: number
  OpenSearch?: number
  S3?: number
  CloudWatch?: number
  'VPC NAT Gateway'?: number
  Other?: number
}

interface CostAnalysis {
  testDate: string
  period: {
    start: string
    end: string
    days: number
  }
  costs: CostBreakdown
  totalCost: number
  monthlyProjection: number
  baseline: {
    monthlyCost: number
    source: string
  }
  comparison: {
    savings: number
    savingsPercent: number
    meetsTarget: boolean
  }
}

async function getSSTCost(
  startDate: string,
  endDate: string,
  projectTag = 'lego-api-sst'
): Promise<{ costs: CostBreakdown; totalCost: number }> {
  const costExplorer = new CostExplorerClient({
    region: process.env.AWS_REGION || 'us-east-1',
  })

  const params: GetCostAndUsageCommandInput = {
    TimePeriod: {
      Start: startDate,
      End: endDate,
    },
    Granularity: 'MONTHLY',
    Metrics: ['UnblendedCost'],
    GroupBy: [
      {
        Type: 'DIMENSION',
        Key: 'SERVICE',
      },
    ],
  }

  // Add tag filter if project tag is specified
  if (projectTag) {
    params.Filter = {
      Tags: {
        Key: 'Project',
        Values: [projectTag],
      },
    }
  }

  try {
    const response = await costExplorer.send(new GetCostAndUsageCommand(params))

    const costs: CostBreakdown = {}
    let totalCost = 0

    response.ResultsByTime?.forEach((result) => {
      result.Groups?.forEach((group) => {
        const service = group.Keys?.[0] || 'Unknown'
        const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0')

        // Map AWS service names to friendly names
        let friendlyName = service
        if (service.includes('Lambda')) friendlyName = 'Lambda'
        else if (service.includes('API Gateway')) friendlyName = 'API Gateway'
        else if (service.includes('Relational Database')) friendlyName = 'RDS'
        else if (service.includes('ElastiCache')) friendlyName = 'ElastiCache'
        else if (service.includes('OpenSearch') || service.includes('Elasticsearch'))
          friendlyName = 'OpenSearch'
        else if (service.includes('Simple Storage')) friendlyName = 'S3'
        else if (service.includes('CloudWatch')) friendlyName = 'CloudWatch'
        else if (service.includes('NAT Gateway')) friendlyName = 'VPC NAT Gateway'
        else friendlyName = 'Other'

        costs[friendlyName as keyof CostBreakdown] =
          (costs[friendlyName as keyof CostBreakdown] || 0) + cost
        totalCost += cost
      })
    })

    return { costs, totalCost }
  } catch (error) {
    console.error('❌ Error fetching cost data from AWS Cost Explorer:', error)
    throw error
  }
}

async function analyzeCosts(days = 7, baselinePath?: string): Promise<void> {
  // Calculate date range
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)

  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  console.log('\n💰 AWS Cost Analysis\n')
  console.log('═'.repeat(70))
  console.log(`Period: ${startDateStr} to ${endDateStr} (${days} days)`)
  console.log('═'.repeat(70))

  // Fetch SST costs
  console.log('\n🔍 Fetching cost data from AWS Cost Explorer...\n')

  const { costs, totalCost } = await getSSTCost(startDateStr, endDateStr)

  // Print cost breakdown
  console.log('📊 Cost Breakdown:\n')
  Object.entries(costs)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .forEach(([service, cost]) => {
      console.log(`   ${service.padEnd(20)} $${(cost || 0).toFixed(2)}`)
    })

  console.log('\n' + '─'.repeat(70))
  console.log(`   ${'Total (' + days + ' days)'.padEnd(20)} $${totalCost.toFixed(2)}`)

  // Project to 30 days
  const monthlyProjection = (totalCost / days) * 30
  console.log(`   ${'Monthly Projection'.padEnd(20)} $${monthlyProjection.toFixed(2)}`)
  console.log('═'.repeat(70))

  // Load baseline
  const defaultBaselinePath = path.join(
    __dirname,
    '../../baselines/ecs-baseline.json'
  )
  const finalBaselinePath = baselinePath || defaultBaselinePath

  let baselineMonthlyCost = 950 // Default from story
  let baselineSource = 'Story Default'

  if (fs.existsSync(finalBaselinePath)) {
    const baseline = JSON.parse(fs.readFileSync(finalBaselinePath, 'utf-8'))
    baselineMonthlyCost = baseline.monthlyCost?.total || baselineMonthlyCost
    baselineSource = baseline.environment || 'ECS Baseline'
  }

  // Calculate savings
  const savings = baselineMonthlyCost - monthlyProjection
  const savingsPercent = (savings / baselineMonthlyCost) * 100
  const meetsTarget = monthlyProjection <= baselineMonthlyCost

  // Print comparison
  console.log('\n📈 Cost Comparison:\n')
  console.log(`   ECS Baseline:        $${baselineMonthlyCost.toFixed(2)}/month`)
  console.log(`   SST Projection:      $${monthlyProjection.toFixed(2)}/month`)
  console.log(`   Difference:          ${savings >= 0 ? '✅ -' : '⚠️  +'}$${Math.abs(savings).toFixed(2)}/month (${savings >= 0 ? '-' : '+'}${Math.abs(savingsPercent).toFixed(1)}%)`)

  console.log('\n' + '═'.repeat(70))

  if (meetsTarget) {
    console.log('✅ Cost Target Met: SST ≤ ECS Baseline\n')
  } else {
    console.log('❌ Cost Target NOT Met: SST > ECS Baseline\n')
  }

  // Save analysis
  const analysis: CostAnalysis = {
    testDate: new Date().toISOString(),
    period: {
      start: startDateStr,
      end: endDateStr,
      days,
    },
    costs,
    totalCost,
    monthlyProjection,
    baseline: {
      monthlyCost: baselineMonthlyCost,
      source: baselineSource,
    },
    comparison: {
      savings,
      savingsPercent,
      meetsTarget,
    },
  }

  const outputPath = path.join(process.cwd(), 'tests/performance/results/cost-analysis.json')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2))

  console.log(`📄 Cost analysis saved to: ${outputPath}\n`)

  // Exit with error if target not met
  if (!meetsTarget) {
    process.exit(1)
  }
}

// Main execution
const args = process.argv.slice(2)
const days = args[0] ? parseInt(args[0], 10) : 7
const baselinePath = args[1] || undefined

if (Number.isNaN(days) || days < 1 || days > 90) {
  console.error('❌ Invalid number of days. Must be between 1 and 90.')
  process.exit(1)
}

analyzeCosts(days, baselinePath).catch((error) => {
  console.error('❌ Error analyzing costs:', error)
  process.exit(1)
})
