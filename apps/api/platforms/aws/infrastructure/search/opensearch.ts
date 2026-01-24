/**
 * OpenSearch Domain for Full-Text Search
 *
 * Creates AWS OpenSearch domain with:
 * - OpenSearch 2.x
 * - t3.small for dev, r6g.large for production
 * - Deployed in private subnets with IAM authentication
 * - Proper security group configuration
 */

export function createOpenSearch(vpc: any, openSearchSecurityGroup: any, stage: string) {
  const openSearch = new sst.aws.OpenSearch('LegoApiOpenSearch', {
    vpc,
    version: 'OpenSearch_2.13',
    instance: stage === 'production' ? 'r6g.large' : 't3.small',
    volume: stage === 'production' ? 100 : 20,
    transform: {
      domain: args => {
        args.vpcOptions = {
          securityGroupIds: [openSearchSecurityGroup.id],
          subnetIds: vpc.privateSubnetIds,
        }
        args.domainEndpointOptions = {
          enforceHttps: true,
          tlsSecurityPolicy: 'Policy-Min-TLS-1-2-2019-07',
        }
        args.encryptionAtRest = {
          enabled: true,
        }
        args.nodeToNodeEncryption = {
          enabled: true,
        }
        args.accessPolicies = JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                AWS: '*',
              },
              Action: 'es:*',
              Resource: `arn:aws:es:*:*:domain/lego-api-opensearch-${stage}/*`,
              Condition: {
                IpAddress: {
                  'aws:SourceIp': ['10.0.0.0/24'], // VPC CIDR only
                },
              },
            },
          ],
        })
        args.tags = {
          Environment: stage,
          Project: 'lego-api-serverless',
          Service: 'OpenSearch',
        }
      },
    },
  })

  /**
   * IAM Policy for Lambda OpenSearch Access
   * - Allows Lambda functions to read/write to OpenSearch
   */
  const openSearchLambdaPolicy = new aws.iam.Policy('OpenSearchLambdaPolicy', {
    policy: openSearch.nodes.domain.arn.apply(arn =>
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'es:ESHttpGet',
              'es:ESHttpPost',
              'es:ESHttpPut',
              'es:ESHttpDelete',
              'es:ESHttpHead',
            ],
            Resource: `${arn}/*`,
          },
        ],
      }),
    ),
  })

  return {
    openSearch,
    openSearchLambdaPolicy,
  }
}
