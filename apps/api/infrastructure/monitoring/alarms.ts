/**
 * CloudWatch Alarms and SNS Notifications Infrastructure
 * Story 5.2: Configure CloudWatch Alarms and SNS Notifications
 *
 * This module creates comprehensive CloudWatch alarms for monitoring
 * critical infrastructure components with SNS and Slack notifications.
 *
 * Alarm Coverage:
 * - Lambda functions (errors, throttles, duration)
 * - API Gateway (5xx rate, latency)
 * - RDS PostgreSQL (CPU, connections, memory)
 * - ElastiCache Redis (evictions, CPU, memory)
 * - OpenSearch (cluster health, JVM memory)
 */

/**
 * Props for creating CloudWatch alarms
 */
export interface AlarmProps {
  /** MOC Instructions Lambda function */
  readonly mocFunction: { name: $util.Output<string>; arn: $util.Output<string> }
  /** Gallery Lambda function */
  readonly galleryFunction: { name: $util.Output<string>; arn: $util.Output<string> }
  /** Wishlist Lambda function */
  readonly wishlistFunction: { name: $util.Output<string>; arn: $util.Output<string> }
  /** Health Check Lambda function */
  readonly healthCheckFunction: { name: $util.Output<string>; arn: $util.Output<string> }
  /** API Gateway ID */
  readonly apiGateway: { id: $util.Output<string> }
  /** RDS Cluster Identifier */
  readonly database: { clusterIdentifier: $util.Output<string> }
  /** Redis Cluster ID */
  readonly redis: { clusterId: $util.Output<string> }
  /** OpenSearch Domain Name */
  readonly openSearch: { domainName: $util.Output<string> }
  /** Email address for SNS notifications */
  readonly emailAddress: string
  /** Slack webhook URL (optional) */
  readonly slackWebhookUrl?: string
  /** Current stage (dev, staging, production) */
  readonly stage: string
  /** AWS region */
  readonly region: string
  /** AWS account ID */
  readonly accountId: string
}

/**
 * Create comprehensive CloudWatch alarms with SNS notifications
 *
 * @param props - Configuration for creating alarms
 * @returns SNS topic ARN for alarm actions
 */
export function createAlarms(props: AlarmProps): { topicArn: $util.Output<string> } {
  // ========================================
  // SNS Topic for Alarm Notifications
  // ========================================

  const alarmTopic = new aws.sns.Topic('AlarmTopic', {
    name: `lego-api-production-alarms-${props.stage}`,
    displayName: 'LEGO API Production Alarms',
    tags: {
      Environment: props.stage,
      Service: 'lego-api-serverless',
      Feature: 'monitoring',
    },
  })

  // Subscribe email to SNS topic
  new aws.sns.TopicSubscription('AlarmEmailSubscription', {
    topic: alarmTopic.arn,
    protocol: 'email',
    endpoint: props.emailAddress,
  })

  // ========================================
  // Slack Integration (Optional)
  // ========================================

  if (props.slackWebhookUrl) {
    // Lambda function to forward SNS messages to Slack
    const slackForwarder = new aws.lambda.Function('SlackForwarder', {
      name: `lego-api-slack-forwarder-${props.stage}`,
      runtime: 'nodejs20.x',
      handler: 'index.handler',
      role: new aws.iam.Role('SlackForwarderRole', {
        assumeRolePolicy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { Service: 'lambda.amazonaws.com' },
              Action: 'sts:AssumeRole',
            },
          ],
        }),
        managedPolicyArns: [
          'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        ],
      }).arn,
      code: new aws.lambda.FunctionCodeArchive(
        new $asset.AssetArchive({
          'index.js': new $asset.StringAsset(`
const https = require('https');

exports.handler = async (event) => {
  const snsMessage = JSON.parse(event.Records[0].Sns.Message);
  const alarmName = snsMessage.AlarmName;
  const newState = snsMessage.NewStateValue;
  const reason = snsMessage.NewStateReason;
  const timestamp = snsMessage.StateChangeTime;

  const color = newState === 'ALARM' ? 'danger' : 'good';
  const emoji = newState === 'ALARM' ? ':rotating_light:' : ':white_check_mark:';

  const slackPayload = {
    attachments: [
      {
        color: color,
        title: \`\${emoji} CloudWatch Alarm: \${alarmName}\`,
        fields: [
          { title: 'State', value: newState, short: true },
          { title: 'Time', value: timestamp, short: true },
          { title: 'Reason', value: reason, short: false },
        ],
        footer: 'LEGO API Production Monitoring',
        ts: Math.floor(new Date(timestamp).getTime() / 1000),
      },
    ],
  };

  return new Promise((resolve, reject) => {
    const webhookUrl = new URL('${props.slackWebhookUrl}');
    const req = https.request({
      hostname: webhookUrl.hostname,
      path: webhookUrl.pathname + webhookUrl.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      resolve({ statusCode: res.statusCode });
    });

    req.on('error', reject);
    req.write(JSON.stringify(slackPayload));
    req.end();
  });
};
          `),
        })
      ),
      timeout: 30,
      tags: {
        Environment: props.stage,
        Service: 'lego-api-serverless',
        Feature: 'monitoring',
      },
    })

    // Subscribe Lambda to SNS topic
    new aws.sns.TopicSubscription('AlarmSlackSubscription', {
      topic: alarmTopic.arn,
      protocol: 'lambda',
      endpoint: slackForwarder.arn,
    })

    // Grant SNS permission to invoke Lambda
    new aws.lambda.Permission('SlackForwarderInvokePermission', {
      action: 'lambda:InvokeFunction',
      function: slackForwarder.name,
      principal: 'sns.amazonaws.com',
      sourceArn: alarmTopic.arn,
    })
  }

  // ========================================
  // Lambda Function Alarms
  // ========================================

  const lambdaFunctions = [
    { name: 'MOC', functionName: props.mocFunction.name },
    { name: 'Gallery', functionName: props.galleryFunction.name },
    { name: 'Wishlist', functionName: props.wishlistFunction.name },
    { name: 'HealthCheck', functionName: props.healthCheckFunction.name },
  ]

  lambdaFunctions.forEach(lambda => {
    // Error alarm (>10 errors in 5 minutes)
    const _errorAlarm = new aws.cloudwatch.MetricAlarm(`${lambda.name}ErrorAlarm`, {
      name: `lego-api-${lambda.name.toLowerCase()}-errors-${props.stage}`,
      comparisonOperator: 'GreaterThanThreshold',
      evaluationPeriods: 1,
      threshold: 10,
      actionsEnabled: true,
      alarmActions: [alarmTopic.arn],
      metricName: 'Errors',
      namespace: 'AWS/Lambda',
      period: 300, // 5 minutes
      statistic: 'Sum',
      treatMissingData: 'notBreaching',
      dimensions: {
        FunctionName: lambda.functionName,
      },
      alarmDescription: `${lambda.name} function has >10 errors in 5 minutes`,
      tags: {
        Environment: props.stage,
        Service: 'lego-api-serverless',
        Function: lambda.name,
      },
    })

    // Throttle alarm (>5 throttles in 5 minutes)
    const _throttleAlarm = new aws.cloudwatch.MetricAlarm(`${lambda.name}ThrottleAlarm`, {
      name: `lego-api-${lambda.name.toLowerCase()}-throttles-${props.stage}`,
      comparisonOperator: 'GreaterThanThreshold',
      evaluationPeriods: 1,
      threshold: 5,
      actionsEnabled: true,
      alarmActions: [alarmTopic.arn],
      metricName: 'Throttles',
      namespace: 'AWS/Lambda',
      period: 300, // 5 minutes
      statistic: 'Sum',
      treatMissingData: 'notBreaching',
      dimensions: {
        FunctionName: lambda.functionName,
      },
      alarmDescription: `${lambda.name} function has >5 throttles in 5 minutes`,
      tags: {
        Environment: props.stage,
        Service: 'lego-api-serverless',
        Function: lambda.name,
      },
    })

    // Duration alarm (p99 > 10 seconds)
    const _durationAlarm = new aws.cloudwatch.MetricAlarm(`${lambda.name}DurationAlarm`, {
      name: `lego-api-${lambda.name.toLowerCase()}-duration-${props.stage}`,
      comparisonOperator: 'GreaterThanThreshold',
      evaluationPeriods: 2, // Must breach for 2 consecutive periods
      threshold: 10000, // 10 seconds in milliseconds
      actionsEnabled: true,
      alarmActions: [alarmTopic.arn],
      metricQueries: [
        {
          id: 'duration_p99',
          returnData: true,
          metric: {
            metricName: 'Duration',
            namespace: 'AWS/Lambda',
            period: 300, // 5 minutes
            stat: 'p99',
            dimensions: {
              FunctionName: lambda.functionName,
            },
          },
        },
      ],
      treatMissingData: 'notBreaching',
      alarmDescription: `${lambda.name} function p99 duration >10 seconds`,
      tags: {
        Environment: props.stage,
        Service: 'lego-api-serverless',
        Function: lambda.name,
      },
    })
  })

  // ========================================
  // API Gateway Alarms
  // ========================================

  // 5xx error rate alarm (>5%)
  const _apiGateway5xxAlarm = new aws.cloudwatch.MetricAlarm('ApiGateway5xxAlarm', {
    name: `lego-api-gateway-5xx-errors-${props.stage}`,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods: 2,
    threshold: 5, // 5% error rate
    actionsEnabled: true,
    alarmActions: [alarmTopic.arn],
    metricQueries: [
      {
        id: 'error_rate',
        expression: '(m1 / m2) * 100',
        label: '5xx Error Rate (%)',
        returnData: true,
      },
      {
        id: 'm1',
        returnData: false,
        metric: {
          metricName: '5XXError',
          namespace: 'AWS/ApiGateway',
          period: 300, // 5 minutes
          stat: 'Sum',
          dimensions: {
            ApiId: props.apiGateway.id,
          },
        },
      },
      {
        id: 'm2',
        returnData: false,
        metric: {
          metricName: 'Count',
          namespace: 'AWS/ApiGateway',
          period: 300, // 5 minutes
          stat: 'Sum',
          dimensions: {
            ApiId: props.apiGateway.id,
          },
        },
      },
    ],
    treatMissingData: 'notBreaching',
    alarmDescription: 'API Gateway 5xx error rate >5%',
    tags: {
      Environment: props.stage,
      Service: 'lego-api-serverless',
    },
  })

  // API Gateway latency alarm (p95 > 2 seconds)
  const _apiGatewayLatencyAlarm = new aws.cloudwatch.MetricAlarm('ApiGatewayLatencyAlarm', {
    name: `lego-api-gateway-latency-${props.stage}`,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods: 2,
    threshold: 2000, // 2 seconds in milliseconds
    actionsEnabled: true,
    alarmActions: [alarmTopic.arn],
    metricQueries: [
      {
        id: 'latency_p95',
        returnData: true,
        metric: {
          metricName: 'Latency',
          namespace: 'AWS/ApiGateway',
          period: 300, // 5 minutes
          stat: 'p95',
          dimensions: {
            ApiId: props.apiGateway.id,
          },
        },
      },
    ],
    treatMissingData: 'notBreaching',
    alarmDescription: 'API Gateway p95 latency >2 seconds',
    tags: {
      Environment: props.stage,
      Service: 'lego-api-serverless',
    },
  })

  // ========================================
  // RDS PostgreSQL Alarms
  // ========================================

  // CPU utilization alarm (>80% for 10 minutes)
  const _rdsCpuAlarm = new aws.cloudwatch.MetricAlarm('DatabaseCpuAlarm', {
    name: `lego-api-database-cpu-${props.stage}`,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods: 2, // 10 minutes total (2 x 5-minute periods)
    threshold: 80, // 80%
    actionsEnabled: true,
    alarmActions: [alarmTopic.arn],
    metricName: 'CPUUtilization',
    namespace: 'AWS/RDS',
    period: 300, // 5 minutes
    statistic: 'Average',
    treatMissingData: 'notBreaching',
    dimensions: {
      DBClusterIdentifier: props.database.clusterIdentifier,
    },
    alarmDescription: 'RDS CPU utilization >80% for 10 minutes',
    tags: {
      Environment: props.stage,
      Service: 'lego-api-serverless',
    },
  })

  // Database connections alarm (>80% of max connections)
  // Assuming max connections is 100 (adjust based on instance type)
  const _rdsConnectionsAlarm = new aws.cloudwatch.MetricAlarm('DatabaseConnectionsAlarm', {
    name: `lego-api-database-connections-${props.stage}`,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods: 1,
    threshold: 80, // 80% of 100 max connections
    actionsEnabled: true,
    alarmActions: [alarmTopic.arn],
    metricName: 'DatabaseConnections',
    namespace: 'AWS/RDS',
    period: 300, // 5 minutes
    statistic: 'Average',
    treatMissingData: 'notBreaching',
    dimensions: {
      DBClusterIdentifier: props.database.clusterIdentifier,
    },
    alarmDescription: 'RDS connections >80 (80% of max)',
    tags: {
      Environment: props.stage,
      Service: 'lego-api-serverless',
    },
  })

  // Freeable memory alarm (<500 MB)
  const _rdsMemoryAlarm = new aws.cloudwatch.MetricAlarm('DatabaseMemoryAlarm', {
    name: `lego-api-database-memory-${props.stage}`,
    comparisonOperator: 'LessThanThreshold',
    evaluationPeriods: 2,
    threshold: 500 * 1024 * 1024, // 500 MB in bytes
    actionsEnabled: true,
    alarmActions: [alarmTopic.arn],
    metricName: 'FreeableMemory',
    namespace: 'AWS/RDS',
    period: 300, // 5 minutes
    statistic: 'Average',
    treatMissingData: 'notBreaching',
    dimensions: {
      DBClusterIdentifier: props.database.clusterIdentifier,
    },
    alarmDescription: 'RDS freeable memory <500 MB',
    tags: {
      Environment: props.stage,
      Service: 'lego-api-serverless',
    },
  })

  // ========================================
  // ElastiCache Redis Alarms
  // ========================================

  // Evictions alarm (>100 in 5 minutes)
  const _redisEvictionsAlarm = new aws.cloudwatch.MetricAlarm('RedisEvictionsAlarm', {
    name: `lego-api-redis-evictions-${props.stage}`,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods: 1,
    threshold: 100,
    actionsEnabled: true,
    alarmActions: [alarmTopic.arn],
    metricName: 'Evictions',
    namespace: 'AWS/ElastiCache',
    period: 300, // 5 minutes
    statistic: 'Sum',
    treatMissingData: 'notBreaching',
    dimensions: {
      CacheClusterId: props.redis.clusterId,
    },
    alarmDescription: 'Redis evictions >100 in 5 minutes',
    tags: {
      Environment: props.stage,
      Service: 'lego-api-serverless',
    },
  })

  // CPU utilization alarm (>75%)
  const _redisCpuAlarm = new aws.cloudwatch.MetricAlarm('RedisCpuAlarm', {
    name: `lego-api-redis-cpu-${props.stage}`,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods: 2,
    threshold: 75,
    actionsEnabled: true,
    alarmActions: [alarmTopic.arn],
    metricName: 'CPUUtilization',
    namespace: 'AWS/ElastiCache',
    period: 300, // 5 minutes
    statistic: 'Average',
    treatMissingData: 'notBreaching',
    dimensions: {
      CacheClusterId: props.redis.clusterId,
    },
    alarmDescription: 'Redis CPU utilization >75%',
    tags: {
      Environment: props.stage,
      Service: 'lego-api-serverless',
    },
  })

  // Memory pressure alarm (>75%)
  const _redisMemoryAlarm = new aws.cloudwatch.MetricAlarm('RedisMemoryAlarm', {
    name: `lego-api-redis-memory-${props.stage}`,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods: 2,
    threshold: 75,
    actionsEnabled: true,
    alarmActions: [alarmTopic.arn],
    metricName: 'DatabaseMemoryUsagePercentage',
    namespace: 'AWS/ElastiCache',
    period: 300, // 5 minutes
    statistic: 'Average',
    treatMissingData: 'notBreaching',
    dimensions: {
      CacheClusterId: props.redis.clusterId,
    },
    alarmDescription: 'Redis memory usage >75%',
    tags: {
      Environment: props.stage,
      Service: 'lego-api-serverless',
    },
  })

  // ========================================
  // OpenSearch Alarms
  // ========================================

  // Cluster status red alarm
  const _openSearchRedAlarm = new aws.cloudwatch.MetricAlarm('OpenSearchRedAlarm', {
    name: `lego-api-opensearch-cluster-red-${props.stage}`,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    evaluationPeriods: 1,
    threshold: 1, // Red status = 1
    actionsEnabled: true,
    alarmActions: [alarmTopic.arn],
    metricName: 'ClusterStatus.red',
    namespace: 'AWS/ES',
    period: 60, // 1 minute
    statistic: 'Maximum',
    treatMissingData: 'notBreaching',
    dimensions: {
      DomainName: props.openSearch.domainName,
      ClientId: props.accountId,
    },
    alarmDescription: 'OpenSearch cluster status is RED',
    tags: {
      Environment: props.stage,
      Service: 'lego-api-serverless',
    },
  })

  // Cluster status yellow alarm
  const _openSearchYellowAlarm = new aws.cloudwatch.MetricAlarm('OpenSearchYellowAlarm', {
    name: `lego-api-opensearch-cluster-yellow-${props.stage}`,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    evaluationPeriods: 3, // 15 minutes total (3 x 5-minute periods)
    threshold: 1,
    actionsEnabled: true,
    alarmActions: [alarmTopic.arn],
    metricName: 'ClusterStatus.yellow',
    namespace: 'AWS/ES',
    period: 300, // 5 minutes
    statistic: 'Maximum',
    treatMissingData: 'notBreaching',
    dimensions: {
      DomainName: props.openSearch.domainName,
      ClientId: props.accountId,
    },
    alarmDescription: 'OpenSearch cluster status is YELLOW for 15 minutes',
    tags: {
      Environment: props.stage,
      Service: 'lego-api-serverless',
    },
  })

  // JVM memory pressure alarm (>90%)
  const _openSearchJvmMemoryAlarm = new aws.cloudwatch.MetricAlarm('OpenSearchJvmMemoryAlarm', {
    name: `lego-api-opensearch-jvm-memory-${props.stage}`,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods: 2,
    threshold: 90,
    actionsEnabled: true,
    alarmActions: [alarmTopic.arn],
    metricName: 'JVMMemoryPressure',
    namespace: 'AWS/ES',
    period: 300, // 5 minutes
    statistic: 'Maximum',
    treatMissingData: 'notBreaching',
    dimensions: {
      DomainName: props.openSearch.domainName,
      ClientId: props.accountId,
    },
    alarmDescription: 'OpenSearch JVM memory pressure >90%',
    tags: {
      Environment: props.stage,
      Service: 'lego-api-serverless',
    },
  })

  return {
    topicArn: alarmTopic.arn,
  }
}
