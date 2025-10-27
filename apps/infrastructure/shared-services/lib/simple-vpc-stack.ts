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

    // Output private subnet IDs
    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: this.vpc.privateSubnets.map(subnet => subnet.subnetId).join(','),
      exportName: `${id}-PrivateSubnetIds`,
      description: 'Private subnet IDs for applications',
    })

    // Output isolated subnet IDs for databases
    new cdk.CfnOutput(this, 'IsolatedSubnetIds', {
      value: this.vpc.isolatedSubnets.map(subnet => subnet.subnetId).join(','),
      exportName: `${id}-IsolatedSubnetIds`,
      description: 'Isolated subnet IDs for databases',
    })
  }
}
