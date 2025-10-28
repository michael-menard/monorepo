import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as opensearch from 'aws-cdk-lib/aws-opensearch'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

export interface SearchStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'production'
  vpc: ec2.Vpc
}

export class SearchStack extends cdk.Stack {
  public readonly openSearch: opensearch.Domain

  constructor(scope: Construct, id: string, props: SearchStackProps) {
    super(scope, id, props)

    const { environment, vpc } = props

    // Import security group
    const searchSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'SearchSecurityGroup',
      cdk.Fn.importValue(`${this.node.id.replace('-Search', '-Vpc')}-SearchSecurityGroupId`)
    )

    // Environment-specific configuration
    const config = this.getConfig(environment)

    // Create OpenSearch domain
    this.openSearch = new opensearch.Domain(this, 'OpenSearchDomain', {
      version: opensearch.EngineVersion.OPENSEARCH_2_11,
      
      // Capacity configuration
      capacity: {
        dataNodes: config.instanceCount,
        dataNodeInstanceType: config.instanceType,
        masterNodes: environment === 'production' ? 3 : undefined,
        masterNodeInstanceType: environment === 'production' ? 't3.small.search' : undefined,
      },
      
      // EBS configuration
      ebs: {
        volumeSize: config.volumeSize,
        volumeType: ec2.EbsDeviceVolumeType.GP3,
      },
      
      // VPC configuration
      vpc,
      vpcSubnets: [{
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      }],
      securityGroups: [searchSecurityGroup],
      
      // Zone awareness for multi-AZ
      zoneAwareness: {
        enabled: config.multiAz,
        availabilityZoneCount: config.multiAz ? 2 : undefined,
      },
      
      // Security
      nodeToNodeEncryption: true,
      encryptionAtRest: {
        enabled: true,
      },
      enforceHttps: true,
      
      // Access policy - restrict to VPC
      accessPolicies: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [new iam.AnyPrincipal()],
          actions: ['es:*'],
          resources: ['*'],
          conditions: {
            IpAddress: {
              'aws:sourceIp': [vpc.vpcCidrBlock],
            },
          },
        }),
      ],
      
      // Fine-grained access control
      fineGrainedAccessControl: {
        masterUserName: 'admin',
      },
      
      // Logging
      logging: {
        slowSearchLogEnabled: environment !== 'dev',
        appLogEnabled: environment !== 'dev',
        slowIndexLogEnabled: environment !== 'dev',
      },
      
      // Automated snapshots
      automatedSnapshotStartHour: 3,
      
      // Advanced options
      advancedOptions: {
        'rest.action.multi.allow_explicit_index': 'true',
        'indices.fielddata.cache.size': '20%',
        'indices.query.bool.max_clause_count': '1024',
      },
      
      // Removal policy
      removalPolicy: environment === 'production' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    })

    // Output connection information
    new cdk.CfnOutput(this, 'OpenSearchEndpoint', {
      value: this.openSearch.domainEndpoint,
      description: 'OpenSearch domain endpoint',
    })

    new cdk.CfnOutput(this, 'OpenSearchDashboardsUrl', {
      value: `${this.openSearch.domainEndpoint}/_dashboards/`,
      description: 'OpenSearch Dashboards URL',
    })
  }

  private getConfig(environment: string) {
    const configs = {
      dev: {
        instanceType: 't3.small.search',
        instanceCount: 1,
        multiAz: false,
        volumeSize: 20,
      },
      staging: {
        instanceType: 't3.medium.search',
        instanceCount: 2,
        multiAz: true,
        volumeSize: 50,
      },
      production: {
        instanceType: 'm6g.large.search',
        instanceCount: 3,
        multiAz: true,
        volumeSize: 100,
      },
    }
    return configs[environment as keyof typeof configs]
  }
}
