import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as elasticache from 'aws-cdk-lib/aws-elasticache'
import { Construct } from 'constructs'

export interface CacheStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'production'
  vpc: ec2.Vpc
}

export class CacheStack extends cdk.Stack {
  public readonly elastiCache: elasticache.CfnCacheCluster

  constructor(scope: Construct, id: string, props: CacheStackProps) {
    super(scope, id, props)

    const { environment, vpc } = props

    // Import security group
    const cacheSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'CacheSecurityGroup',
      cdk.Fn.importValue(`${this.node.id.replace('-Cache', '-Vpc')}-CacheSecurityGroupId`)
    )

    // Create subnet group
    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'CacheSubnetGroup', {
      description: 'Subnet group for ElastiCache Redis',
      subnetIds: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      }).subnetIds,
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
      atRestEncryptionEnabled: environment !== 'dev',
      
      // Notifications
      notificationTopicArn: environment === 'production' ? undefined : undefined, // Add SNS topic if needed
    })

    // Output connection information
    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: this.elastiCache.attrRedisEndpointAddress,
      description: 'Redis cluster endpoint',
    })

    new cdk.CfnOutput(this, 'RedisPort', {
      value: this.elastiCache.attrRedisEndpointPort,
      description: 'Redis cluster port',
    })
  }

  private getConfig(environment: string) {
    const configs = {
      dev: { nodeType: 'cache.t3.micro', numCacheNodes: 1 },
      staging: { nodeType: 'cache.t3.small', numCacheNodes: 2 },
      production: { nodeType: 'cache.r6g.large', numCacheNodes: 3 },
    }
    return configs[environment as keyof typeof configs]
  }
}
