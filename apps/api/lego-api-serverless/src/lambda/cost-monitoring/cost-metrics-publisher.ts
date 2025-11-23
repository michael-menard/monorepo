/**
 * Cost Metrics Publisher Lambda Function
 * Story 1.4: Cost Monitoring and Budget Alerts (AC 3)
 *
 * This Lambda function queries AWS Cost Explorer API and publishes custom metrics
 * to CloudWatch for cost monitoring dashboards. It runs on a scheduled basis
 * to track daily cost trends by component and function.
 */

import { ScheduledEvent, Context } from 'aws-lambda'
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch'
import {
  getCostByProject,
  getCostByComponent,
  getCostByFunction,
} from '../../lib/cost-monitoring/cost-explorer'

// Initialize CloudWatch client
const cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION || 'us-east-1' })

/**
 * Publish cost metrics to CloudWatch
 */
async function publishCostMetrics(
  namespace: string,
  metricName: string,
  value: number,
  dimensions: Array<{ Name: string; Value: string }> = [],
) {
  const params = {
    Namespace: namespace,
    MetricData: [
      {
        MetricName: metricName,
        Value: value,
        Unit: 'None',
        Dimensions: dimensions,
        Timestamp: new Date(),
      },
    ],
  }

  const command = new PutMetricDataCommand(params)
  await cloudWatchClient.send(command)
}

/**
 * Get date range for cost queries (yesterday's data)
 */
function getDateRange() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const today = new Date()

  return {
    startDate: yesterday.toISOString().split('T')[0], // YYYY-MM-DD
    endDate: today.toISOString().split('T')[0], // YYYY-MM-DD
  }
}

/**
 * Lambda handler for cost metrics publishing
 */
export const handler = async (event: ScheduledEvent, context: Context) => {
  console.log('📊 Starting cost metrics publishing...', { event, context })

  try {
    const { startDate, endDate } = getDateRange()
    console.log(`Fetching cost data for ${startDate} to ${endDate}`)

    // Fetch cost data from Cost Explorer
    const [projectCosts, componentCosts, functionCosts] = await Promise.all([
      getCostByProject(startDate, endDate, 'DAILY'),
      getCostByComponent(startDate, endDate, 'DAILY'),
      getCostByFunction(startDate, endDate, 'DAILY'),
    ])

    // Publish total project cost
    if (projectCosts.length > 0) {
      const totalCost = parseFloat(projectCosts[0].total.blendedCost.amount)
      await publishCostMetrics('UserMetrics/Cost', 'TotalDailyCost', totalCost, [
        { Name: 'Project', Value: 'UserMetrics' },
        { Name: 'Period', Value: 'Daily' },
      ])
      console.log(`Published total daily cost: $${totalCost}`)
    }

    // Publish cost by component
    for (const timeResult of componentCosts) {
      if (timeResult.groups) {
        for (const group of timeResult.groups) {
          const component = group.keys[0] || 'Unknown'
          const cost = parseFloat(group.metrics.BlendedCost.amount)

          if (cost > 0) {
            await publishCostMetrics('UserMetrics/Cost', 'DailyCostByComponent', cost, [
              { Name: 'Project', Value: 'UserMetrics' },
              { Name: 'Component', Value: component },
              { Name: 'Period', Value: 'Daily' },
            ])
            console.log(`Published component cost: ${component} = $${cost}`)
          }
        }
      }
    }

    // Publish cost by function
    for (const timeResult of functionCosts) {
      if (timeResult.groups) {
        for (const group of timeResult.groups) {
          const func = group.keys[0] || 'Unknown'
          const cost = parseFloat(group.metrics.BlendedCost.amount)

          if (cost > 0) {
            await publishCostMetrics('UserMetrics/Cost', 'DailyCostByFunction', cost, [
              { Name: 'Project', Value: 'UserMetrics' },
              { Name: 'Function', Value: func },
              { Name: 'Period', Value: 'Daily' },
            ])
            console.log(`Published function cost: ${func} = $${cost}`)
          }
        }
      }
    }

    // Calculate and publish budget utilization
    const budgetLimit = 150 // $150/month budget
    const monthlyBudgetDaily = budgetLimit / 30 // Approximate daily budget

    if (projectCosts.length > 0) {
      const dailyCost = parseFloat(projectCosts[0].total.blendedCost.amount)
      const utilizationPercentage = (dailyCost / monthlyBudgetDaily) * 100

      await publishCostMetrics(
        'UserMetrics/Budget',
        'DailyBudgetUtilization',
        utilizationPercentage,
        [
          { Name: 'Project', Value: 'UserMetrics' },
          { Name: 'BudgetLimit', Value: budgetLimit.toString() },
        ],
      )
      console.log(`Published budget utilization: ${utilizationPercentage.toFixed(2)}%`)
    }

    console.log('✅ Cost metrics publishing completed successfully')

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Cost metrics published successfully',
        dateRange: { startDate, endDate },
        metricsPublished: {
          totalCost: projectCosts.length > 0,
          componentCosts: componentCosts.length,
          functionCosts: functionCosts.length,
        },
      }),
    }
  } catch (error) {
    console.error('❌ Error publishing cost metrics:', error)

    // Publish error metric
    await publishCostMetrics('UserMetrics/Cost', 'PublishingErrors', 1, [
      { Name: 'Project', Value: 'UserMetrics' },
      { Name: 'ErrorType', Value: error instanceof Error ? error.name : 'Unknown' },
    ])

    throw error
  }
}
