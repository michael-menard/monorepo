/**
 * CloudWatch Alarms Configuration
 *
 * Defines error rate and latency alarms for Lambda functions.
 * To be used in SST config for monitoring production Lambda health.
 *
 * Usage in sst.config.ts:
 * ```typescript
 * import { createErrorRateAlarm, createLatencyAlarm } from './src/infrastructure/cloudwatch-alarms'
 *
 * const function = new sst.aws.Function(...)
 * createErrorRateAlarm(function.name, stage)
 * createLatencyAlarm(function.name, stage)
 * ```
 */

import * as aws from '@pulumi/aws'

/**
 * Create CloudWatch alarm for Lambda error rate
 *
 * Triggers when error rate exceeds 5% over 2 consecutive 5-minute periods
 *
 * @param functionName - Name of the Lambda function
 * @param stage - Deployment stage (dev, staging, production)
 * @param options - Optional configuration overrides
 * @returns CloudWatch Alarm resource
 */
export function createErrorRateAlarm(
  functionName: string,
  stage: string,
  options?: {
    /** Error rate threshold percentage (default: 5) */
    thresholdPercent?: number
    /** Evaluation periods (default: 2) */
    evaluationPeriods?: number
    /** Period length in seconds (default: 300 = 5 minutes) */
    periodSeconds?: number
    /** SNS topic ARN for alarm notifications */
    snsTopicArn?: string
  },
): aws.cloudwatch.MetricAlarm {
  const thresholdPercent = options?.thresholdPercent ?? 5
  const evaluationPeriods = options?.evaluationPeriods ?? 2
  const periodSeconds = options?.periodSeconds ?? 300

  return new aws.cloudwatch.MetricAlarm(`${functionName}-ErrorRateAlarm`, {
    name: `${functionName}-error-rate-${stage}`,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods,
    threshold: thresholdPercent,
    treatMissingData: 'notBreaching',

    // Metric: (Errors / Invocations) * 100
    metricQueries: [
      {
        id: 'errorRate',
        expression: '(errors / invocations) * 100',
        label: 'Error Rate (%)',
        returnData: true,
      },
      {
        id: 'errors',
        metric: {
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          dimensions: {
            FunctionName: functionName,
          },
          period: periodSeconds,
          stat: 'Sum',
        },
        returnData: false,
      },
      {
        id: 'invocations',
        metric: {
          namespace: 'AWS/Lambda',
          metricName: 'Invocations',
          dimensions: {
            FunctionName: functionName,
          },
          period: periodSeconds,
          stat: 'Sum',
        },
        returnData: false,
      },
    ],

    alarmDescription: `Error rate exceeded ${thresholdPercent}% for ${functionName}`,
    alarmActions: options?.snsTopicArn ? [options.snsTopicArn] : [],

    tags: {
      Function: functionName,
      Environment: stage,
      AlarmType: 'ErrorRate',
    },
  })
}

/**
 * Create CloudWatch alarm for Lambda latency (P99)
 *
 * Triggers when 99th percentile duration exceeds threshold
 *
 * @param functionName - Name of the Lambda function
 * @param stage - Deployment stage
 * @param options - Optional configuration overrides
 * @returns CloudWatch Alarm resource
 */
export function createLatencyAlarm(
  functionName: string,
  stage: string,
  options?: {
    /** P99 latency threshold in milliseconds (default: 3000 = 3 seconds) */
    thresholdMs?: number
    /** Evaluation periods (default: 2) */
    evaluationPeriods?: number
    /** Period length in seconds (default: 300 = 5 minutes) */
    periodSeconds?: number
    /** SNS topic ARN for alarm notifications */
    snsTopicArn?: string
  },
): aws.cloudwatch.MetricAlarm {
  const thresholdMs = options?.thresholdMs ?? 3000
  const evaluationPeriods = options?.evaluationPeriods ?? 2
  const periodSeconds = options?.periodSeconds ?? 300

  return new aws.cloudwatch.MetricAlarm(`${functionName}-LatencyAlarm`, {
    name: `${functionName}-p99-latency-${stage}`,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods,
    metricName: 'Duration',
    namespace: 'AWS/Lambda',
    period: periodSeconds,
    statistic: 'p99',
    threshold: thresholdMs,
    dimensions: {
      FunctionName: functionName,
    },
    treatMissingData: 'notBreaching',

    alarmDescription: `P99 latency exceeded ${thresholdMs}ms for ${functionName}`,
    alarmActions: options?.snsTopicArn ? [options.snsTopicArn] : [],

    tags: {
      Function: functionName,
      Environment: stage,
      AlarmType: 'Latency',
    },
  })
}

/**
 * Create CloudWatch alarm for Lambda throttles
 *
 * Triggers when function is throttled (concurrent execution limit exceeded)
 *
 * @param functionName - Name of the Lambda function
 * @param stage - Deployment stage
 * @param options - Optional configuration overrides
 * @returns CloudWatch Alarm resource
 */
export function createThrottleAlarm(
  functionName: string,
  stage: string,
  options?: {
    /** Throttle count threshold (default: 10) */
    threshold?: number
    /** Evaluation periods (default: 1) */
    evaluationPeriods?: number
    /** Period length in seconds (default: 60 = 1 minute) */
    periodSeconds?: number
    /** SNS topic ARN for alarm notifications */
    snsTopicArn?: string
  },
): aws.cloudwatch.MetricAlarm {
  const threshold = options?.threshold ?? 10
  const evaluationPeriods = options?.evaluationPeriods ?? 1
  const periodSeconds = options?.periodSeconds ?? 60

  return new aws.cloudwatch.MetricAlarm(`${functionName}-ThrottleAlarm`, {
    name: `${functionName}-throttles-${stage}`,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods,
    metricName: 'Throttles',
    namespace: 'AWS/Lambda',
    period: periodSeconds,
    statistic: 'Sum',
    threshold,
    dimensions: {
      FunctionName: functionName,
    },
    treatMissingData: 'notBreaching',

    alarmDescription: `Function throttled more than ${threshold} times for ${functionName}`,
    alarmActions: options?.snsTopicArn ? [options.snsTopicArn] : [],

    tags: {
      Function: functionName,
      Environment: stage,
      AlarmType: 'Throttles',
    },
  })
}

/**
 * Create SNS topic for alarm notifications
 *
 * @param stage - Deployment stage
 * @returns SNS Topic resource
 */
export function createAlarmTopic(stage: string): aws.sns.Topic {
  return new aws.sns.Topic('LambdaAlarmTopic', {
    name: `lego-api-lambda-alarms-${stage}`,
    displayName: `LEGO API Lambda Alarms (${stage})`,

    tags: {
      Environment: stage,
      Purpose: 'LambdaAlarms',
    },
  })
}

/**
 * Subscribe email to SNS topic for alarm notifications
 *
 * @param topic - SNS Topic resource
 * @param email - Email address for notifications
 * @returns SNS Topic Subscription resource
 */
export function subscribeEmailToAlarms(
  topic: aws.sns.Topic,
  email: string,
): aws.sns.TopicSubscription {
  return new aws.sns.TopicSubscription('AlarmEmailSubscription', {
    topic: topic.arn,
    protocol: 'email',
    endpoint: email,
  })
}

/**
 * Create composite alarm for overall API health
 *
 * Triggers when multiple Lambda functions have errors simultaneously
 *
 * @param alarms - Array of CloudWatch Alarms to monitor
 * @param stage - Deployment stage
 * @param options - Optional configuration
 * @returns Composite CloudWatch Alarm
 */
export function createCompositeHealthAlarm(
  alarms: aws.cloudwatch.MetricAlarm[],
  stage: string,
  options?: {
    /** Minimum number of alarms that must be in ALARM state (default: 2) */
    threshold?: number
    /** SNS topic ARN for notifications */
    snsTopicArn?: string
  },
): aws.cloudwatch.CompositeAlarm {
  const threshold = options?.threshold ?? 2

  // Build alarm rule: at least N alarms in ALARM state
  const alarmNames = alarms.map(alarm => alarm.name)
  const alarmRule = `ALARM(${alarmNames.join(') OR ALARM(')})`

  return new aws.cloudwatch.CompositeAlarm('ApiHealthCompositeAlarm', {
    alarmName: `lego-api-health-composite-${stage}`,
    alarmDescription: `Overall API health - triggers when ${threshold}+ functions have errors`,
    alarmRule,
    actionsEnabled: true,
    alarmActions: options?.snsTopicArn ? [options.snsTopicArn] : [],

    tags: {
      Environment: stage,
      AlarmType: 'CompositeHealth',
    },
  })
}
