import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as elasticache from 'aws-cdk-lib/aws-elasticache'
import * as opensearch from 'aws-cdk-lib/aws-elasticsearch'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'

export interface LegoApiStackProps extends cdk.StackProps {
  environment: 'staging' | 'production'
  vpcId?: string // Optional: use existing VPC (deprecated - use shared infrastructure)
  domainName?: string
  useSharedInfrastructure?: boolean // Use shared VPC, RDS, Redis, and OpenSearch
}

export class LegoApiStack extends cdk.Stack {
  public readonly service: ecs.FargateService
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer
  public readonly database?: rds.DatabaseInstance // Optional when using shared infrastructure
  public readonly redis?: elasticache.CfnCacheCluster // Optional when using shared infrastructure
  public readonly opensearch?: opensearch.Domain // Optional when using shared infrastructure

  constructor(scope: Construct, id: string, props: LegoApiStackProps) {
    super(scope, id, props)

    const { environment, vpcId, useSharedInfrastructure = true } = props
    // domainName is available in props but not used in this implementation

    // VPC - use shared infrastructure or fallback to existing/new VPC
    const vpc = useSharedInfrastructure
      ? ec2.Vpc.fromVpcAttributes(this, 'SharedVpc', {
          vpcId: cdk.Fn.importValue(`LegoMoc-${environment}-Vpc-VpcId`),
          availabilityZones: ['us-east-1a', 'us-east-1b'],
          publicSubnetIds: [
            cdk.Fn.importValue(`LegoMoc-${environment}-Vpc-PublicSubnet1Id`),
            cdk.Fn.importValue(`LegoMoc-${environment}-Vpc-PublicSubnet2Id`),
          ],
          privateSubnetIds: [
            cdk.Fn.importValue(`LegoMoc-${environment}-Vpc-PrivateSubnet1Id`),
            cdk.Fn.importValue(`LegoMoc-${environment}-Vpc-PrivateSubnet2Id`),
          ],
          isolatedSubnetIds: [
            cdk.Fn.importValue(`LegoMoc-${environment}-Vpc-IsolatedSubnet1Id`),
            cdk.Fn.importValue(`LegoMoc-${environment}-Vpc-IsolatedSubnet2Id`),
          ],
        })
      : vpcId
      ? ec2.Vpc.fromLookup(this, 'Vpc', { vpcId })
      : new ec2.Vpc(this, 'LegoApiVpc', {
          maxAzs: 2,
          natGateways: 1,
        })

    // Security Groups
    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc,
      description: 'Security group for LEGO API ALB',
      allowAllOutbound: true,
    })
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80))
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443))

    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc,
      description: 'Security group for LEGO API ECS',
      allowAllOutbound: true,
    })
    ecsSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(3000))

    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      description: 'Security group for databases',
      allowAllOutbound: false,
    })
    dbSecurityGroup.addIngressRule(ecsSecurityGroup, ec2.Port.tcp(5432)) // PostgreSQL
    dbSecurityGroup.addIngressRule(ecsSecurityGroup, ec2.Port.tcp(6379)) // Redis
    dbSecurityGroup.addIngressRule(ecsSecurityGroup, ec2.Port.tcp(9200)) // OpenSearch

    // RDS PostgreSQL - use shared infrastructure or create new
    if (useSharedInfrastructure) {
      // Note: We don't create a new database instance, we'll use the shared one
      // The application will connect using the imported endpoint and secret from CloudFormation exports
    } else {
      // Create dedicated RDS instance (legacy mode)
      this.database = new rds.DatabaseInstance(this, 'Database', {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_15_4,
        }),
        instanceType:
          environment === 'production'
            ? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM)
            : ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [dbSecurityGroup],
        databaseName: 'lego_projects',
        credentials: rds.Credentials.fromGeneratedSecret('postgres'),
        backupRetention: environment === 'production' ? cdk.Duration.days(7) : cdk.Duration.days(1),
        deletionProtection: environment === 'production',
        multiAz: environment === 'production',
        storageEncrypted: true,
      })
    }

    // ElastiCache Redis - use shared infrastructure or create new
    if (useSharedInfrastructure) {
      // Note: We don't create a new Redis cluster, we'll use the shared one
      // The application will connect using the imported endpoint and port from CloudFormation exports
    } else {
      // Create dedicated Redis cluster (legacy mode)
      const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
        description: 'Subnet group for Redis',
        subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
      })

      this.redis = new elasticache.CfnCacheCluster(this, 'Redis', {
        cacheNodeType: environment === 'production' ? 'cache.t3.medium' : 'cache.t3.micro',
        engine: 'redis',
        numCacheNodes: 1,
        cacheSubnetGroupName: redisSubnetGroup.ref,
        vpcSecurityGroupIds: [dbSecurityGroup.securityGroupId],
        transitEncryptionEnabled: true,
        // atRestEncryptionEnabled: true, // Property not available in this CDK version
      })
    }

    // OpenSearch Domain - use shared infrastructure or create new
    if (useSharedInfrastructure) {
      // Note: OpenSearch is temporarily disabled in shared infrastructure
      // The application will need to handle search functionality gracefully without OpenSearch
      // TODO: Add OpenSearch to shared infrastructure or use OpenSearch Serverless
    } else {
      // Create dedicated OpenSearch domain (legacy mode)
      this.opensearch = new opensearch.Domain(this, 'OpenSearch', {
        version: opensearch.ElasticsearchVersion.V7_10,
        capacity: {
          dataNodes: environment === 'production' ? 2 : 1,
          dataNodeInstanceType: environment === 'production' ? 't3.medium.search' : 't3.small.search',
        },
        vpc,
        vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
        securityGroups: [dbSecurityGroup],
        ebs: {
          volumeSize: environment === 'production' ? 20 : 10,
        },
        nodeToNodeEncryption: true,
        encryptionAtRest: { enabled: true },
        enforceHttps: true,
      })
    }

    // ECR Repository
    const repository = new ecr.Repository(this, 'Repository', {
      repositoryName: `lego-projects-api-${environment}`,
      lifecycleRules: [
        {
          maxImageCount: 10,
        },
      ],
      removalPolicy:
        environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    })

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      containerInsights: true,
    })

    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      memoryLimitMiB: environment === 'production' ? 2048 : 1024,
      cpu: environment === 'production' ? 1024 : 512,
    })

    // Log Group
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/ecs/lego-projects-api-${environment}`,
      retention:
        environment === 'production' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Container environment variables - handle shared vs dedicated infrastructure
    const containerEnvironment: { [key: string]: string } = {
      NODE_ENV: environment,
      PORT: '3000',
    }

    const containerSecrets: { [key: string]: ecs.Secret } = {}

    if (useSharedInfrastructure) {
      // Use shared infrastructure endpoints
      containerEnvironment.REDIS_HOST = cdk.Fn.importValue(`LegoMoc-${environment}-Cache-RedisEndpoint`)
      containerEnvironment.REDIS_PORT = cdk.Fn.importValue(`LegoMoc-${environment}-Cache-RedisPort`)
      // Note: OpenSearch temporarily disabled in shared infrastructure
      containerEnvironment.OPENSEARCH_DISABLED = 'true'

      // Use shared RDS secret
      const sharedRdsSecret = secretsmanager.Secret.fromSecretCompleteArn(
        this,
        'SharedRdsSecret',
        cdk.Fn.importValue(`LegoMoc-${environment}-Database-RdsSecretArn`)
      )
      containerSecrets.DATABASE_URL = ecs.Secret.fromSecretsManager(sharedRdsSecret, 'connectionString')
    } else {
      // Use dedicated infrastructure
      containerEnvironment.REDIS_HOST = this.redis!.attrRedisEndpointAddress
      containerEnvironment.REDIS_PORT = '6379'
      containerEnvironment.OPENSEARCH_ENDPOINT = this.opensearch!.domainEndpoint

      containerSecrets.DATABASE_URL = ecs.Secret.fromSecretsManager(this.database!.secret!, 'connectionString')
    }

    // Container
    const container = taskDefinition.addContainer('LegoApiContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      environment: containerEnvironment,
      secrets: containerSecrets,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'lego-api',
        logGroup,
      }),
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    })

    container.addPortMappings({
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    })

    // ECS Service
    this.service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition,
      desiredCount: environment === 'production' ? 2 : 1,
      securityGroups: [ecsSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      enableExecuteCommand: true,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    })

    // Application Load Balancer
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
    })

    // Target Group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        enabled: true,
        path: '/health',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    })

    this.service.attachToApplicationTargetGroup(targetGroup)

    // Listener
    this.loadBalancer.addListener('Listener', {
      port: 80,
      defaultTargetGroups: [targetGroup],
    })

    // Auto Scaling (Production only)
    if (environment === 'production') {
      const scaling = this.service.autoScaleTaskCount({
        minCapacity: 2,
        maxCapacity: 10,
      })

      scaling.scaleOnCpuUtilization('CpuScaling', {
        targetUtilizationPercent: 70,
      })

      scaling.scaleOnMemoryUtilization('MemoryScaling', {
        targetUtilizationPercent: 80,
      })
    }

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDns', {
      value: this.loadBalancer.loadBalancerDnsName,
      description: 'LEGO API Load Balancer DNS',
    })

    // Database endpoint - shared or dedicated
    if (useSharedInfrastructure) {
      new cdk.CfnOutput(this, 'DatabaseEndpoint', {
        value: cdk.Fn.importValue(`LegoMoc-${environment}-Database-RdsEndpoint`),
        description: 'Shared PostgreSQL Database Endpoint',
      })
    } else {
      new cdk.CfnOutput(this, 'DatabaseEndpoint', {
        value: this.database!.instanceEndpoint.hostname,
        description: 'Dedicated PostgreSQL Database Endpoint',
      })
    }

    // Redis endpoint - shared or dedicated
    if (useSharedInfrastructure) {
      new cdk.CfnOutput(this, 'RedisEndpoint', {
        value: cdk.Fn.importValue(`LegoMoc-${environment}-Cache-RedisEndpoint`),
        description: 'Shared Redis Endpoint',
      })
    } else {
      new cdk.CfnOutput(this, 'RedisEndpoint', {
        value: this.redis!.attrRedisEndpointAddress,
        description: 'Dedicated Redis Endpoint',
      })
    }

    // OpenSearch endpoint - shared or dedicated
    if (useSharedInfrastructure) {
      new cdk.CfnOutput(this, 'OpenSearchStatus', {
        value: 'disabled',
        description: 'OpenSearch is temporarily disabled in shared infrastructure',
      })
    } else {
      new cdk.CfnOutput(this, 'OpenSearchEndpoint', {
        value: this.opensearch!.domainEndpoint,
        description: 'Dedicated OpenSearch Endpoint',
      })
    }

    new cdk.CfnOutput(this, 'RepositoryUri', {
      value: repository.repositoryUri,
      description: 'ECR Repository URI',
    })

    new cdk.CfnOutput(this, 'InfrastructureMode', {
      value: useSharedInfrastructure ? 'shared' : 'dedicated',
      description: 'Infrastructure mode: shared (uses LegoMoc shared infrastructure) or dedicated (creates own VPC/DB)',
    })

    if (useSharedInfrastructure) {
      new cdk.CfnOutput(this, 'SharedVpcId', {
        value: cdk.Fn.importValue(`LegoMoc-${environment}-Vpc-VpcId`),
        description: 'Shared VPC ID being used',
      })
    }
  }
}
