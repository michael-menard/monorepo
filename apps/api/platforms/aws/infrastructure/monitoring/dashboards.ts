/**
 * CloudWatch Dashboards for SST Services
 *
 * Creates comprehensive CloudWatch dashboards for monitoring:
 * - Lambda function metrics (invocations, errors, duration)
 * - API Gateway metrics (requests, latency, errors)
 * - Database metrics (connections, CPU, memory)
 * - Custom application metrics
 */

export function createDashboards(
  api: any,
  functions: any,
  postgres: any,
  openSearch: any,
  stage: string,
) {
  /**
   * Get current AWS account ID for dashboard configuration
   */
  const accountId = aws.getCallerIdentityOutput().accountId
  const region = aws.getRegionOutput().name

  /**
   * Main LEGO API Dashboard
   * - Overview of all services and metrics
   * - Lambda function performance
   * - API Gateway metrics
   * - Database health
   */
  const dashboardName = `lego-api-sst-${stage}`

  new aws.cloudwatch.Dashboard('LegoApiDashboard', {
    dashboardName,
    dashboardBody: $jsonStringify(
      $output([
        api.id,
        functions.healthCheckFunction.name,
        functions.mocInstructionsFunction.name,
        functions.mocFileUploadFunction.name,
        functions.uploadImageFunction.name,
        functions.listImagesFunction.name,
        functions.listWishlistFunction.name,
        functions.createWishlistItemFunction.name,
        functions.websocketConnectFunction.name,
        postgres.clusterIdentifier,
        openSearch.domainName,
        accountId,
        region,
      ]).apply(
        ([
          apiId,
          healthFunctionName,
          mocFunctionName,
          mocUploadFunctionName,
          uploadImageFunctionName,
          listImagesFunctionName,
          listWishlistFunctionName,
          createWishlistFunctionName,
          websocketConnectFunctionName,
          dbClusterIdentifier,
          openSearchDomainName,
          awsAccountId,
          awsRegion,
        ]) => ({
          widgets: [
            // API Gateway Overview
            {
              type: 'metric',
              x: 0,
              y: 0,
              width: 12,
              height: 6,
              properties: {
                metrics: [
                  ['AWS/ApiGateway', 'Count', 'ApiId', apiId],
                  ['.', '4XXError', '.', '.'],
                  ['.', '5XXError', '.', '.'],
                  ['.', 'IntegrationLatency', '.', '.'],
                ],
                view: 'timeSeries',
                stacked: false,
                region: awsRegion,
                title: 'API Gateway Metrics',
                period: 300,
              },
            },
            // Lambda Functions Overview
            {
              type: 'metric',
              x: 12,
              y: 0,
              width: 12,
              height: 6,
              properties: {
                metrics: [
                  ['AWS/Lambda', 'Invocations', 'FunctionName', healthFunctionName],
                  ['.', 'Errors', '.', '.'],
                  ['.', 'Duration', '.', '.'],
                  ['.', 'Invocations', '.', mocFunctionName],
                  ['.', 'Errors', '.', '.'],
                  ['.', 'Duration', '.', '.'],
                  ['.', 'Invocations', '.', uploadImageFunctionName],
                  ['.', 'Errors', '.', '.'],
                  ['.', 'Duration', '.', '.'],
                ],
                view: 'timeSeries',
                stacked: false,
                region: awsRegion,
                title: 'Lambda Function Metrics',
                period: 300,
              },
            },
            // Database Metrics
            {
              type: 'metric',
              x: 0,
              y: 6,
              width: 12,
              height: 6,
              properties: {
                metrics: [
                  ['AWS/RDS', 'DatabaseConnections', 'DBClusterIdentifier', dbClusterIdentifier],
                  ['.', 'CPUUtilization', '.', '.'],
                  ['.', 'FreeableMemory', '.', '.'],
                ],
                view: 'timeSeries',
                stacked: false,
                region: awsRegion,
                title: 'RDS PostgreSQL Metrics',
                period: 300,
              },
            },
            // OpenSearch Metrics
            {
              type: 'metric',
              x: 12,
              y: 6,
              width: 12,
              height: 6,
              properties: {
                metrics: [
                  [
                    'AWS/ES',
                    'ClusterStatus.yellow',
                    'DomainName',
                    openSearchDomainName,
                    'ClientId',
                    awsAccountId,
                  ],
                  ['.', 'ClusterStatus.red', '.', '.', '.', '.'],
                  ['.', 'SearchLatency', '.', '.', '.', '.'],
                  ['.', 'IndexingLatency', '.', '.', '.', '.'],
                ],
                view: 'timeSeries',
                stacked: false,
                region: awsRegion,
                title: 'OpenSearch Metrics',
                period: 300,
              },
            },
          ],
        }),
      ),
    ),
  })

  return {
    dashboardName,
    dashboardCreated: true,
  }
}
