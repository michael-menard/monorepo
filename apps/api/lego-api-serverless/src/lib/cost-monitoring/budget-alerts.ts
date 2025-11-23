/**
 * AWS Budget Alert Handler for User Metrics Cost Monitoring
 *
 * This module provides utilities for handling AWS Budget alert notifications
 * and processing budget threshold breaches. It includes functions for parsing
 * SNS notifications and triggering appropriate responses.
 *
 * @see docs/stories/1.4.cost-monitoring-budget-alerts.md for implementation details
 */

import { SNSEvent, SNSEventRecord } from 'aws-lambda'

/**
 * Budget alert notification structure from AWS Budget service
 */
export interface BudgetAlert {
  budgetName: string
  budgetType: string
  budgetLimit: {
    amount: number
    unit: string
  }
  actualAmount: {
    amount: number
    unit: string
  }
  forecastedAmount?: {
    amount: number
    unit: string
  }
  threshold: number
  thresholdType: 'PERCENTAGE' | 'ABSOLUTE_VALUE'
  comparisonOperator: 'GREATER_THAN' | 'LESS_THAN' | 'EQUAL_TO'
  notificationType: 'ACTUAL' | 'FORECASTED'
  accountId: string
  timestamp: string
}

/**
 * Parse AWS Budget alert from SNS notification message
 *
 * @param snsMessage - Raw SNS message containing budget alert
 * @returns Parsed budget alert data
 */
export const parseBudgetAlert = (snsMessage: string): BudgetAlert | null => {
  try {
    // AWS Budget alerts come as JSON in the SNS message
    const alertData = JSON.parse(snsMessage)

    // Extract budget alert information
    return {
      budgetName: alertData.BudgetName || '',
      budgetType: alertData.BudgetType || '',
      budgetLimit: {
        amount: parseFloat(alertData.BudgetLimit?.Amount || '0'),
        unit: alertData.BudgetLimit?.Unit || 'USD',
      },
      actualAmount: {
        amount: parseFloat(alertData.ActualAmount?.Amount || '0'),
        unit: alertData.ActualAmount?.Unit || 'USD',
      },
      forecastedAmount: alertData.ForecastedAmount
        ? {
            amount: parseFloat(alertData.ForecastedAmount.Amount || '0'),
            unit: alertData.ForecastedAmount.Unit || 'USD',
          }
        : undefined,
      threshold: parseFloat(alertData.Threshold || '0'),
      thresholdType: alertData.ThresholdType || 'PERCENTAGE',
      comparisonOperator: alertData.ComparisonOperator || 'GREATER_THAN',
      notificationType: alertData.NotificationType || 'ACTUAL',
      accountId: alertData.AccountId || '',
      timestamp: alertData.Time || new Date().toISOString(),
    }
  } catch (error) {
    console.error('Failed to parse budget alert:', error)
    return null
  }
}

/**
 * Process budget alert and determine severity level
 *
 * @param alert - Parsed budget alert data
 * @returns Alert severity and recommended actions
 */
export const processBudgetAlert = (alert: BudgetAlert) => {
  const utilizationPercentage = (alert.actualAmount.amount / alert.budgetLimit.amount) * 100

  let severity: 'INFO' | 'WARNING' | 'CRITICAL'
  let actions: string[]

  if (utilizationPercentage >= 100) {
    severity = 'CRITICAL'
    actions = [
      'Immediate cost review required',
      'Consider scaling down non-essential resources',
      'Review cost optimization opportunities',
      'Notify engineering and finance teams',
    ]
  } else if (utilizationPercentage >= 80) {
    severity = 'WARNING'
    actions = [
      'Monitor cost trends closely',
      'Review upcoming resource deployments',
      'Prepare cost optimization plan',
      'Schedule cost review meeting',
    ]
  } else {
    severity = 'INFO'
    actions = ['Continue monitoring', 'Regular cost optimization review']
  }

  return {
    severity,
    utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
    actions,
    message: `Budget ${alert.budgetName} is at ${utilizationPercentage.toFixed(1)}% utilization ($${alert.actualAmount.amount} of $${alert.budgetLimit.amount} ${alert.budgetLimit.unit})`,
  }
}

/**
 * Lambda handler for processing budget alert SNS notifications
 *
 * @param event - SNS event containing budget alert notifications
 * @returns Processing results
 */
export const handleBudgetAlerts = async (event: SNSEvent) => {
  const results = []

  for (const record of event.Records) {
    try {
      const alert = parseBudgetAlert(record.Sns.Message)

      if (!alert) {
        console.error('Failed to parse budget alert from SNS message')
        continue
      }

      const analysis = processBudgetAlert(alert)

      // Log alert details
      console.log('Budget Alert Received:', {
        budgetName: alert.budgetName,
        severity: analysis.severity,
        utilization: `${analysis.utilizationPercentage}%`,
        amount: `$${alert.actualAmount.amount}`,
        limit: `$${alert.budgetLimit.amount}`,
        threshold: `${alert.threshold}%`,
        timestamp: alert.timestamp,
      })

      // Log recommended actions
      console.log('Recommended Actions:', analysis.actions)

      results.push({
        budgetName: alert.budgetName,
        severity: analysis.severity,
        utilization: analysis.utilizationPercentage,
        message: analysis.message,
        actions: analysis.actions,
        processed: true,
      })
    } catch (error) {
      console.error('Error processing budget alert:', error)
      results.push({
        error: error instanceof Error ? error.message : 'Unknown error',
        processed: false,
      })
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Budget alerts processed',
      results,
    }),
  }
}
