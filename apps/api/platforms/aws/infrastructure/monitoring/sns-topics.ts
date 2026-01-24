/**
 * SNS Topics for Monitoring and Alerts
 *
 * Creates SNS topics for:
 * - Error alerts (Lambda function errors)
 * - Budget alerts (cost monitoring)
 */

export function createSnsTopics(stage: string) {
  /**
   * SNS Topic for Error Alerts
   * - Receives notifications when error rate exceeds threshold
   * - Subscribe via email/SMS in AWS Console after deployment
   */
  const errorAlertTopic = new aws.sns.Topic('ErrorAlertTopic', {
    name: `lego-api-error-alerts-${stage}`,
    displayName: 'LEGO API Error Alerts',
    tags: {
      Environment: stage,
      Service: 'lego-api-serverless',
      Purpose: 'ErrorMonitoring',
    },
  })

  /**
   * SNS Topic for Budget Alert Notifications
   * - Email notifications for budget threshold breaches
   * - Integrated with AWS Budget service
   * - Proper tagging for cost allocation
   */
  const budgetAlertTopic = new aws.sns.Topic('BudgetAlertTopic', {
    name: `user-metrics-budget-alerts-${stage}`,
    displayName: 'User Metrics Budget Alerts',
    tags: {
      Environment: stage,
      Project: 'user-metrics',
      Component: 'CostMonitoring',
      Purpose: 'BudgetAlerts',
    },
  })

  return {
    errorAlertTopic,
    budgetAlertTopic,
  }
}
