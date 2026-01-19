/**
 * AWS Budget Configuration for Cost Monitoring
 * 
 * Creates AWS Budget with multi-threshold alerts:
 * - $150/month limit with alerts at 80% ($120) and 100% ($150)
 * - Filtered to Project=UserMetrics tagged resources only
 * - Multi-threshold alerts via SNS topic
 * - Monthly budget period with cost tracking
 */

export function createBudgets(budgetAlertTopic: any, stage: string) {
  /**
   * AWS Budget for User Metrics Project
   * - $150/month limit with alerts at 80% ($120) and 100% ($150)
   * - Filtered to Project=UserMetrics tagged resources only
   * - Multi-threshold alerts via SNS topic
   * - Monthly budget period with cost tracking
   */
  const userMetricsBudget = new aws.budgets.Budget('UserMetricsBudget', {
    name: `user-metrics-budget-${stage}`,
    budgetType: 'COST',
    limitAmount: '150',
    limitUnit: 'USD',
    timeUnit: 'MONTHLY',
    timePeriodStart: '2024-01-01_00:00',

    // Budget notifications
    notifications: [
      {
        notificationType: 'ACTUAL',
        comparisonOperator: 'GREATER_THAN',
        threshold: 80, // Alert at 80% ($120)
        thresholdType: 'PERCENTAGE',
        subscriberEmailAddresses: ['engineering@example.com'],
        subscriberSnsTopicArns: [budgetAlertTopic.arn],
      },
      {
        notificationType: 'ACTUAL',
        comparisonOperator: 'GREATER_THAN',
        threshold: 100, // Alert at 100% ($150)
        thresholdType: 'PERCENTAGE',
        subscriberEmailAddresses: ['engineering@example.com'],
        subscriberSnsTopicArns: [budgetAlertTopic.arn],
      },
      {
        notificationType: 'FORECASTED',
        comparisonOperator: 'GREATER_THAN',
        threshold: 100, // Forecast alert at 100%
        thresholdType: 'PERCENTAGE',
        subscriberEmailAddresses: ['engineering@example.com'],
        subscriberSnsTopicArns: [budgetAlertTopic.arn],
      },
    ],
  })

  return {
    userMetricsBudget,
  }
}
