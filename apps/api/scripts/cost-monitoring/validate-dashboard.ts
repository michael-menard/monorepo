#!/usr/bin/env node
/**
 * Validate Cost Monitoring Dashboard
 * Story 1.4: Cost Monitoring and Budget Alerts (Task 3)
 *
 * This script validates that the CloudWatch dashboard displays cost data correctly
 * and that all metrics are properly configured.
 */

import {
  CloudWatchClient,
  GetDashboardCommand,
  ListDashboardsCommand,
} from '@aws-sdk/client-cloudwatch'
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer'

// Initialize AWS clients
const cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION || 'us-east-1' })
const costExplorerClient = new CostExplorerClient({ region: 'us-east-1' }) // Cost Explorer only in us-east-1

interface ValidationResult {
  component: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  message: string
  details?: any
}

/**
 * Validate CloudWatch Dashboard exists and has correct widgets
 */
async function validateDashboard(stage: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []
  const dashboardName = `UserMetrics-CostMonitoring-${stage}`

  try {
    // Check if dashboard exists
    const listCommand = new ListDashboardsCommand({})
    const listResponse = await cloudWatchClient.send(listCommand)

    const dashboard = listResponse.DashboardEntries?.find(d => d.DashboardName === dashboardName)

    if (!dashboard) {
      results.push({
        component: 'Dashboard Existence',
        status: 'FAIL',
        message: `Dashboard '${dashboardName}' not found`,
      })
      return results
    }

    results.push({
      component: 'Dashboard Existence',
      status: 'PASS',
      message: `Dashboard '${dashboardName}' exists`,
      details: {
        dashboardName: dashboard.DashboardName,
        lastModified: dashboard.LastModified,
      },
    })

    // Get dashboard configuration
    const getCommand = new GetDashboardCommand({
      DashboardName: dashboardName,
    })

    const getResponse = await cloudWatchClient.send(getCommand)
    const dashboardBody = JSON.parse(getResponse.DashboardBody || '{}')

    // Validate dashboard has widgets
    const widgets = dashboardBody.widgets || []

    if (widgets.length === 0) {
      results.push({
        component: 'Dashboard Widgets',
        status: 'FAIL',
        message: 'Dashboard has no widgets configured',
      })
      return results
    }

    results.push({
      component: 'Dashboard Widgets',
      status: 'PASS',
      message: `Dashboard has ${widgets.length} widget(s) configured`,
    })

    // Validate specific widget types
    const expectedWidgets = [
      'Daily Cost Trend',
      'Monthly Budget vs Actual',
      'Cost by Service',
      'Cost Anomaly Detection',
    ]

    const widgetTitles = widgets
      .map((w: any) => w.properties?.title)
      .filter((title: string) => title)

    for (const expectedWidget of expectedWidgets) {
      const found = widgetTitles.some((title: string) =>
        title.toLowerCase().includes(expectedWidget.toLowerCase().replace(/\s+/g, '')),
      )

      if (found) {
        results.push({
          component: `Widget: ${expectedWidget}`,
          status: 'PASS',
          message: `${expectedWidget} widget found`,
        })
      } else {
        results.push({
          component: `Widget: ${expectedWidget}`,
          status: 'WARNING',
          message: `${expectedWidget} widget not found`,
        })
      }
    }
  } catch (error) {
    results.push({
      component: 'Dashboard Validation',
      status: 'FAIL',
      message: `Error validating dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }

  return results
}

/**
 * Validate Cost Explorer data availability
 */
async function validateCostData(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []

  try {
    // Get cost data for the last 7 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)

    const command = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: startDate.toISOString().split('T')[0],
        End: endDate.toISOString().split('T')[0],
      },
      Granularity: 'DAILY',
      Metrics: ['BlendedCost'],
      GroupBy: [
        {
          Type: 'DIMENSION',
          Key: 'SERVICE',
        },
      ],
      Filter: {
        Tags: {
          Key: 'Project',
          Values: ['UserMetrics'],
        },
      },
    })

    const response = await costExplorerClient.send(command)
    const resultsByTime = response.ResultsByTime || []

    if (resultsByTime.length === 0) {
      results.push({
        component: 'Cost Data Availability',
        status: 'WARNING',
        message: 'No cost data found for UserMetrics project in the last 7 days',
        details: {
          note: 'This is expected for new deployments. Cost data may take 24-48 hours to appear.',
        },
      })
    } else {
      const totalCost = resultsByTime.reduce((sum, day) => {
        const dayCost = day.Total?.BlendedCost?.Amount || '0'
        return sum + parseFloat(dayCost)
      }, 0)

      results.push({
        component: 'Cost Data Availability',
        status: 'PASS',
        message: `Cost data available for ${resultsByTime.length} days`,
        details: {
          totalCost: `$${totalCost.toFixed(2)}`,
          daysWithData: resultsByTime.length,
        },
      })

      // Check if we have service-level breakdown
      const servicesWithCosts = new Set<string>()
      resultsByTime.forEach(day => {
        day.Groups?.forEach(group => {
          const serviceName = group.Keys?.[0]
          if (serviceName && parseFloat(group.Metrics?.BlendedCost?.Amount || '0') > 0) {
            servicesWithCosts.add(serviceName)
          }
        })
      })

      if (servicesWithCosts.size > 0) {
        results.push({
          component: 'Service Breakdown',
          status: 'PASS',
          message: `Cost data available for ${servicesWithCosts.size} AWS service(s)`,
          details: {
            services: Array.from(servicesWithCosts),
          },
        })
      }
    }
  } catch (error) {
    results.push({
      component: 'Cost Data Validation',
      status: 'FAIL',
      message: `Error validating cost data: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }

  return results
}

/**
 * Print validation results
 */
function printResults(results: ValidationResult[]) {
  console.log('═'.repeat(80))
  console.log('   COST MONITORING DASHBOARD VALIDATION RESULTS')
  console.log('═'.repeat(80))
  console.log()

  let passCount = 0
  let failCount = 0
  let warningCount = 0

  for (const result of results) {
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️'

    console.log(`${statusIcon} ${result.component}: ${result.message}`)

    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
    }
    console.log()

    if (result.status === 'PASS') passCount++
    else if (result.status === 'FAIL') failCount++
    else warningCount++
  }

  console.log('─'.repeat(80))
  console.log(`Summary: ${passCount} passed, ${failCount} failed, ${warningCount} warnings`)
  console.log('─'.repeat(80))

  return { passCount, failCount, warningCount }
}

/**
 * Main execution
 */
async function main() {
  const stage = process.argv[2] || 'dev'

  console.log(`🔍 Validating cost monitoring dashboard for stage: ${stage}\n`)

  try {
    // Run validations
    const [dashboardResults, costDataResults] = await Promise.all([
      validateDashboard(stage),
      validateCostData(),
    ])

    // Combine and print results
    const allResults = [...dashboardResults, ...costDataResults]
    const { passCount, failCount, warningCount } = printResults(allResults)

    // Exit with appropriate code
    if (failCount > 0) {
      console.log('❌ Validation failed! Please fix the issues above.')
      process.exit(1)
    } else if (warningCount > 0) {
      console.log('⚠️  Validation completed with warnings.')
      process.exit(0)
    } else {
      console.log('✅ All validations passed!')
      process.exit(0)
    }
  } catch (error) {
    console.error('❌ Error during validation:', error)
    process.exit(1)
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
