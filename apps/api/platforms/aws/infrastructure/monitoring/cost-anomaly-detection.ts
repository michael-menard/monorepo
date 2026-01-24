/**
 * AWS Cost Anomaly Detection Configuration
 * Story 5.7: Configure AWS Cost Monitoring and Budgets (AC 6)
 *
 * Creates:
 * - Cost anomaly monitor for dimensional analysis
 * - Daily anomaly subscription with SNS alerts
 * - Threshold-based anomaly detection ($20 minimum impact)
 */

import * as aws from '@pulumi/aws'

export interface AnomalyDetectionConfig {
  /**
   * SNS topic ARN for anomaly alerts
   */
  readonly snsTopicArn: string

  /**
   * Minimum anomaly impact threshold in USD
   * Anomalies below this threshold will not trigger alerts
   */
  readonly thresholdAmount: number

  /**
   * Stage/environment name
   */
  readonly stage: string
}

export interface AnomalyDetectionResources {
  /**
   * Cost anomaly monitor
   */
  readonly monitor: aws.costexplorer.AnomalyMonitor

  /**
   * Cost anomaly subscription
   */
  readonly subscription: aws.costexplorer.AnomalySubscription
}

/**
 * Create AWS Cost Anomaly Detection with SNS integration
 */
export function createAnomalyDetection(config: AnomalyDetectionConfig): AnomalyDetectionResources {
  const { snsTopicArn, thresholdAmount, stage } = config

  // Create cost anomaly monitor
  // Uses dimensional monitoring to detect anomalies by AWS service
  const monitor = new aws.costexplorer.AnomalyMonitor('LegoApiCostAnomalyMonitor', {
    name: `lego-api-cost-anomaly-monitor-${stage}`,
    monitorType: 'DIMENSIONAL',
    monitorDimension: 'SERVICE',
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
      // Cost allocation tags
      CostOptimization: 'Review',
    },
  })

  // Create anomaly subscription with daily frequency
  const subscription = new aws.costexplorer.AnomalySubscription('LegoApiCostAnomalySubscription', {
    name: `lego-api-cost-anomaly-alerts-${stage}`,
    frequency: 'DAILY',
    monitorArnList: [monitor.arn],
    subscribers: [
      {
        type: 'SNS',
        address: snsTopicArn,
      },
    ],
    thresholdExpression: {
      and: [
        {
          dimension: {
            key: 'ANOMALY_TOTAL_IMPACT_ABSOLUTE',
            matchOptions: ['GREATER_THAN_OR_EQUAL'],
            values: [thresholdAmount.toString()],
          },
        },
      ],
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
      // Cost allocation tags
      CostOptimization: 'Review',
    },
  })

  return {
    monitor,
    subscription,
  }
}
