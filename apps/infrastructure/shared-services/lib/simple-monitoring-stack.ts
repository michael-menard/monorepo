import * as cdk from 'aws-cdk-lib'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions'
import * as sns from 'aws-cdk-lib/aws-sns'
// import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions' // For future use
import { Construct } from 'constructs'

export interface SimpleMonitoringStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'production'
  rdsInstanceId?: string
  elastiCacheClusterId?: string
}

export class SimpleMonitoringStack extends cdk.Stack {
  public readonly alertTopic: sns.Topic
  public readonly dashboard: cloudwatch.Dashboard

  constructor(scope: Construct, id: string, props: SimpleMonitoringStackProps) {
    super(scope, id, props)

    const { environment, rdsInstanceId, elastiCacheClusterId } = props

    // Create SNS topic for alerts
    this.alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `LegoMoc-${environment}-Alerts`,
      displayName: `LEGO MOC Platform ${environment} Alerts`,
    })

    // Add email subscription for production/staging
    if (environment !== 'dev') {
      // Note: In real deployment, you'd want to add actual email addresses
      // this.alertTopic.addSubscription(
      //   new snsSubscriptions.EmailSubscription('alerts@example.com')
      // )
    }

    // Create CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'MonitoringDashboard', {
      dashboardName: `LegoMoc-${environment}-Dashboard`,
    })

    // Add VPC and general AWS metrics
    this.addGeneralMetrics()

    // Add RDS metrics if RDS instance is provided
    if (rdsInstanceId) {
      this.addRdsMetrics(rdsInstanceId)
    }

    // Add ElastiCache metrics if cluster is provided
    if (elastiCacheClusterId) {
      this.addElastiCacheMetrics(elastiCacheClusterId)
    }

    // Create basic alarms
    this.createAlarms(environment, rdsInstanceId, elastiCacheClusterId)

    // Output SNS topic ARN
    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: this.alertTopic.topicArn,
      exportName: `${id}-AlertTopicArn`,
      description: 'SNS topic ARN for alerts',
    })

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${cdk.Stack.of(this).region}#dashboards:name=${this.dashboard.dashboardName}`,
      exportName: `${id}-DashboardUrl`,
      description: 'CloudWatch Dashboard URL',
    })
  }

  private addGeneralMetrics() {
    // Add general AWS account metrics
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'AWS Account Overview',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Billing',
            metricName: 'EstimatedCharges',
            dimensionsMap: {
              Currency: 'USD',
            },
            statistic: 'Maximum',
          }),
        ],
        width: 12,
        height: 6,
      })
    )
  }

  private addRdsMetrics(instanceId: string) {
    // RDS CPU and Connection metrics
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'RDS Database Metrics',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/RDS',
            metricName: 'CPUUtilization',
            dimensionsMap: {
              DBInstanceIdentifier: instanceId,
            },
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/RDS',
            metricName: 'DatabaseConnections',
            dimensionsMap: {
              DBInstanceIdentifier: instanceId,
            },
          }),
        ],
        width: 12,
        height: 6,
      }),
      
      new cloudwatch.GraphWidget({
        title: 'RDS Storage and I/O',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/RDS',
            metricName: 'FreeStorageSpace',
            dimensionsMap: {
              DBInstanceIdentifier: instanceId,
            },
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/RDS',
            metricName: 'ReadLatency',
            dimensionsMap: {
              DBInstanceIdentifier: instanceId,
            },
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/RDS',
            metricName: 'WriteLatency',
            dimensionsMap: {
              DBInstanceIdentifier: instanceId,
            },
          }),
        ],
        width: 12,
        height: 6,
      })
    )
  }

  private addElastiCacheMetrics(clusterId: string) {
    // ElastiCache metrics
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'ElastiCache Redis Metrics',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ElastiCache',
            metricName: 'CPUUtilization',
            dimensionsMap: {
              CacheClusterId: clusterId,
            },
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/ElastiCache',
            metricName: 'CurrConnections',
            dimensionsMap: {
              CacheClusterId: clusterId,
            },
          }),
        ],
        width: 12,
        height: 6,
      })
    )
  }

  private createAlarms(environment: string, rdsInstanceId?: string, elastiCacheClusterId?: string) {
    // Only create alarms for staging and production
    if (environment === 'dev') {
      return
    }

    // RDS CPU alarm
    if (rdsInstanceId) {
      const rdsHighCpuAlarm = new cloudwatch.Alarm(this, 'RdsHighCpuAlarm', {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/RDS',
          metricName: 'CPUUtilization',
          dimensionsMap: {
            DBInstanceIdentifier: rdsInstanceId,
          },
        }),
        threshold: 80,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      })

      rdsHighCpuAlarm.addAlarmAction(
        new cloudwatchActions.SnsAction(this.alertTopic)
      )
    }

    // ElastiCache CPU alarm
    if (elastiCacheClusterId) {
      const cacheHighCpuAlarm = new cloudwatch.Alarm(this, 'CacheHighCpuAlarm', {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ElastiCache',
          metricName: 'CPUUtilization',
          dimensionsMap: {
            CacheClusterId: elastiCacheClusterId,
          },
        }),
        threshold: 75,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      })

      cacheHighCpuAlarm.addAlarmAction(
        new cloudwatchActions.SnsAction(this.alertTopic)
      )
    }
  }
}
