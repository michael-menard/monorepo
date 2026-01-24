/**
 * Shared Configuration for MOC Instructions Lambda Functions
 *
 * Provides common configuration for all MOC-related Lambda functions:
 * - VPC configuration
 * - Environment variables
 * - Resource links
 * - IAM policy attachments
 */

export function createMocInstructionsConfig(
  vpc: any,
  postgres: any,
  bucket: any,
  openSearch: any,
  lambdaEmfPolicy: any,
  openSearchLambdaPolicy: any,
  stage: string,
) {
  return {
    runtime: 'nodejs20.x',
    vpc,
    environment: {
      DATABASE_URL: postgres.connectionString,
      S3_BUCKET_NAME: bucket.name,
      OPENSEARCH_ENDPOINT: openSearch.endpoint,
      STAGE: stage,
    },
    link: [postgres, bucket, openSearch],
    transform: {
      role: (args: any, functionName: string) => {
        // Attach EMF policy for CloudWatch metrics
        new aws.iam.RolePolicyAttachment(`${functionName}EmfPolicyAttachment`, {
          role: args.name,
          policyArn: lambdaEmfPolicy.arn,
        })

        // Attach OpenSearch policy for search functionality
        new aws.iam.RolePolicyAttachment(`${functionName}OpenSearchPolicyAttachment`, {
          role: args.name,
          policyArn: openSearchLambdaPolicy.arn,
        })
      },
    },
  }
}
