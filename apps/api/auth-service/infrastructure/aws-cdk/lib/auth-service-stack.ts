import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import * as docdb from 'aws-cdk-lib/aws-docdb'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'

export interface AuthServiceStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'production'
  vpcId?: string // Optional: use existing VPC (deprecated - use shared infrastructure)
  domainName?: string
  useSharedInfrastructure?: boolean // Use shared VPC and DocumentDB
}

export class AuthServiceStack extends cdk.Stack {
  public readonly service: ecs.FargateService
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer
  public readonly database: docdb.DatabaseCluster

  constructor(scope: Construct, id: string, props: AuthServiceStackProps) {
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
      : new ec2.Vpc(this, 'AuthServiceVpc', {
          maxAzs: 2,
          natGateways: 1,
        })

    // Security Groups
    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc,
      description: 'Security group for Auth Service ALB',
      allowAllOutbound: true,
    })
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80))
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443))

    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc,
      description: 'Security group for Auth Service ECS',
      allowAllOutbound: true,
    })
    ecsSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(3001))

    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      description: 'Security group for Auth Service DocumentDB',
      allowAllOutbound: false,
    })
    dbSecurityGroup.addIngressRule(ecsSecurityGroup, ec2.Port.tcp(27017))

    // DocumentDB Cluster - Keep separate for now (will migrate to PostgreSQL later)
    const dbCredentials = new secretsmanager.Secret(this, 'DbCredentials', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'dbuser' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
      },
    })

    this.database = new docdb.DatabaseCluster(this, 'Database', {
      masterUser: {
        username: 'dbuser',
        password: dbCredentials.secretValueFromJson('password'),
      },
      instanceType:
        environment === 'production'
          ? ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MEDIUM)
          : ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MEDIUM),
      instances: environment === 'production' ? 2 : 1,
      vpc,
      vpcSubnets: useSharedInfrastructure
        ? { subnets: vpc.isolatedSubnets } // Use isolated subnets from shared VPC
        : { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroup: dbSecurityGroup,
      backup: {
        retention: environment === 'production' ? cdk.Duration.days(7) : cdk.Duration.days(1),
      },
      deletionProtection: environment === 'production',
    })

    // ECR Repository
    const repository = new ecr.Repository(this, 'Repository', {
      repositoryName: `auth-service-${environment}`,
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
      memoryLimitMiB: environment === 'production' ? 1024 : 512,
      cpu: environment === 'production' ? 512 : 256,
    })

    // Log Group
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/ecs/auth-service-${environment}`,
      retention:
        environment === 'production' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Container
    const container = taskDefinition.addContainer('AuthServiceContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      environment: {
        NODE_ENV: environment,
        PORT: '3001',
        DB_HOST: this.database.clusterEndpoint.hostname,
        DB_PORT: '27017',
        DB_NAME: 'lego-auth',
      },
      secrets: {
        DB_USERNAME: ecs.Secret.fromSecretsManager(dbCredentials, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(dbCredentials, 'password'),
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'auth-service',
        logGroup,
      }),
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3001/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    })

    container.addPortMappings({
      containerPort: 3001,
      protocol: ecs.Protocol.TCP,
    })

    // ECS Service
    this.service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition,
      desiredCount: environment === 'production' ? 2 : 1,
      securityGroups: [ecsSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      enableExecuteCommand: true, // For debugging
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
      port: 3001,
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

    // Add ECS service to target group
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
        scaleInCooldown: cdk.Duration.minutes(5),
        scaleOutCooldown: cdk.Duration.minutes(2),
      })

      scaling.scaleOnMemoryUtilization('MemoryScaling', {
        targetUtilizationPercent: 80,
        scaleInCooldown: cdk.Duration.minutes(5),
        scaleOutCooldown: cdk.Duration.minutes(2),
      })
    }

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDns', {
      value: this.loadBalancer.loadBalancerDnsName,
      description: 'Auth Service Load Balancer DNS',
    })

    new cdk.CfnOutput(this, 'ServiceName', {
      value: this.service.serviceName,
      description: 'ECS Service Name',
    })

    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
      description: 'ECS Cluster Name',
    })

    new cdk.CfnOutput(this, 'RepositoryUri', {
      value: repository.repositoryUri,
      description: 'ECR Repository URI',
    })

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.clusterEndpoint.hostname,
      description: 'DocumentDB Cluster Endpoint',
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
