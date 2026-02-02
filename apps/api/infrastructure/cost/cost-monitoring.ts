/**
 * Cost Monitoring Infrastructure
 * 
 * Creates cost monitoring functions and dashboards:
 * - Lambda function to query Cost Explorer API daily
 * - Publishes custom metrics to CloudWatch for dashboard
 * - Tracks cost trends by component and function
 * - Monitors budget utilization percentage
 */

export function createCostMonitoring(stage: string) {
  /**
   * Lambda Function for Cost Metrics Publishing
   * - Scheduled function to query Cost Explorer API daily
   * - Publishes custom metrics to CloudWatch for dashboard
   * - Tracks cost trends by component and function
   * - Monitors budget utilization percentage
   */
  const costMetricsPublisher = new sst.aws.Function('CostMetricsPublisher', {
    handler: 'infrastructure/lambda/cost-monitoring/cost-metrics-publisher.handler',
    runtime: 'nodejs20.x',
    timeout: '5 minutes',
    memory: '512 MB',
    environment: {
      STAGE: stage,
      BUDGET_NAME: `user-metrics-budget-${stage}`,
    },
  })

  // Add Cost Explorer permissions after function creation
  new aws.iam.RolePolicyAttachment('CostMetricsPublisherCostExplorerPolicy', {
    role: costMetricsPublisher.nodes.role.name,
    policyArn: 'arn:aws:iam::aws:policy/AWSCostExplorerServiceRolePolicy',
  })

  // Add CloudWatch metrics permissions
  const costMetricsCloudWatchPolicy = new aws.iam.Policy('CostMetricsPublisherCloudWatchPolicy', {
    policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'cloudwatch:PutMetricData',
            'budgets:ViewBudget',
            'ce:GetCostAndUsage',
            'ce:GetUsageReport',
          ],
          Resource: '*',
        },
      ],
    }),
  })

  new aws.iam.RolePolicyAttachment('CostMetricsPublisherCloudWatchPolicyAttachment', {
    role: costMetricsPublisher.nodes.role.name,
    policyArn: costMetricsCloudWatchPolicy.arn,
  })

  /**
   * EventBridge Rule for Daily Cost Metrics Collection
   * - Triggers cost metrics publisher daily at 6 AM UTC
   * - Ensures fresh cost data for dashboard
   * - Runs after AWS cost data is typically available
   */
  const costMetricsSchedule = new aws.cloudwatch.EventRule('CostMetricsSchedule', {
    name: `user-metrics-cost-schedule-${stage}`,
    description: 'Daily trigger for cost metrics collection',
    scheduleExpression: 'cron(0 6 * * ? *)', // 6 AM UTC daily
    isEnabled: true,
  })

  new aws.cloudwatch.EventTarget('CostMetricsScheduleTarget', {
    rule: costMetricsSchedule.name,
    arn: costMetricsPublisher.arn,
  })

  // Grant EventBridge permission to invoke the Lambda
  new aws.lambda.Permission('CostMetricsSchedulePermission', {
    action: 'lambda:InvokeFunction',
    function: costMetricsPublisher.name,
    principal: 'events.amazonaws.com',
    sourceArn: costMetricsSchedule.arn,
  })

  /**
   * CloudWatch Dashboard for Cost Monitoring
   * - Real-time cost metrics and trends
   * - Budget utilization tracking
   * - Cost breakdown by component and function
   * - Daily, weekly, and monthly views
   */
  const costMonitoringDashboard = new aws.cloudwatch.Dashboard('CostMonitoringDashboard', {
    dashboardName: `UserMetrics-Cost-Monitoring-${stage}`,
    dashboardBody: JSON.stringify({
      widgets: [
        {
          type: 'metric',
          x: 0,
          y: 0,
          width: 6,
          height: 6,
          properties: {
            metrics: [
              ['UserMetrics/Cost', 'TotalDailyCost'],
            ],
            view: 'singleValue',
            region: 'us-east-1',
            title: 'Total Daily Cost',
            period: 86400, // 1 day
          },
        },
        {
          type: 'metric',
          x: 6,
          y: 0,
          width: 6,
          height: 6,
          properties: {
            metrics: [
              ['UserMetrics/Budget', 'DailyBudgetUtilization'],
            ],
            view: 'singleValue',
            region: 'us-east-1',
            title: 'Daily Budget Utilization (%)',
            period: 86400, // 1 day
          },
        },
        {
          type: 'metric',
          x: 0,
          y: 6,
          width: 12,
          height: 6,
          properties: {
            metrics: [
              ['UserMetrics/Cost', 'DailyCostByComponent', 'Component', 'Lambda'],
              ['.', '.', '.', 'RDS'],
              ['.', '.', '.', 'S3'],
              ['.', '.', '.', 'OpenSearch'],
              ['.', '.', '.', 'CloudWatch'],
            ],
            view: 'timeSeries',
            stacked: false,
            region: 'us-east-1',
            title: 'Daily Cost by Component (7 days)',
            period: 86400,
          },
        },
      ],
    }),
  })

  return {
    costMetricsPublisher,
    costMetricsSchedule,
    costMonitoringDashboard,
  }
}
