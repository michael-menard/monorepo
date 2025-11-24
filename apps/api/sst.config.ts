import type {} from './.sst/platform/config.d.ts'

/**
 * SST v3 (Ion) Configuration for LEGO Projects API Serverless Migration
 * 
 * Modular sub-stack architecture with:
 * - Core Infrastructure (VPC, Security Groups)
 * - Database (PostgreSQL RDS)
 * - Storage (S3 Buckets)
 * - Search (OpenSearch)
 * - Authentication (Cognito)
 * - API Gateway (HTTP + WebSocket)
 * - Lambda Functions (organized by domain)
 * - Monitoring (CloudWatch, Alarms)
 * - Cost Management (Budgets, Cost Monitoring)
 */

// Import sub-stack modules
import { createVpc } from './infrastructure/core/vpc'
import { createSecurityGroups } from './infrastructure/core/security-groups'
import { createPostgres } from './infrastructure/database/postgres'
import { createDatabaseIamRoles } from './infrastructure/database/iam-roles'
import { createS3Buckets } from './infrastructure/storage/s3-buckets'
import { applyS3LifecyclePolicies } from './infrastructure/storage/lifecycle-policies'
import { createOpenSearch } from './infrastructure/search/opensearch'
import { createCognito } from './infrastructure/auth/cognito'
import { createAuthIamRoles } from './infrastructure/auth/iam-roles'
import { createHttpApi } from './infrastructure/api/http-api'
import { createWebSocketApi } from './infrastructure/api/websocket-api'
import { createAuthorizers } from './infrastructure/api/authorizers'
import { createHealthCheckFunction } from './infrastructure/functions/health/health-check'
import { createAllFunctions } from './infrastructure/functions/all-functions'
import { createGalleryWishlistWebSocketFunctions } from './infrastructure/functions/gallery-wishlist-websocket'
import { createSnsTopics } from './infrastructure/monitoring/sns-topics'
import { createSimpleErrorRateAlarms } from './infrastructure/monitoring/simple-alarms'
import { createDashboards } from './infrastructure/monitoring/dashboards'
import { createBudgets } from './infrastructure/cost/budgets'
import { createCostMonitoring } from './infrastructure/cost/cost-monitoring'

export default $config({
  app(input) {
    return {
      name: 'lego-api-serverless',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
      // Story 5.7: AWS tagging schema compliance (all required tags)
      tags: {
        // Required tags (per aws-tagging-schema.md)
        Project: 'lego-api',
        Environment: input?.stage || 'development',
        ManagedBy: 'SST',
        CostCenter: 'Engineering',
        Owner: 'engineering@bricklink.com',
      },
    }
  },
  async run() {
    const stage = $app.stage

    // Dynamic import for observability tags (SST v3 requirement)
    const { createResourceTags } = await import('./infrastructure/observability/tags')

    // ========================================
    // 1. Core Infrastructure (Foundation)
    // ========================================
    const { vpc } = createVpc(stage, createResourceTags)
    const {
      lambdaSecurityGroup,
      rdsSecurityGroup,
      openSearchSecurityGroup,
      openReplaySecurityGroup,
      umamiSecurityGroup,
      observabilityAlbSecurityGroup,
    } = createSecurityGroups(vpc, stage)

    // ========================================
    // 2. Storage (S3 Buckets)
    // ========================================
    const { bucket, configBucket, openReplaySessionsBucket, cloudWatchLogsBucket } = createS3Buckets(stage)
    applyS3LifecyclePolicies(bucket)

    // ========================================
    // 3. Database (PostgreSQL)
    // ========================================
    const { postgres } = createPostgres(vpc, rdsSecurityGroup, stage)

    // ========================================
    // 4. Search (OpenSearch)
    // ========================================
    const { openSearch, openSearchLambdaPolicy } = createOpenSearch(vpc, openSearchSecurityGroup, stage)

    // ========================================
    // 5. Authentication (Cognito)
    // ========================================
    const { userPool, userPoolClient } = createCognito(stage)
    const {
      identityPool,
      authenticatedRole,
      grafanaWorkspaceRole,
      grafanaCloudWatchPolicy,
      grafanaOpenSearchPolicy,
    } = createAuthIamRoles(userPool, userPoolClient, openSearch, stage)

    // ========================================
    // 6. IAM Roles (Database-related)
    // ========================================
    const {
      ecsTaskExecutionRole,
      openReplayTaskRole,
      openReplayS3Policy,
      umamiTaskRole,
      umamiRdsPolicy,
      lambdaEmfPolicy,
    } = createDatabaseIamRoles(openReplaySessionsBucket, cloudWatchLogsBucket, postgres, openSearch, stage)

    // ========================================
    // 7. API Gateway
    // ========================================
    const { api } = createHttpApi(stage)
    const { websocketApi, websocketConnectionsTable } = createWebSocketApi(stage)
    const { cognitoAuthorizer } = createAuthorizers(api, userPool, userPoolClient, stage)

    // ========================================
    // 8. Lambda Functions
    // ========================================
    const { healthCheckFunction } = createHealthCheckFunction(
      vpc,
      postgres,
      openSearch,
      lambdaEmfPolicy,
      stage
    )

    const mainFunctions = createAllFunctions(
      vpc,
      postgres,
      bucket,
      openSearch,
      websocketConnectionsTable,
      lambdaEmfPolicy,
      openSearchLambdaPolicy,
      stage
    )

    const additionalFunctions = createGalleryWishlistWebSocketFunctions(
      vpc,
      postgres,
      bucket,
      openSearch,
      websocketConnectionsTable,
      lambdaEmfPolicy,
      openSearchLambdaPolicy,
      stage
    )

    // Combine all functions
    const allFunctions = {
      healthCheckFunction,
      ...mainFunctions,
      ...additionalFunctions,
    }

    // ========================================
    // 9. API Routes
    // ========================================
    // Health check - PUBLIC (no auth required)
    api.route('GET /health', healthCheckFunction)

    // MOC Instructions routes - PROTECTED
    api.route('GET /api/mocs', allFunctions.mocInstructionsFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })
    api.route('GET /api/mocs/{id}', allFunctions.mocInstructionsFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })
    api.route('POST /api/mocs', allFunctions.mocInstructionsFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })
    api.route('PATCH /api/mocs/{id}', allFunctions.mocInstructionsFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })
    api.route('DELETE /api/mocs/{id}', allFunctions.mocInstructionsFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })

    // MOC File operations
    api.route('POST /api/mocs/{id}/files', allFunctions.mocFileUploadFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })
    api.route('GET /api/mocs/{mocId}/files/{fileId}/download', allFunctions.mocFileDownloadFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })
    api.route('DELETE /api/mocs/{id}/files/{fileId}', allFunctions.mocFileDeleteFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })

    // Gallery routes
    api.route('POST /api/gallery/images', allFunctions.uploadImageFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })
    api.route('GET /api/gallery/images', allFunctions.listImagesFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })
    api.route('GET /api/gallery/search', allFunctions.searchImagesFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })

    // Wishlist routes
    api.route('GET /api/wishlist', allFunctions.listWishlistFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })
    api.route('POST /api/wishlist', allFunctions.createWishlistItemFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })

    // WebSocket routes
    websocketApi.route('$connect', allFunctions.websocketConnectFunction)
    websocketApi.route('$disconnect', allFunctions.websocketDisconnectFunction)
    websocketApi.route('$default', allFunctions.websocketDefaultFunction)

    // ========================================
    // 10. Monitoring (CloudWatch, Alarms)
    // ========================================
    const { errorAlertTopic, budgetAlertTopic } = createSnsTopics(stage)
    const alarms = createSimpleErrorRateAlarms(allFunctions, errorAlertTopic, stage)
    const { dashboardName, dashboardCreated } = createDashboards(
      api,
      allFunctions,
      postgres,
      openSearch,
      stage
    )

    // ========================================
    // 11. Cost Management (Budgets, Cost Monitoring)
    // ========================================
    const { userMetricsBudget } = createBudgets(budgetAlertTopic, stage)
    const { costMetricsPublisher, costMetricsSchedule, costMonitoringDashboard } = createCostMonitoring(stage)

    // ========================================
    // 12. Runtime Configuration
    // ========================================
    // Upload runtime configuration to S3
    new sst.aws.BucketFile('RuntimeConfig', {
      bucket: configBucket.name,
      key: 'config.json',
      source: $jsonStringify({
        api: {
          baseUrl: api.url,
          websocketUrl: websocketApi.url,
        },
        auth: {
          userPoolId: userPool.id,
          userPoolClientId: userPoolClient.id,
          identityPoolId: identityPool.id,
        },
        storage: {
          bucketName: bucket.name,
        },
        stage,
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
      }),
      cacheControl: 'max-age=60',
      contentType: 'application/json',
    })

    return {
      // Export key resources for reference
      api: api.url,
      websocketApi: websocketApi.url,
      database: postgres.connectionString,
      bucket: bucket.name,
      configBucket: configBucket.name,
      userPool: userPool.id,
      userPoolClient: userPoolClient.id,
      identityPool: identityPool.id,
      openSearchEndpoint: openSearch.endpoint,
      dashboardName,
      stage,

      // Summary
      message: `🚀 LEGO API Serverless deployed successfully to ${stage}!`,
      functionsDeployed: Object.keys(allFunctions).length,
      monitoringEnabled: dashboardCreated,
      costMonitoringEnabled: true,
    }
  },
})
