import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs'

export interface SimpleVpcStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'production'
}

export class SimpleVpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc

  constructor(scope: Construct, id: string, props: SimpleVpcStackProps) {
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

    // Output VPC ID for other stacks to reference
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      exportName: `${id}-VpcId`,
      description: 'VPC ID for shared infrastructure',
    })

    // Output public subnet IDs (both comma-separated and individual)
    new cdk.CfnOutput(this, 'PublicSubnetIds', {
      value: this.vpc.publicSubnets.map(subnet => subnet.subnetId).join(','),
      exportName: `${id}-PublicSubnetIds`,
      description: 'Public subnet IDs for load balancers',
    })

    // Individual public subnet IDs
    this.vpc.publicSubnets.forEach((subnet, index) => {
      new cdk.CfnOutput(this, `PublicSubnet${index + 1}Id`, {
        value: subnet.subnetId,
        exportName: `${id}-PublicSubnet${index + 1}Id`,
        description: `Public subnet ${index + 1} ID`,
      })
    })

    // Output private subnet IDs (both comma-separated and individual)
    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: this.vpc.privateSubnets.map(subnet => subnet.subnetId).join(','),
      exportName: `${id}-PrivateSubnetIds`,
      description: 'Private subnet IDs for applications',
    })

    // Individual private subnet IDs
    this.vpc.privateSubnets.forEach((subnet, index) => {
      new cdk.CfnOutput(this, `PrivateSubnet${index + 1}Id`, {
        value: subnet.subnetId,
        exportName: `${id}-PrivateSubnet${index + 1}Id`,
        description: `Private subnet ${index + 1} ID`,
      })
    })

    // Output isolated subnet IDs for databases (both comma-separated and individual)
    new cdk.CfnOutput(this, 'IsolatedSubnetIds', {
      value: this.vpc.isolatedSubnets.map(subnet => subnet.subnetId).join(','),
      exportName: `${id}-IsolatedSubnetIds`,
      description: 'Isolated subnet IDs for databases',
    })

    // Individual isolated subnet IDs
    this.vpc.isolatedSubnets.forEach((subnet, index) => {
      new cdk.CfnOutput(this, `IsolatedSubnet${index + 1}Id`, {
        value: subnet.subnetId,
        exportName: `${id}-IsolatedSubnet${index + 1}Id`,
        description: `Isolated subnet ${index + 1} ID`,
      })
    })
  }
}
