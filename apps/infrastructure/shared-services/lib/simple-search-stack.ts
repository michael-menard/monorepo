import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as elasticsearch from 'aws-cdk-lib/aws-elasticsearch'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

export interface SimpleSearchStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'production'
  vpcId: string
  privateSubnetIds: string[]
}

export class SimpleSearchStack extends cdk.Stack {
  public readonly elasticsearchDomain: elasticsearch.Domain

  constructor(scope: Construct, id: string, props: SimpleSearchStackProps) {
    super(scope, id, props)

    const { environment, vpcId, privateSubnetIds } = props

    // Import VPC
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'ImportedVpc', {
      vpcId,
      availabilityZones: ['us-east-1a', 'us-east-1b'],
      privateSubnetIds,
    })

    // Create search security group
    const searchSecurityGroup = new ec2.SecurityGroup(this, 'SearchSecurityGroup', {
      vpc,
      description: 'Security group for OpenSearch',
      allowAllOutbound: false,
    })

    // Allow inbound connections from private subnets (where applications will run)
    searchSecurityGroup.addIngressRule(
      ec2.Peer.ipv4('10.0.2.0/24'), // Private subnet 1
      ec2.Port.tcp(443),
      'HTTPS access from private subnet 1'
    )
    
    searchSecurityGroup.addIngressRule(
      ec2.Peer.ipv4('10.0.3.0/24'), // Private subnet 2
      ec2.Port.tcp(443),
      'HTTPS access from private subnet 2'
    )

    // Environment-specific configuration
    const config = this.getConfig(environment)

    // Create Elasticsearch domain
    this.elasticsearchDomain = new elasticsearch.Domain(this, 'ElasticsearchDomain', {
      version: elasticsearch.ElasticsearchVersion.V7_10,
      domainName: `legomoc-${environment}-search`,
      
      // Capacity configuration
      capacity: {
        dataNodes: config.dataNodes,
        dataNodeInstanceType: config.instanceType,
        masterNodes: config.masterNodes,
        masterNodeInstanceType: config.masterInstanceType,
      },

      // EBS configuration
      ebs: {
        volumeSize: config.volumeSize,
        volumeType: ec2.EbsDeviceVolumeType.GP3,
      },

      // Network configuration
      vpc,
      vpcSubnets: [
        {
          subnets: vpc.privateSubnets.slice(0, config.dataNodes),
        },
      ],
      securityGroups: [searchSecurityGroup],

      // Security configuration
      nodeToNodeEncryption: environment !== 'dev',
      encryptionAtRest: {
        enabled: environment !== 'dev',
      },
      enforceHttps: true,
      tlsSecurityPolicy: elasticsearch.TLSSecurityPolicy.TLS_1_2,

      // Access policy - allow access from VPC
      accessPolicies: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [new iam.AnyPrincipal()],
          actions: ['es:*'],
          resources: ['*'],
          conditions: {
            IpAddress: {
              'aws:SourceIp': ['10.0.0.0/16'], // VPC CIDR
            },
          },
        }),
      ],

      // Logging
      logging: {
        slowSearchLogEnabled: environment !== 'dev',
        appLogEnabled: environment !== 'dev',
        slowIndexLogEnabled: environment !== 'dev',
      },

      // Advanced options
      advancedOptions: {
        'rest.action.multi.allow_explicit_index': 'true',
        'indices.fielddata.cache.size': '20%',
        'indices.query.bool.max_clause_count': '1024',
      },

      // Automated snapshots
      automatedSnapshotStartHour: 3,

      // Removal policy
      removalPolicy: environment === 'production' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    })

    // Output connection information
    new cdk.CfnOutput(this, 'ElasticsearchEndpoint', {
      value: this.elasticsearchDomain.domainEndpoint,
      exportName: `${id}-ElasticsearchEndpoint`,
      description: 'Elasticsearch domain endpoint',
    })

    new cdk.CfnOutput(this, 'KibanaUrl', {
      value: `${this.elasticsearchDomain.domainEndpoint}/_plugin/kibana/`,
      exportName: `${id}-KibanaUrl`,
      description: 'Kibana URL',
    })

    new cdk.CfnOutput(this, 'SearchSecurityGroupId', {
      value: searchSecurityGroup.securityGroupId,
      exportName: `${id}-SearchSecurityGroupId`,
      description: 'Search security group ID',
    })
  }

  private getConfig(environment: string) {
    const configs = {
      dev: {
        dataNodes: 1,
        instanceType: 't3.small.search',
        masterNodes: 0, // No dedicated master for dev
        masterInstanceType: undefined,
        volumeSize: 20,
      },
      staging: {
        dataNodes: 2,
        instanceType: 't3.medium.search',
        masterNodes: 3,
        masterInstanceType: 't3.small.search',
        volumeSize: 50,
      },
      production: {
        dataNodes: 3,
        instanceType: 'r6g.large.search',
        masterNodes: 3,
        masterInstanceType: 't3.medium.search',
        volumeSize: 100,
      },
    }
    return configs[environment as keyof typeof configs]
  }
}
