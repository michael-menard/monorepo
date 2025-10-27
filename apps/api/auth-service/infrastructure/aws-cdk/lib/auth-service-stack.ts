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
  environment: 'staging' | 'production'
  vpcId?: string // Optional: use existing VPC
  domainName?: string
}

export class AuthServiceStack extends cdk.Stack {
  public readonly service: ecs.FargateService
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer
  public readonly database: docdb.DatabaseCluster

  constructor(scope: Construct, id: string, props: AuthServiceStackProps) {
    super(scope, id, props)

    const { environment, vpcId, domainName } = props

    // VPC - use existing or create new
    const vpc = vpcId
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

    // DocumentDB Cluster
    const dbCredentials = new secretsmanager.Secret(this, 'DbCredentials', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
      },
    })

    this.database = new docdb.DatabaseCluster(this, 'Database', {
      masterUser: {
        username: 'admin',
        password: dbCredentials.secretValueFromJson('password'),
      },
      instanceType:
        environment === 'production'
          ? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM)
          : ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      instances: environment === 'production' ? 2 : 1,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
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
      },
      secrets: {
        MONGODB_URI: ecs.Secret.fromSecretsManager(dbCredentials, 'connectionString'),
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
  }
}
