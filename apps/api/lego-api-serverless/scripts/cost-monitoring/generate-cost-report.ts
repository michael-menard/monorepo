#!/usr/bin/env node
/**
 * Generate AWS Cost Explorer report for User Metrics Observability Infrastructure
 * Story 1.4: Cost Monitoring and Budget Alerts (AC 5)
 *
 * Generates custom Cost Explorer reports for UserMetrics project:
 * - Cost breakdown by Component (Umami, OpenReplay, Grafana, CloudWatch, Infrastructure)
 * - Cost breakdown by Function (SessionReplay, Analytics, Metrics, Logging, Visualization)
 * - Monthly and daily cost trends
 * - Service-level cost analysis
 * - Budget utilization tracking
 */

import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  type GetCostAndUsageCommandInput,
} from '@aws-sdk/client-cost-explorer'
import {
  getCostByProject,
  getCostByComponent,
  getCostByFunction,
} from '../../src/lib/cost-monitoring/cost-explorer'
import fs from 'fs'
import path from 'path'

interface ComponentCost {
  component: string
  amount: number
}

interface FunctionCost {
  function: string
  amount: number
}

interface CostReport {
  startDate: string
  endDate: string
  totalCost: number
  budgetLimit: number
  budgetUtilization: number
  costByComponent: ComponentCost[]
  costByFunction: FunctionCost[]
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
 * Parse cost data by component from Cost Explorer response
 */
function parseComponentCosts(costData: any[]): ComponentCost[] {
  const componentCosts: ComponentCost[] = []

  for (const timeResult of costData) {
    if (timeResult.groups) {
      for (const group of timeResult.groups) {
        const component = group.keys[0] || 'Unknown'
        const amount = parseFloat(group.metrics.BlendedCost.amount || '0')

        if (amount > 0) {
          const existing = componentCosts.find(c => c.component === component)
          if (existing) {
            existing.amount += amount
          } else {
            componentCosts.push({ component, amount })
          }
        }
      }
    }
  }

  return componentCosts.sort((a, b) => b.amount - a.amount)
}

/**
 * Parse cost data by function from Cost Explorer response
 */
function parseFunctionCosts(costData: any[]): FunctionCost[] {
  const functionCosts: FunctionCost[] = []

  for (const timeResult of costData) {
    if (timeResult.groups) {
      for (const group of timeResult.groups) {
        const func = group.keys[0] || 'Unknown'
        const amount = parseFloat(group.metrics.BlendedCost.amount || '0')

        if (amount > 0) {
          const existing = functionCosts.find(f => f.function === func)
          if (existing) {
            existing.amount += amount
          } else {
            functionCosts.push({ function: func, amount })
          }
        }
      }
    }
  }

  return functionCosts.sort((a, b) => b.amount - a.amount)
}

/**
 * Parse daily costs from Cost Explorer response
 */
function parseDailyCosts(costData: any[]): Array<{ date: string; amount: number }> {
  return costData.map(timeResult => ({
    date: timeResult.timePeriod.start,
    amount: parseFloat(timeResult.total.blendedCost.amount || '0'),
  }))
}

/**
 * Generate human-readable cost report for User Metrics
 */
function formatCostReport(report: CostReport): string {
  let output = '═'.repeat(80) + '\n'
  output += '   AWS COST EXPLORER REPORT - USER METRICS OBSERVABILITY\n'
  output += '═'.repeat(80) + '\n\n'

  output += `📅 Report Period: ${report.startDate} to ${report.endDate}\n`
  output += `💰 Total Cost: $${report.totalCost.toFixed(2)}\n`
  output += `🎯 Budget Limit: $${report.budgetLimit.toFixed(2)}\n`
  output += `📊 Budget Utilization: ${report.budgetUtilization.toFixed(1)}%\n\n`

  // Budget status indicator
  const budgetStatus =
    report.budgetUtilization >= 100
      ? '🚨 OVER BUDGET'
      : report.budgetUtilization >= 80
        ? '⚠️  APPROACHING LIMIT'
        : '✅ UNDER BUDGET'
  output += `Status: ${budgetStatus}\n\n`

  output += '─'.repeat(80) + '\n'
  output += '   COST BY COMPONENT (OBSERVABILITY TOOL)\n'
  output += '─'.repeat(80) + '\n\n'

  // Component breakdown table header
  output +=
    'Component'.padEnd(30) +
    'Cost'.padStart(15) +
    'Percent'.padStart(15) +
    'Description'.padStart(20) +
    '\n'
  output += '─'.repeat(80) + '\n'

  // Component breakdown
  for (const { component, amount } of report.costByComponent) {
    const percent = ((amount / report.totalCost) * 100).toFixed(1)
    const description = getComponentDescription(component)
    output +=
      component.padEnd(30) +
      `$${amount.toFixed(2)}`.padStart(15) +
      `${percent}%`.padStart(15) +
      description.padStart(20) +
      '\n'
  }

  output += '─'.repeat(80) + '\n'
  output +=
    'TOTAL'.padEnd(30) +
    `$${report.totalCost.toFixed(2)}`.padStart(15) +
    '100.0%'.padStart(15) +
    '\n\n'

  output += '─'.repeat(80) + '\n'
  output += '   COST BY FUNCTION (CAPABILITY)\n'
  output += '─'.repeat(80) + '\n\n'

  // Function breakdown table header
  output +=
    'Function'.padEnd(30) +
    'Cost'.padStart(15) +
    'Percent'.padStart(15) +
    'Purpose'.padStart(20) +
    '\n'
  output += '─'.repeat(80) + '\n'

  // Function breakdown
  for (const { function: func, amount } of report.costByFunction) {
    const percent = ((amount / report.totalCost) * 100).toFixed(1)
    const purpose = getFunctionPurpose(func)
    output +=
      func.padEnd(30) +
      `$${amount.toFixed(2)}`.padStart(15) +
      `${percent}%`.padStart(15) +
      purpose.padStart(20) +
      '\n'
  }

  output += '─'.repeat(80) + '\n'
  output +=
    'TOTAL'.padEnd(30) +
    `$${report.totalCost.toFixed(2)}`.padStart(15) +
    '100.0%'.padStart(15) +
    '\n\n'

  // Daily costs (last 7 days)
  output += '─'.repeat(80) + '\n'
  output += '   DAILY COST TREND (LAST 7 DAYS)\n'
  output += '─'.repeat(80) + '\n\n'

  const lastSevenDays = report.dailyCosts.slice(-7)
  for (const { date, amount } of lastSevenDays) {
    const bar = '█'.repeat(Math.min(Math.floor(amount / 2), 50))
    output += `${date}  $${amount.toFixed(2).padStart(8)}  ${bar}\n`
  }

  // Cost optimization recommendations
  output += '─'.repeat(80) + '\n'
  output += '   COST OPTIMIZATION RECOMMENDATIONS\n'
  output += '─'.repeat(80) + '\n\n'

  output += generateOptimizationRecommendations(report)

  output += '\n' + '═'.repeat(80) + '\n'

  return output
}

/**
 * Generate cost optimization recommendations based on cost data
 */
function generateOptimizationRecommendations(report: CostReport): string {
  let recommendations = ''

  // Budget utilization analysis
  if (report.budgetUtilization >= 100) {
    recommendations += '🚨 CRITICAL: Budget exceeded! Immediate action required:\n'
    recommendations += '   • Review and scale down non-essential resources\n'
    recommendations += '   • Implement cost controls and approval processes\n'
    recommendations += '   • Consider increasing budget if growth is justified\n\n'
  } else if (report.budgetUtilization >= 80) {
    recommendations += '⚠️  WARNING: Approaching budget limit:\n'
    recommendations += '   • Monitor cost trends closely\n'
    recommendations += '   • Prepare cost optimization plan\n'
    recommendations += '   • Review upcoming resource deployments\n\n'
  } else {
    recommendations += '✅ Budget utilization within acceptable range\n\n'
  }

  // Component-specific recommendations
  recommendations += 'Component-Specific Optimizations:\n\n'

  for (const { component, amount } of report.costByComponent) {
    const percentage = (amount / report.totalCost) * 100

    if (component === 'Infrastructure' && percentage > 40) {
      recommendations += `• Infrastructure (${percentage.toFixed(1)}%): Consider VPC endpoint usage to reduce NAT Gateway costs\n`
    } else if (component === 'OpenReplay' && percentage > 35) {
      recommendations += `• OpenReplay (${percentage.toFixed(1)}%): Review session retention policy and ECS task sizing\n`
    } else if (component === 'Umami' && percentage > 25) {
      recommendations += `• Umami (${percentage.toFixed(1)}%): Optimize database queries and consider connection pooling\n`
    } else if (component === 'CloudWatch' && percentage > 20) {
      recommendations += `• CloudWatch (${percentage.toFixed(1)}%): Review log retention policies and custom metrics usage\n`
    }
  }

  // General recommendations
  recommendations += '\nGeneral Optimization Opportunities:\n'
  recommendations +=
    '• Enable S3 Intelligent-Tiering for session storage (if not already enabled)\n'
  recommendations += '• Review ECS task CPU/memory utilization for right-sizing\n'
  recommendations += '• Implement CloudWatch log aggregation and filtering\n'
  recommendations += '• Consider Reserved Instances for consistent workloads\n'
  recommendations += '• Set up automated cost anomaly detection\n'

  return recommendations
}

/**
 * Get description for component
 */
function getComponentDescription(component: string): string {
  const descriptions: Record<string, string> = {
    Umami: 'Analytics',
    OpenReplay: 'Session Replay',
    Grafana: 'Visualization',
    CloudWatch: 'Metrics & Logs',
    Infrastructure: 'VPC & Networking',
    Storage: 'S3 Buckets',
    Compute: 'ECS Tasks',
  }
  return descriptions[component] || 'Other'
}

/**
 * Get purpose for function
 */
function getFunctionPurpose(func: string): string {
  const purposes: Record<string, string> = {
    SessionReplay: 'User Sessions',
    Analytics: 'Web Analytics',
    Metrics: 'System Metrics',
    Logging: 'Application Logs',
    Visualization: 'Dashboards',
    Storage: 'Data Storage',
    Networking: 'Network Access',
    CostMonitoring: 'Budget Tracking',
  }
  return purposes[func] || 'Other'
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)

  // Parse arguments - handle both stage and days parameters
  let stage = 'dev'
  let days = 30
  let outputDir = 'reports/cost'
  let isTestMode = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--test') {
      isTestMode = true
    } else if (arg === '--days' && args[i + 1]) {
      days = parseInt(args[i + 1])
      i++ // skip next argument
    } else if (arg === '--output' && args[i + 1]) {
      outputDir = args[i + 1]
      i++ // skip next argument
    } else if (!arg.startsWith('--')) {
      // First non-flag argument is the stage
      stage = arg
    }
  }

  // If first argument is a number, treat it as days (backward compatibility)
  if (args[0] && !isNaN(parseInt(args[0])) && !args[0].startsWith('--')) {
    days = parseInt(args[0])
    outputDir = args[1] || 'reports/cost'
  }

  console.log('📊 Generating User Metrics Cost Explorer report...\n')
  console.log(`   Project: UserMetrics`)
  console.log(`   Stage: ${stage}`)
  console.log(`   Period: Last ${days} days`)
  console.log(`   Output: ${outputDir}`)
  console.log(`   Test Mode: ${isTestMode}\n`)

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true })

  // Get date range
  const { startDate, endDate } = getDateRange(days)

  console.log('🔍 Fetching cost data from AWS Cost Explorer...')

  try {
    // Fetch costs using the new utilities
    const [projectCosts, componentCosts, functionCosts] = await Promise.all([
      getCostByProject(startDate, endDate, 'DAILY'),
      getCostByComponent(startDate, endDate, 'MONTHLY'),
      getCostByFunction(startDate, endDate, 'MONTHLY'),
    ])

    // Parse the data
    const dailyCosts = parseDailyCosts(projectCosts)
    const costByComponent = parseComponentCosts(componentCosts)
    const costByFunction = parseFunctionCosts(functionCosts)

    // Calculate total cost
    const totalCost = costByComponent.reduce((sum, { amount }) => sum + amount, 0)

    // Budget configuration (from story requirements)
    const budgetLimit = 150 // $150/month budget limit
    const budgetUtilization = (totalCost / budgetLimit) * 100

    // Build report
    const report: CostReport = {
      startDate,
      endDate,
      totalCost,
      budgetLimit,
      budgetUtilization,
      costByComponent,
      costByFunction,
      dailyCosts,
    }

    // Write JSON report
    const jsonPath = path.join(outputDir, 'user-metrics-cost-report.json')
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2))
    console.log(`✅ JSON report saved: ${jsonPath}`)

    // Write human-readable report
    const textPath = path.join(outputDir, 'user-metrics-cost-summary.txt')
    const textReport = formatCostReport(report)
    fs.writeFileSync(textPath, textReport)
    console.log(`✅ Summary report saved: ${textPath}`)

    // Display summary
    console.log('\n' + textReport)

    // Budget status warning
    if (budgetUtilization >= 100) {
      console.log('🚨 WARNING: Budget limit exceeded!')
    } else if (budgetUtilization >= 80) {
      console.log('⚠️  WARNING: Approaching budget limit!')
    } else {
      console.log('✅ Budget utilization within acceptable range')
    }

    // Exit with success
    process.exit(0)
  } catch (error) {
    console.error('❌ Error fetching cost data:', error)
    console.log('\n💡 Note: Cost data may not be available yet if resources were recently created.')
    console.log('   AWS Cost Explorer typically has a 24-hour delay for cost data.')
    process.exit(1)
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Error generating cost report:', error)
  process.exit(1)
})
