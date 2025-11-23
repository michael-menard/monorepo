#!/usr/bin/env node
/**
 * Generate AWS Cost Explorer report
 * Story 5.7: Configure AWS Cost Monitoring and Budgets (AC 5)
 *
 * Generates custom Cost Explorer reports for:
 * - Lambda, API Gateway, RDS, ElastiCache, OpenSearch, S3
 * - Monthly cost trends
 * - Daily cost breakdown
 * - Service-level cost analysis
 */

import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  type GetCostAndUsageCommandInput,
} from '@aws-sdk/client-cost-explorer'
import fs from 'fs'
import path from 'path'

interface ServiceCost {
  service: string
  amount: number
}

interface CostReport {
  startDate: string
  endDate: string
  totalCost: number
  costByService: ServiceCost[]
  dailyCosts: Array<{
    date: string
    amount: number
  }>
}

/**
 * Get date range for report
 */
function getDateRange(days: number): { startDate: string; endDate: string } {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  }
}

/**
 * Fetch cost by service from AWS Cost Explorer
 */
async function getCostByService(
  client: CostExplorerClient,
  startDate: string,
  endDate: string,
): Promise<ServiceCost[]> {
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
    Filter: {
      Tags: {
        Key: 'Project',
        Values: ['lego-api'],
        MatchOptions: ['EQUALS'],
      },
    },
  }

  const command = new GetCostAndUsageCommand(params)
  const response = await client.send(command)

  const serviceCosts: ServiceCost[] = []

  if (response.ResultsByTime && response.ResultsByTime.length > 0) {
    const results = response.ResultsByTime[0]
    if (results.Groups) {
      for (const group of results.Groups) {
        const service = group.Keys?.[0] || 'Unknown'
        const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0')

        if (amount > 0) {
          serviceCosts.push({ service, amount })
        }
      }
    }
  }

  // Sort by cost descending
  return serviceCosts.sort((a, b) => b.amount - a.amount)
}

/**
 * Fetch daily costs from AWS Cost Explorer
 */
async function getDailyCosts(
  client: CostExplorerClient,
  startDate: string,
  endDate: string,
): Promise<Array<{ date: string; amount: number }>> {
  const params: GetCostAndUsageCommandInput = {
    TimePeriod: {
      Start: startDate,
      End: endDate,
    },
    Granularity: 'DAILY',
    Metrics: ['UnblendedCost'],
    Filter: {
      Tags: {
        Key: 'Project',
        Values: ['lego-api'],
        MatchOptions: ['EQUALS'],
      },
    },
  }

  const command = new GetCostAndUsageCommand(params)
  const response = await client.send(command)

  const dailyCosts: Array<{ date: string; amount: number }> = []

  if (response.ResultsByTime) {
    for (const result of response.ResultsByTime) {
      const date = result.TimePeriod?.Start || ''
      const amount = parseFloat(result.Total?.UnblendedCost?.Amount || '0')

      dailyCosts.push({ date, amount })
    }
  }

  return dailyCosts
}

/**
 * Generate human-readable cost report
 */
function formatCostReport(report: CostReport): string {
  let output = '═'.repeat(70) + '\n'
  output += '   AWS COST EXPLORER REPORT - LEGO API\n'
  output += '═'.repeat(70) + '\n\n'

  output += `📅 Report Period: ${report.startDate} to ${report.endDate}\n`
  output += `💰 Total Cost: $${report.totalCost.toFixed(2)}\n\n`

  output += '─'.repeat(70) + '\n'
  output += '   COST BY SERVICE\n'
  output += '─'.repeat(70) + '\n\n'

  // Table header
  output += 'Service'.padEnd(40) + 'Cost'.padStart(15) + 'Percent'.padStart(15) + '\n'
  output += '─'.repeat(70) + '\n'

  // Service breakdown
  for (const { service, amount } of report.costByService) {
    const percent = ((amount / report.totalCost) * 100).toFixed(1)
    output += service.padEnd(40) + `$${amount.toFixed(2)}`.padStart(15) + `${percent}%`.padStart(15) + '\n'
  }

  output += '─'.repeat(70) + '\n'
  output += 'TOTAL'.padEnd(40) + `$${report.totalCost.toFixed(2)}`.padStart(15) + '100.0%'.padStart(15) + '\n\n'

  // Daily costs (last 7 days)
  output += '─'.repeat(70) + '\n'
  output += '   DAILY COST TREND (LAST 7 DAYS)\n'
  output += '─'.repeat(70) + '\n\n'

  const lastSevenDays = report.dailyCosts.slice(-7)
  for (const { date, amount } of lastSevenDays) {
    const bar = '█'.repeat(Math.min(Math.floor(amount / 2), 50))
    output += `${date}  $${amount.toFixed(2).padStart(8)}  ${bar}\n`
  }

  output += '\n' + '═'.repeat(70) + '\n'

  return output
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  const days = args[0] ? parseInt(args[0]) : 30
  const outputDir = args[1] || 'reports/cost'

  console.log('📊 Generating AWS Cost Explorer report...\n')
  console.log(`   Period: Last ${days} days`)
  console.log(`   Output: ${outputDir}\n`)

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true })

  // Initialize Cost Explorer client
  const client = new CostExplorerClient({
    region: process.env.AWS_REGION || 'us-east-1',
  })

  // Get date range
  const { startDate, endDate } = getDateRange(days)

  console.log('🔍 Fetching cost data from AWS Cost Explorer...')

  // Fetch costs
  const [costByService, dailyCosts] = await Promise.all([
    getCostByService(client, startDate, endDate),
    getDailyCosts(client, startDate, endDate),
  ])

  // Calculate total cost
  const totalCost = costByService.reduce((sum, { amount }) => sum + amount, 0)

  // Build report
  const report: CostReport = {
    startDate,
    endDate,
    totalCost,
    costByService,
    dailyCosts,
  }

  // Write JSON report
  const jsonPath = path.join(outputDir, 'cost-report.json')
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2))
  console.log(`✅ JSON report saved: ${jsonPath}`)

  // Write human-readable report
  const textPath = path.join(outputDir, 'cost-summary.txt')
  const textReport = formatCostReport(report)
  fs.writeFileSync(textPath, textReport)
  console.log(`✅ Summary report saved: ${textPath}`)

  // Display summary
  console.log('\n' + textReport)

  // Exit with success
  process.exit(0)
}

// Run main function
main().catch((error) => {
  console.error('❌ Error generating cost report:', error)
  process.exit(1)
})
