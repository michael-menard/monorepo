import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs'

export interface VpcStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'production'
}

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc

  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id, props)

    const { environment } = props

    // Create VPC with public and private subnets
    this.vpc = new ec2.Vpc(this, 'LegoMocVpc', {
      vpcName: `LegoMoc-${environment}-Vpc`,
      maxAzs: environment === 'production' ? 3 : 2,
      cidr: '10.0.0.0/16',
      
      // Subnet configuration
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],

      // NAT Gateway configuration
      natGateways: environment === 'production' ? 2 : 1,
      
      // Enable DNS
      enableDnsHostnames: true,
      enableDnsSupport: true,
    })

    // VPC Flow Logs for security monitoring
    if (environment !== 'dev') {
      new ec2.FlowLog(this, 'VpcFlowLog', {
        resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
        destination: ec2.FlowLogDestination.toCloudWatchLogs(),
      })
    }

    // Security Groups
    this.createSecurityGroups()

    // VPC Endpoints for AWS services (cost optimization)
    this.createVpcEndpoints(environment)
  }

  private createSecurityGroups() {
    // Database Security Group
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for databases (RDS, DocumentDB)',
      allowAllOutbound: false,
    })

    // Cache Security Group  
    const cacheSecurityGroup = new ec2.SecurityGroup(this, 'CacheSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for ElastiCache Redis',
      allowAllOutbound: false,
    })

    // Search Security Group
    const searchSecurityGroup = new ec2.SecurityGroup(this, 'SearchSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for OpenSearch',
      allowAllOutbound: false,
    })

    // Application Security Group
    const appSecurityGroup = new ec2.SecurityGroup(this, 'ApplicationSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for application services',
      allowAllOutbound: true,
    })

    // Allow app to access databases
    dbSecurityGroup.addIngressRule(
      appSecurityGroup,
      ec2.Port.tcp(27017),
      'DocumentDB access from applications'
    )
    
    dbSecurityGroup.addIngressRule(
      appSecurityGroup,
      ec2.Port.tcp(5432),
      'PostgreSQL access from applications'
    )

    // Allow app to access cache
    cacheSecurityGroup.addIngressRule(
      appSecurityGroup,
      ec2.Port.tcp(6379),
      'Redis access from applications'
    )

    // Allow app to access search
    searchSecurityGroup.addIngressRule(
      appSecurityGroup,
      ec2.Port.tcp(443),
      'OpenSearch HTTPS access from applications'
    )

    // Export security groups for use by other stacks
    new cdk.CfnOutput(this, 'DatabaseSecurityGroupId', {
      value: dbSecurityGroup.securityGroupId,
      exportName: `${this.node.id}-DatabaseSecurityGroupId`,
    })

    new cdk.CfnOutput(this, 'CacheSecurityGroupId', {
      value: cacheSecurityGroup.securityGroupId,
      exportName: `${this.node.id}-CacheSecurityGroupId`,
    })

    new cdk.CfnOutput(this, 'SearchSecurityGroupId', {
      value: searchSecurityGroup.securityGroupId,
      exportName: `${this.node.id}-SearchSecurityGroupId`,
    })

    new cdk.CfnOutput(this, 'ApplicationSecurityGroupId', {
      value: appSecurityGroup.securityGroupId,
      exportName: `${this.node.id}-ApplicationSecurityGroupId`,
    })
  }

  private createVpcEndpoints(environment: string) {
    // S3 Gateway Endpoint (free)
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    })

    // DynamoDB Gateway Endpoint (free)
    this.vpc.addGatewayEndpoint('DynamoDbEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    })

    // Interface endpoints for commonly used services (cost vs convenience)
    if (environment === 'production') {
      // ECR endpoints for container image pulls
      this.vpc.addInterfaceEndpoint('EcrEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.ECR,
      })

      this.vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      })

      // CloudWatch Logs endpoint
      this.vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      })
    }
  }
}
