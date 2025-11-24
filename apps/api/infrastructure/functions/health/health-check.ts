/**
 * Health Check Lambda Function
 * 
 * Creates health check Lambda that:
 * - Validates connectivity to PostgreSQL, OpenSearch
 * - Returns 200 (healthy/degraded) or 503 (unhealthy)
 * - No authentication required (public endpoint)
 */

export function createHealthCheckFunction(
  vpc: any,
  postgres: any,
  openSearch: any,
  lambdaEmfPolicy: any,
  stage: string
) {
  const healthCheckFunction = new sst.aws.Function('HealthCheckFunction', {
    handler: 'endpoints/health/handler.handler',
    runtime: 'nodejs20.x',
    timeout: '30 seconds',
    memory: '256 MB',
    vpc,
    environment: {
      DATABASE_URL: postgres.connectionString,
      OPENSEARCH_ENDPOINT: openSearch.endpoint,
      STAGE: stage,
    },
    link: [postgres, openSearch],
    transform: {
      role: args => {
        // Attach EMF policy for CloudWatch metrics
        new aws.iam.RolePolicyAttachment(`HealthCheckEmfPolicyAttachment`, {
          role: args.name,
          policyArn: lambdaEmfPolicy.arn,
        })
      },
    },
  })

  return { healthCheckFunction }
}
