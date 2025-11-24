/**
 * Authentication-related IAM Roles
 * 
 * Creates IAM roles for:
 * - Cognito Identity Pool (authenticated users)
 * - Grafana Workspace (CloudWatch and OpenSearch access)
 */

export function createAuthIamRoles(userPool: any, userPoolClient: any, openSearch: any, stage: string) {
  /**
   * Cognito Identity Pool
   * - Provides temporary AWS credentials for authenticated users
   * - Used for direct S3 access (if needed)
   */
  const identityPool = new aws.cognito.IdentityPool('LegoMocIdentityPool', {
    identityPoolName: `lego_moc_identity_${stage}`,
    allowUnauthenticatedIdentities: false,
    cognitoIdentityProviders: [
      {
        clientId: userPoolClient.id,
        providerName: userPool.endpoint,
      },
    ],
  })

  /**
   * IAM Role for authenticated Cognito users
   * - Allows S3 read access for user-specific files
   */
  const authenticatedRole = new aws.iam.Role('CognitoAuthenticatedRole', {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Federated: 'cognito-identity.amazonaws.com' },
          Action: 'sts:AssumeRoleWithWebIdentity',
          Condition: {
            StringEquals: {
              'cognito-identity.amazonaws.com:aud': identityPool.id,
            },
            'ForAnyValue:StringLike': {
              'cognito-identity.amazonaws.com:amr': 'authenticated',
            },
          },
        },
      ],
    }),
    tags: {
      Environment: stage,
      Service: 'cognito-identity',
    },
  })

  new aws.cognito.IdentityPoolRoleAttachment('IdentityPoolRoleAttachment', {
    identityPoolId: identityPool.id,
    roles: {
      authenticated: authenticatedRole.arn,
    },
  })

  /**
   * IAM Role for Amazon Managed Grafana
   * - CloudWatch read permissions for metrics and logs
   * - OpenSearch read permissions for log analysis
   */
  const grafanaWorkspaceRole = new aws.iam.Role('GrafanaWorkspaceRole', {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: 'grafana.amazonaws.com' },
          Action: 'sts:AssumeRole',
        },
      ],
    }),
    tags: {
      Environment: stage,
      Service: 'grafana',
    },
  })

  /**
   * IAM Policy for Grafana CloudWatch Access
   * - Read access to CloudWatch metrics and logs
   */
  const grafanaCloudWatchPolicy = new aws.iam.Policy('GrafanaCloudWatchPolicy', {
    policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'cloudwatch:DescribeAlarmsForMetric',
            'cloudwatch:DescribeAlarmHistory',
            'cloudwatch:DescribeAlarms',
            'cloudwatch:ListMetrics',
            'cloudwatch:GetMetricStatistics',
            'cloudwatch:GetMetricData',
            'logs:DescribeLogGroups',
            'logs:DescribeLogStreams',
            'logs:GetLogEvents',
            'logs:StartQuery',
            'logs:StopQuery',
            'logs:GetQueryResults',
          ],
          Resource: '*',
        },
      ],
    }),
  })

  new aws.iam.RolePolicyAttachment('GrafanaCloudWatchPolicyAttachment', {
    role: grafanaWorkspaceRole.name,
    policyArn: grafanaCloudWatchPolicy.arn,
  })

  /**
   * IAM Policy for Grafana OpenSearch Access
   * - Read access to OpenSearch for log analysis
   */
  const grafanaOpenSearchPolicy = new aws.iam.Policy('GrafanaOpenSearchPolicy', {
    policy: openSearch.nodes.domain.arn.apply(arn => JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'es:ESHttpGet',
            'es:ESHttpPost',
            'es:DescribeElasticsearchDomains',
            'es:ListDomainNames',
          ],
          Resource: `${arn}/*`,
        },
      ],
    })),
  })

  new aws.iam.RolePolicyAttachment('GrafanaOpenSearchPolicyAttachment', {
    role: grafanaWorkspaceRole.name,
    policyArn: grafanaOpenSearchPolicy.arn,
  })

  return {
    identityPool,
    authenticatedRole,
    grafanaWorkspaceRole,
    grafanaCloudWatchPolicy,
    grafanaOpenSearchPolicy,
  }
}
