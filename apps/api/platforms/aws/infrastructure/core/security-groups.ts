/**
 * Security Groups for LEGO API Serverless Infrastructure
 *
 * Creates security groups for:
 * - Lambda Functions (outbound access to RDS, Redis, OpenSearch, internet)
 * - RDS PostgreSQL (inbound from Lambda only)
 * - OpenSearch (inbound from Lambda only)
 * - Observability services (OpenReplay, Umami, ALB)
 */

export function createSecurityGroups(vpc: any, stage: string) {
  /**
   * Security Group for Lambda Functions
   * - Allows all outbound traffic (needed for RDS, Redis, OpenSearch, internet)
   */
  const lambdaSecurityGroup = new aws.ec2.SecurityGroup('LambdaSecurityGroup', {
    vpcId: vpc.id,
    description: 'Security group for Lambda functions',
    egress: [
      {
        protocol: '-1', // All protocols
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ['0.0.0.0/0'], // All destinations
      },
    ],
    tags: {
      Name: `lambda-sg-${stage}`,
      Environment: stage,
      Project: 'lego-api-serverless',
    },
  })

  /**
   * Security Group for RDS PostgreSQL
   * - Allows inbound traffic from Lambda security group only on port 5432
   */
  const rdsSecurityGroup = new aws.ec2.SecurityGroup('RdsSecurityGroup', {
    vpcId: vpc.id,
    description: 'Security group for RDS PostgreSQL',
    ingress: [
      {
        protocol: 'tcp',
        fromPort: 5432,
        toPort: 5432,
        securityGroups: [lambdaSecurityGroup.id],
      },
    ],
    tags: {
      Name: `rds-sg-${stage}`,
      Environment: stage,
      Project: 'lego-api-serverless',
    },
  })

  /**
   * Security Group for OpenSearch
   * - Allows inbound traffic from Lambda security group only on port 443 (HTTPS)
   */
  const openSearchSecurityGroup = new aws.ec2.SecurityGroup('OpenSearchSecurityGroup', {
    vpcId: vpc.id,
    description: 'Security group for OpenSearch domain',
    ingress: [
      {
        protocol: 'tcp',
        fromPort: 443,
        toPort: 443,
        securityGroups: [lambdaSecurityGroup.id],
      },
    ],
    tags: {
      Name: `opensearch-sg-${stage}`,
      Environment: stage,
      Project: 'lego-api-serverless',
    },
  })

  /**
   * Security Group for OpenReplay ECS Tasks
   * - HTTP/HTTPS ingress from ALB for web UI access
   * - Egress for S3 (session storage) and Aurora (metadata)
   */
  const openReplaySecurityGroup = new aws.ec2.SecurityGroup('OpenReplaySecurityGroup', {
    vpcId: vpc.id,
    description: 'Security group for OpenReplay ECS tasks',
    egress: [
      {
        protocol: '-1', // All protocols
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ['0.0.0.0/0'], // All destinations
      },
    ],
    tags: {
      Name: `openreplay-sg-${stage}`,
      Environment: stage,
      Project: 'lego-api-serverless',
    },
  })

  /**
   * Security Group for Umami ECS Tasks
   * - HTTP/HTTPS ingress from ALB for web UI access
   * - Egress for Aurora database access
   */
  const umamiSecurityGroup = new aws.ec2.SecurityGroup('UmamiSecurityGroup', {
    vpcId: vpc.id,
    description: 'Security group for Umami ECS tasks',
    egress: [
      {
        protocol: '-1', // All protocols
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ['0.0.0.0/0'], // All destinations
      },
    ],
    tags: {
      Name: `umami-sg-${stage}`,
      Environment: stage,
      Project: 'lego-api-serverless',
    },
  })

  /**
   * Security Group for Observability ALB
   * - HTTP/HTTPS ingress from internet (0.0.0.0/0)
   * - Egress to ECS tasks (OpenReplay, Umami)
   */
  const observabilityAlbSecurityGroup = new aws.ec2.SecurityGroup('ObservabilityAlbSecurityGroup', {
    vpcId: vpc.id,
    description: 'Security group for observability ALB',
    ingress: [
      {
        protocol: 'tcp',
        fromPort: 80,
        toPort: 80,
        cidrBlocks: ['0.0.0.0/0'], // HTTP from internet
      },
      {
        protocol: 'tcp',
        fromPort: 443,
        toPort: 443,
        cidrBlocks: ['0.0.0.0/0'], // HTTPS from internet
      },
    ],
    egress: [
      {
        protocol: 'tcp',
        fromPort: 80,
        toPort: 80,
        securityGroups: [openReplaySecurityGroup.id, umamiSecurityGroup.id],
      },
      {
        protocol: 'tcp',
        fromPort: 443,
        toPort: 443,
        securityGroups: [openReplaySecurityGroup.id, umamiSecurityGroup.id],
      },
    ],
    tags: {
      Name: `observability-alb-sg-${stage}`,
      Environment: stage,
      Project: 'lego-api-serverless',
    },
  })

  return {
    lambdaSecurityGroup,
    rdsSecurityGroup,
    openSearchSecurityGroup,
    openReplaySecurityGroup,
    umamiSecurityGroup,
    observabilityAlbSecurityGroup,
  }
}
