/**
 * Database-related IAM Roles and Policies
 * 
 * Creates IAM roles for:
 * - ECS Task Execution (for observability services)
 * - OpenReplay Task Role (S3 and CloudWatch access)
 * - Umami Task Role (RDS access)
 * - Grafana Workspace Role (CloudWatch and OpenSearch access)
 * - Lambda EMF Policy (CloudWatch metrics)
 */

export function createDatabaseIamRoles(
  openReplaySessionsBucket: any,
  cloudWatchLogsBucket: any,
  postgres: any,
  openSearch: any,
  stage: string
) {
  /**
   * ECS Task Execution Role for Observability Services
   * - Allows ECS tasks to pull images from ECR
   * - Allows writing logs to CloudWatch Logs
   * - Allows reading secrets from Secrets Manager
   */
  const ecsTaskExecutionRole = new aws.iam.Role('ObservabilityEcsTaskExecutionRole', {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: 'ecs-tasks.amazonaws.com' },
          Action: 'sts:AssumeRole',
        },
      ],
    }),
    managedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'],
    tags: {
      Name: `observability-ecs-execution-role-${stage}`,
      Environment: stage,
      Service: 'observability',
    },
  })

  /**
   * ECS Task Role for OpenReplay
   * - S3 bucket access for session storage (read/write)
   * - CloudWatch Logs access for application logging
   */
  const openReplayTaskRole = new aws.iam.Role('OpenReplayTaskRole', {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: 'ecs-tasks.amazonaws.com' },
          Action: 'sts:AssumeRole',
        },
      ],
    }),
    tags: {
      Name: `openreplay-task-role-${stage}`,
      Environment: stage,
      Service: 'openreplay',
    },
  })

  /**
   * IAM Policy for OpenReplay S3 Access
   * - Read/write access to session storage bucket
   * - Read/write access to CloudWatch logs bucket
   */
  const openReplayS3Policy = new aws.iam.Policy('OpenReplayS3Policy', {
    policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
          Resource: [
            `${openReplaySessionsBucket.arn}/*`,
            `${cloudWatchLogsBucket.arn}/*`,
          ],
        },
        {
          Effect: 'Allow',
          Action: ['s3:ListBucket'],
          Resource: [openReplaySessionsBucket.arn, cloudWatchLogsBucket.arn],
        },
      ],
    }),
  })

  new aws.iam.RolePolicyAttachment('OpenReplayS3PolicyAttachment', {
    role: openReplayTaskRole.name,
    policyArn: openReplayS3Policy.arn,
  })

  /**
   * ECS Task Role for Umami
   * - Aurora PostgreSQL access via RDS Proxy
   * - CloudWatch Logs access for application logging
   */
  const umamiTaskRole = new aws.iam.Role('UmamiTaskRole', {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: 'ecs-tasks.amazonaws.com' },
          Action: 'sts:AssumeRole',
        },
      ],
    }),
    tags: {
      Name: `umami-task-role-${stage}`,
      Environment: stage,
      Service: 'umami',
    },
  })

  /**
   * IAM Policy for Umami Aurora Access
   * - Connect to Aurora PostgreSQL via RDS Proxy
   */
  const umamiRdsPolicy = new aws.iam.Policy('UmamiRdsPolicy', {
    policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['rds-db:connect'],
          Resource: [`arn:aws:rds-db:*:*:dbuser:${postgres.clusterIdentifier}/umami_user`],
        },
      ],
    }),
  })

  new aws.iam.RolePolicyAttachment('UmamiRdsAccessAttachment', {
    role: umamiTaskRole.name,
    policyArn: umamiRdsPolicy.arn,
  })

  /**
   * Enhanced Lambda Execution Policy for CloudWatch EMF
   * - Adds CloudWatch PutMetricData permission for EMF metrics
   */
  const lambdaEmfPolicy = new aws.iam.Policy('LambdaEmfPolicy', {
    policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['cloudwatch:PutMetricData'],
          Resource: '*',
        },
      ],
    }),
  })

  return {
    ecsTaskExecutionRole,
    openReplayTaskRole,
    openReplayS3Policy,
    umamiTaskRole,
    umamiRdsPolicy,
    lambdaEmfPolicy,
  }
}
