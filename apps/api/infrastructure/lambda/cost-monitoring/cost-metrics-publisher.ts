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
import { createLambdaLogger } from '@repo/logger'

// Initialize CloudWatch client
const cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION || 'us-east-1' })

// Initialize structured logger
const logger = createLambdaLogger('cost-metrics-publisher')

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
  logger.info('Starting cost metrics publishing', {
    requestId: context.requestId,
    eventId: event.id,
    time: event.time,
  })

  try {
    const { startDate, endDate } = getDateRange()
    logger.info('Fetching cost data', { startDate, endDate })

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
      logger.info('Published total daily cost', { totalCost, currency: 'USD' })
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
            logger.info('Published component cost', { component, cost, currency: 'USD' })
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
            logger.info('Published function cost', { function: func, cost, currency: 'USD' })
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
      logger.info('Published budget utilization', {
        utilizationPercentage: utilizationPercentage.toFixed(2),
        budgetLimit,
        dailyCost,
      })
    }

    logger.info('Cost metrics publishing completed successfully', {
      totalMetricsPublished: {
        projectCosts: projectCosts.length,
        componentCosts: componentCosts.length,
        functionCosts: functionCosts.length,
      },
    })

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
    logger.error('Error publishing cost metrics', error instanceof Error ? error : undefined, {
      errorType: error instanceof Error ? error.name : 'Unknown',
    })

    // Publish error metric
    await publishCostMetrics('UserMetrics/Cost', 'PublishingErrors', 1, [
      { Name: 'Project', Value: 'UserMetrics' },
      { Name: 'ErrorType', Value: error instanceof Error ? error.name : 'Unknown' },
    ])

    throw error
  }
}
