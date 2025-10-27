import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as elasticache from 'aws-cdk-lib/aws-elasticache'
import { Construct } from 'constructs'

export interface SimpleCacheStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'production'
  vpcId: string
  privateSubnetIds: string[]
}

export class SimpleCacheStack extends cdk.Stack {
  public readonly elastiCache: elasticache.CfnCacheCluster

  constructor(scope: Construct, id: string, props: SimpleCacheStackProps) {
    super(scope, id, props)

    const { environment, vpcId, privateSubnetIds } = props

    // Import VPC
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'ImportedVpc', {
      vpcId,
      availabilityZones: ['us-east-1a', 'us-east-1b'],
      privateSubnetIds,
    })

    // Create cache security group
    const cacheSecurityGroup = new ec2.SecurityGroup(this, 'CacheSecurityGroup', {
      vpc,
      description: 'Security group for ElastiCache Redis',
      allowAllOutbound: false,
    })

    // Allow inbound connections from private subnets (where applications will run)
    cacheSecurityGroup.addIngressRule(
      ec2.Peer.ipv4('10.0.2.0/24'), // Private subnet 1
      ec2.Port.tcp(6379),
      'Redis access from private subnet 1'
    )
    
    cacheSecurityGroup.addIngressRule(
      ec2.Peer.ipv4('10.0.3.0/24'), // Private subnet 2
      ec2.Port.tcp(6379),
      'Redis access from private subnet 2'
    )

    // Create subnet group
    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'CacheSubnetGroup', {
      description: 'Subnet group for ElastiCache Redis',
      subnetIds: privateSubnetIds,
    })

    // Environment-specific configuration
    const config = this.getConfig(environment)

    // Create Redis cluster
    this.elastiCache = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      cacheNodeType: config.nodeType,
      engine: 'redis',
      numCacheNodes: config.numCacheNodes,
      vpcSecurityGroupIds: [cacheSecurityGroup.securityGroupId],
      cacheSubnetGroupName: subnetGroup.ref,
      
      // Redis configuration
      engineVersion: '7.0',
      port: 6379,
      
      // Backup configuration
      snapshotRetentionLimit: environment === 'dev' ? 1 : 7,
      snapshotWindow: '03:00-05:00',
      preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
      
      // Security
      transitEncryptionEnabled: environment !== 'dev',
      
      // Auto minor version upgrade
      autoMinorVersionUpgrade: true,
    })

    // Output connection information
    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: this.elastiCache.attrRedisEndpointAddress,
      exportName: `${id}-RedisEndpoint`,
      description: 'Redis cluster endpoint',
    })

    new cdk.CfnOutput(this, 'RedisPort', {
      value: this.elastiCache.attrRedisEndpointPort,
      exportName: `${id}-RedisPort`,
      description: 'Redis cluster port',
    })

    new cdk.CfnOutput(this, 'CacheSecurityGroupId', {
      value: cacheSecurityGroup.securityGroupId,
      exportName: `${id}-CacheSecurityGroupId`,
      description: 'Cache security group ID',
    })
  }

  private getConfig(environment: string) {
    const configs = {
      dev: { 
        nodeType: 'cache.t3.micro', 
        numCacheNodes: 1 
      },
      staging: { 
        nodeType: 'cache.t3.small', 
        numCacheNodes: 2 
      },
      production: { 
        nodeType: 'cache.r6g.large', 
        numCacheNodes: 3 
      },
    }
    return configs[environment as keyof typeof configs]
  }
}
