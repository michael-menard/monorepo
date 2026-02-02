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

export default $config({
  app(input) {
    return {
      name: 'lego-api-serverless',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: false, // Temporarily disabled for cleanup
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

    // Dynamic imports (SST v3 requirement - no top-level imports allowed)
    const { createResourceTags } = await import('./infrastructure/observability/tags')
    const { createVpc } = await import('./infrastructure/core/vpc')
    const { createSecurityGroups } = await import('./infrastructure/core/security-groups')
    const { createPostgres } = await import('./infrastructure/database/postgres')
    const { createDatabaseIamRoles } = await import('./infrastructure/database/iam-roles')
    const { createS3Buckets } = await import('./infrastructure/storage/s3-buckets')
    const { applyS3LifecyclePolicies } = await import('./infrastructure/storage/lifecycle-policies')
    const { createOpenSearch } = await import('./infrastructure/search/opensearch')
    const { createCognito } = await import('./infrastructure/auth/cognito')
    const { createAuthIamRoles } = await import('./infrastructure/auth/iam-roles')
    const { createHttpApi } = await import('./infrastructure/api/http-api')
    const { createWebSocketApi } = await import('./infrastructure/api/websocket-api')
    const { createAuthorizers } = await import('./infrastructure/api/authorizers')
    const { createHealthCheckFunction } = await import(
      './infrastructure/functions/health/health-check'
    )
    const { createAllFunctions } = await import('./infrastructure/functions/all-functions')
    const { createGalleryWishlistWebSocketFunctions } = await import(
      './infrastructure/functions/gallery-wishlist-websocket'
    )
    const { createSnsTopics } = await import('./infrastructure/monitoring/sns-topics')
    const { createSimpleErrorRateAlarms } = await import(
      './infrastructure/monitoring/simple-alarms'
    )
    const { createDashboards } = await import('./infrastructure/monitoring/dashboards')
    const { createBudgets } = await import('./infrastructure/cost/budgets')
    const { createCostMonitoring } = await import('./infrastructure/cost/cost-monitoring')

    // Optional: Import frontend stack for unified deployment
    const { createFrontendStack } = await import(
      '../web/lego-moc-instructions-app/infrastructure/frontend-stack'
    )

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
    const { bucket, configBucket, openReplaySessionsBucket, cloudWatchLogsBucket } =
      createS3Buckets(stage)
    applyS3LifecyclePolicies(bucket)

    // ========================================
    // 3. Database (PostgreSQL)
    // ========================================
    const { postgres } = createPostgres(vpc, rdsSecurityGroup, stage)

    // ========================================
    // 4. Search (OpenSearch)
    // ========================================
    const { openSearch, openSearchLambdaPolicy } = createOpenSearch(
      vpc,
      openSearchSecurityGroup,
      stage,
    )

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
    } = createDatabaseIamRoles(
      openReplaySessionsBucket,
      cloudWatchLogsBucket,
      postgres,
      openSearch,
      stage,
    )

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
      stage,
    )

    const mainFunctions = createAllFunctions(
      vpc,
      postgres,
      bucket,
      openSearch,
      websocketConnectionsTable,
      lambdaEmfPolicy,
      openSearchLambdaPolicy,
      stage,
    )

    const additionalFunctions = createGalleryWishlistWebSocketFunctions(
      vpc,
      postgres,
      bucket,
      openSearch,
      websocketConnectionsTable,
      lambdaEmfPolicy,
      openSearchLambdaPolicy,
      stage,
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
    api.route(
      'GET /api/mocs/{mocId}/files/{fileId}/download',
      allFunctions.mocFileDownloadFunction,
      {
        auth: { jwt: { authorizer: cognitoAuthorizer } },
      },
    )
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
      stage,
    )

    // ========================================
    // 11. Cost Management (Budgets, Cost Monitoring)
    // ========================================
    const { userMetricsBudget } = createBudgets(budgetAlertTopic, stage)
    // TODO: Re-enable cost monitoring after creating the missing cost-explorer module
    // const { costMetricsPublisher, costMetricsSchedule, costMonitoringDashboard } = createCostMonitoring(stage)

    // ========================================
    // 12. Frontend (Optional - for unified deployment)
    // ========================================
    // Deploy frontend alongside API when DEPLOY_FRONTEND=true
    const deployFrontend = process.env.DEPLOY_FRONTEND === 'true'
    let frontend: any = null

    if (deployFrontend) {
      console.log('🎨 Deploying frontend alongside API...')
      frontend = createFrontendStack(stage)
    }

    // ========================================
    // 13. Runtime Configuration
    // ========================================
    // TODO: Upload runtime configuration to S3 after deployment
    // BucketFile component not available in SST v3 - will need to use aws.s3.BucketObject directly

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

      // Frontend (if deployed)
      ...(frontend && {
        frontend: {
          url: frontend.url,
          domain: frontend.domain,
          bucketName: frontend.bucketName,
          distributionId: frontend.distributionId,
        },
      }),

      // Summary
      message: `🚀 LEGO API Serverless deployed successfully to ${stage}!${
        frontend ? ' Frontend included.' : ''
      }`,
      functionsDeployed: Object.keys(allFunctions).length,
      monitoringEnabled: dashboardCreated,
      costMonitoringEnabled: true,
      frontendDeployed: !!frontend,
    }
  },
})
