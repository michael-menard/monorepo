import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as docdb from 'aws-cdk-lib/aws-docdb'
import * as elasticache from 'aws-cdk-lib/aws-elasticache'
import * as opensearch from 'aws-cdk-lib/aws-opensearch'
import { Construct } from 'constructs'

export interface MonitoringStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'production'
  vpc: ec2.Vpc
  documentDb: docdb.DatabaseCluster
  rdsPostgres: rds.DatabaseInstance
  elastiCache: elasticache.CfnCacheCluster
  openSearch: opensearch.Domain
}

export class MonitoringStack extends cdk.Stack {
  public readonly alertTopic: sns.Topic
  public readonly dashboard: cloudwatch.Dashboard

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props)

    const { environment, documentDb, rdsPostgres, elastiCache, openSearch } = props

    // Create SNS topic for alerts
    this.alertTopic = new sns.Topic(this, 'AlertTopic', {
      displayName: `LegoMoc-${environment}-Alerts`,
      topicName: `LegoMoc-${environment}-Alerts`,
    })

    // Add email subscription for production
    if (environment === 'production') {
      this.alertTopic.addSubscription(
        new snsSubscriptions.EmailSubscription('admin@example.com') // Replace with actual email
      )
    }

    // Create CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'InfrastructureDashboard', {
      dashboardName: `LegoMoc-${environment}-Infrastructure`,
    })

    // Add database monitoring
    this.addDatabaseMonitoring(documentDb, rdsPostgres)
    
    // Add cache monitoring
    this.addCacheMonitoring(elastiCache)
    
    // Add search monitoring
    this.addSearchMonitoring(openSearch)
  }

  private addDatabaseMonitoring(documentDb: docdb.DatabaseCluster, rdsPostgres: rds.DatabaseInstance) {
    // DocumentDB metrics
    const docDbCpuMetric = new cloudwatch.Metric({
      namespace: 'AWS/DocDB',
      metricName: 'CPUUtilization',
      dimensionsMap: {
        DBClusterIdentifier: documentDb.clusterIdentifier,
      },
      statistic: 'Average',
    })

    const docDbConnectionsMetric = new cloudwatch.Metric({
      namespace: 'AWS/DocDB',
      metricName: 'DatabaseConnections',
      dimensionsMap: {
        DBClusterIdentifier: documentDb.clusterIdentifier,
      },
      statistic: 'Average',
    })

    // RDS metrics
    const rdsCpuMetric = new cloudwatch.Metric({
      namespace: 'AWS/RDS',
      metricName: 'CPUUtilization',
      dimensionsMap: {
        DBInstanceIdentifier: rdsPostgres.instanceIdentifier,
      },
      statistic: 'Average',
    })

    const rdsConnectionsMetric = new cloudwatch.Metric({
      namespace: 'AWS/RDS',
      metricName: 'DatabaseConnections',
      dimensionsMap: {
        DBInstanceIdentifier: rdsPostgres.instanceIdentifier,
      },
      statistic: 'Average',
    })

    // Create alarms
    new cloudwatch.Alarm(this, 'DocumentDbHighCpu', {
      metric: docDbCpuMetric,
      threshold: 80,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cloudwatch.SnsAction(this.alertTopic))

    new cloudwatch.Alarm(this, 'RdsHighCpu', {
      metric: rdsCpuMetric,
      threshold: 80,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cloudwatch.SnsAction(this.alertTopic))

    // Add to dashboard
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Database CPU Utilization',
        left: [docDbCpuMetric, rdsCpuMetric],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Database Connections',
        left: [docDbConnectionsMetric, rdsConnectionsMetric],
        width: 12,
        height: 6,
      })
    )
  }

  private addCacheMonitoring(elastiCache: elasticache.CfnCacheCluster) {
    // Redis metrics
    const redisCpuMetric = new cloudwatch.Metric({
      namespace: 'AWS/ElastiCache',
      metricName: 'CPUUtilization',
      dimensionsMap: {
        CacheClusterId: elastiCache.ref,
      },
      statistic: 'Average',
    })

    const redisMemoryMetric = new cloudwatch.Metric({
      namespace: 'AWS/ElastiCache',
      metricName: 'DatabaseMemoryUsagePercentage',
      dimensionsMap: {
        CacheClusterId: elastiCache.ref,
      },
      statistic: 'Average',
    })

    // Create alarms
    new cloudwatch.Alarm(this, 'RedisHighMemory', {
      metric: redisMemoryMetric,
      threshold: 90,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cloudwatch.SnsAction(this.alertTopic))

    // Add to dashboard
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Redis Performance',
        left: [redisCpuMetric],
        right: [redisMemoryMetric],
        width: 12,
        height: 6,
      })
    )
  }

  private addSearchMonitoring(openSearch: opensearch.Domain) {
    // OpenSearch metrics
    const searchCpuMetric = new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'CPUUtilization',
      dimensionsMap: {
        DomainName: openSearch.domainName,
        ClientId: cdk.Stack.of(this).account,
      },
      statistic: 'Average',
    })

    const searchStorageMetric = new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'StorageUtilization',
      dimensionsMap: {
        DomainName: openSearch.domainName,
        ClientId: cdk.Stack.of(this).account,
      },
      statistic: 'Average',
    })

    // Create alarms
    new cloudwatch.Alarm(this, 'OpenSearchHighStorage', {
      metric: searchStorageMetric,
      threshold: 85,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cloudwatch.SnsAction(this.alertTopic))

    // Add to dashboard
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'OpenSearch Performance',
        left: [searchCpuMetric],
        right: [searchStorageMetric],
        width: 12,
        height: 6,
      })
    )
  }
}
