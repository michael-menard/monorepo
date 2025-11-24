/// <reference path="./.sst/platform/config.d.ts" />

/**
 * Shared Infrastructure Stack
 * 
 * Contains resources shared across all services:
 * - VPC and networking
 * - PostgreSQL database
 * - Redis cache
 * - Elasticsearch/OpenSearch
 * - S3 buckets
 */

export default $config({
  app(input) {
    return {
      name: 'lego-shared-infrastructure',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: input?.stage === 'production',
      home: 'aws',
      tags: {
        Project: 'lego-monorepo',
        Environment: input?.stage || 'development',
        ManagedBy: 'SST',
        Component: 'shared-infrastructure',
        CostCenter: 'Engineering',
        Owner: 'engineering@bricklink.com',
      },
    }
  },
  async run() {
    const stage = $app.stage

    // Import shared infrastructure components from your existing API config
    const { createVpc } = await import('../../apps/api/infrastructure/core/vpc')
    const { createSecurityGroups } = await import('../../apps/api/infrastructure/core/security-groups')
    const { createPostgres } = await import('../../apps/api/infrastructure/database/postgres')
    const { createS3Buckets } = await import('../../apps/api/infrastructure/storage/s3-buckets')
    const { createOpenSearch } = await import('../../apps/api/infrastructure/search/opensearch')

    // Create shared infrastructure
    const { vpc } = createVpc(stage)
    const { 
      lambdaSecurityGroup, 
      rdsSecurityGroup, 
      redisSecurityGroup, 
      openSearchSecurityGroup 
    } = createSecurityGroups(vpc, stage)

    const { postgres } = createPostgres(vpc, rdsSecurityGroup, stage)
    const { bucket, configBucket } = createS3Buckets(stage)
    const { openSearch } = createOpenSearch(vpc, openSearchSecurityGroup, stage)

    // Export shared resources for other services to reference
    return {
      // Database
      databaseUrl: postgres.connectionString,
      databaseHost: postgres.host,
      databasePort: postgres.port,
      
      // Storage
      bucketName: bucket.name,
      configBucketName: configBucket.name,
      
      // Search
      openSearchEndpoint: openSearch.endpoint,
      
      // Networking
      vpcId: vpc.id,
      privateSubnetIds: vpc.privateSubnetIds,
      publicSubnetIds: vpc.publicSubnetIds,
      lambdaSecurityGroupId: lambdaSecurityGroup.id,
      
      // Metadata
      stage,
      message: `🏗️ Shared infrastructure deployed to ${stage}`,
    }
  },
})
