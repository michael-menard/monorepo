/**
 * AWS Budgets Configuration for Cost Monitoring
 * Story 5.7: Configure AWS Cost Monitoring and Budgets
 *
 * Creates:
 * - Monthly budget with $800 threshold
 * - Multi-threshold alerts (50%, 75%, 90%, 100%, forecasted)
 * - SNS topic for budget notifications
 * - Email and Slack integration
 */

import * as aws from '@pulumi/aws'

export interface BudgetConfig {
  /**
   * Monthly budget limit in USD
   */
  readonly monthlyLimit: number

  /**
   * Email address for budget alert notifications
   */
  readonly emailAddress: string

  /**
   * Optional Slack webhook URL for Slack notifications
   */
  readonly slackWebhookUrl?: string

  /**
   * AWS account ID for budget creation
   */
  readonly accountId: string

  /**
   * Stage/environment name
   */
  readonly stage: string
}

export interface BudgetResources {
  /**
   * SNS topic for budget alerts
   */
  readonly snsTopic: aws.sns.Topic

  /**
   * AWS Budget resource
   */
  readonly budget: aws.budgets.Budget

  /**
   * Slack forwarder Lambda (if Slack webhook provided)
   */
  readonly slackForwarder?: aws.lambda.Function
}

/**
 * Create AWS Budget with multi-threshold alerts
 */
export function createBudget(config: BudgetConfig): BudgetResources {
  const { monthlyLimit, emailAddress, slackWebhookUrl, stage } = config

  // Create SNS topic for budget alerts
  const snsTopic = new aws.sns.Topic('BudgetAlertTopic', {
    name: `lego-api-budget-alerts-${stage}`,
    displayName: 'LEGO API Budget Alerts',
    tags: {
      // Required tags (per aws-tagging-schema.md)
      Project: 'lego-api',
      Environment: stage,
      ManagedBy: 'SST',
      CostCenter: 'Engineering',
      Owner: 'engineering@bricklink.com',
      // Functional tags
      Component: 'Observability',
      Function: 'Monitoring',
      ServiceType: 'SNS',
    },
  })

  // Create email subscription to SNS topic
  new aws.sns.TopicSubscription('BudgetAlertEmailSubscription', {
    topic: snsTopic.arn,
    protocol: 'email',
    endpoint: emailAddress,
  })

  // Create Slack forwarder Lambda if webhook URL provided
  let slackForwarder: aws.lambda.Function | undefined
  if (slackWebhookUrl) {
    slackForwarder = createSlackForwarder(snsTopic, slackWebhookUrl, stage)
  }

  // Create AWS Budget with multiple alert thresholds
  const budget = new aws.budgets.Budget('LegoApiMonthlyBudget', {
    name: `lego-api-monthly-budget-${stage}`,
    budgetType: 'COST',
    timeUnit: 'MONTHLY',
    limitAmount: monthlyLimit.toString(),
    limitUnit: 'USD',
    costFilters: {
      TagKeyValue: [`user:Project$lego-api`],
    },
    tags: {
      // Required tags
      Project: 'lego-api',
      Environment: stage,
      ManagedBy: 'SST',
      CostCenter: 'Engineering',
      Owner: 'engineering@bricklink.com',
      // Functional tags
      Component: 'Observability',
      Function: 'Monitoring',
      BudgetAlert: monthlyLimit.toString(),
    },
    notifications: [
      // 50% threshold - Early warning
      {
        notificationType: 'ACTUAL',
        comparisonOperator: 'GREATER_THAN',
        threshold: 50,
        thresholdType: 'PERCENTAGE',
        subscriberSnsTopicArns: [snsTopic.arn],
      },
      // 75% threshold - Actionable warning
      {
        notificationType: 'ACTUAL',
        comparisonOperator: 'GREATER_THAN',
        threshold: 75,
        thresholdType: 'PERCENTAGE',
        subscriberSnsTopicArns: [snsTopic.arn],
      },
      // 90% threshold - Urgent action required
      {
        notificationType: 'ACTUAL',
        comparisonOperator: 'GREATER_THAN',
        threshold: 90,
        thresholdType: 'PERCENTAGE',
        subscriberSnsTopicArns: [snsTopic.arn],
      },
      // 100% threshold - Budget exceeded
      {
        notificationType: 'ACTUAL',
        comparisonOperator: 'GREATER_THAN',
        threshold: 100,
        thresholdType: 'PERCENTAGE',
        subscriberSnsTopicArns: [snsTopic.arn],
      },
      // Forecasted to exceed 100% - Predictive alert
      {
        notificationType: 'FORECASTED',
        comparisonOperator: 'GREATER_THAN',
        threshold: 100,
        thresholdType: 'PERCENTAGE',
        subscriberSnsTopicArns: [snsTopic.arn],
      },
    ],
    tags: {
      Project: 'lego-api',
      Environment: stage,
      Component: 'cost-monitoring',
    },
  })

  return {
    snsTopic,
    budget,
    slackForwarder,
  }
}

/**
 * Create Lambda function to forward budget alerts to Slack
 */
function createSlackForwarder(
  snsTopic: aws.sns.Topic,
  slackWebhookUrl: string,
  stage: string,
): aws.lambda.Function {
  // IAM role for Lambda execution
  const lambdaRole = new aws.iam.Role('BudgetSlackForwarderRole', {
    name: `lego-api-budget-slack-forwarder-${stage}`,
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: 'lambda.amazonaws.com',
          },
          Action: 'sts:AssumeRole',
        },
      ],
    }),
    tags: {
      // Required tags
      Project: 'lego-api',
      Environment: stage,
      ManagedBy: 'SST',
      CostCenter: 'Engineering',
      Owner: 'engineering@bricklink.com',
      // Functional tags
      Component: 'IAM',
      Function: 'AccessControl',
      Purpose: 'LambdaExecution',
      AccessLevel: 'ReadWrite',
    },
  })

  // Attach basic Lambda execution policy
  new aws.iam.RolePolicyAttachment('BudgetSlackForwarderBasicExecution', {
    role: lambdaRole.name,
    policyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
  })

  // Create Lambda function
  const slackForwarder = new aws.lambda.Function('BudgetSlackForwarder', {
    name: `lego-api-budget-slack-forwarder-${stage}`,
    runtime: 'nodejs20.x',
    handler: 'index.handler',
    role: lambdaRole.arn,
    timeout: 30,
    environment: {
      variables: {
        SLACK_WEBHOOK_URL: slackWebhookUrl,
      },
    },
    code: new aws.lambda.FunctionCodeArchive({
      assets: {
        'index.js': new aws.lambda.FileAsset(__dirname + '/slack-budget-forwarder.js'),
      },
    }),
    tags: {
      // Required tags
      Project: 'lego-api',
      Environment: stage,
      ManagedBy: 'SST',
      CostCenter: 'Engineering',
      Owner: 'engineering@bricklink.com',
      // Functional tags
      Component: 'Observability',
      Function: 'Compute',
      ServiceType: 'Lambda',
      Runtime: 'nodejs20.x',
      Endpoint: 'BudgetSlackForwarder',
      // Operational tags
      MonitoringLevel: 'Basic',
      LogRetention: '30',
    },
  })

  // Grant SNS permission to invoke Lambda
  new aws.lambda.Permission('BudgetSlackForwarderSnsPermission', {
    action: 'lambda:InvokeFunction',
    function: slackForwarder.name,
    principal: 'sns.amazonaws.com',
    sourceArn: snsTopic.arn,
  })

  // Subscribe Lambda to SNS topic
  new aws.sns.TopicSubscription('BudgetSlackForwarderSubscription', {
    topic: snsTopic.arn,
    protocol: 'lambda',
    endpoint: slackForwarder.arn,
  })

  return slackForwarder
}
