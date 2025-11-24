/// <reference path="./.sst/platform/config.d.ts" />

/**
 * API Gateway Stack
 *
 * Contains API Gateway, Cognito Auth, and routing infrastructure.
 * References shared infrastructure for database connections.
 */

export default $config({
  app(input) {
    return {
      name: 'lego-api-gateway',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: input?.stage === 'production',
      home: 'aws',
      tags: {
        Project: 'lego-monorepo',
        Environment: input?.stage || 'development',
        ManagedBy: 'SST',
        Component: 'api-gateway',
        CostCenter: 'Engineering',
        Owner: 'engineering@bricklink.com',
      },
    }
  },
  async run() {
    const stage = $app.stage

    // Import API Gateway components
    const { createHttpApi } = await import('../infrastructure/api/http-api')
    const { createWebSocketApi } = await import('../infrastructure/api/websocket-api')
    const { createCognito } = await import('../infrastructure/auth/cognito')
    const { createAuthorizers } = await import('../infrastructure/api/authorizers')

    // Create API infrastructure (no Lambda functions yet)
    const { api } = createHttpApi(stage)
    const { websocketApi } = createWebSocketApi(stage)
    const { userPool, userPoolClient, identityPool } = createCognito(stage)
    const { cognitoAuthorizer } = createAuthorizers(userPool, stage)

    // Export API Gateway resources for function groups to reference
    return {
      // API Gateway
      apiId: api.id,
      apiUrl: api.url,
      websocketApiId: websocketApi.id,
      websocketApiUrl: websocketApi.url,

      // Auth
      userPoolId: userPool.id,
      userPoolClientId: userPoolClient.id,
      identityPoolId: identityPool.id,
      cognitoAuthorizerId: cognitoAuthorizer.id,

      // Metadata
      stage,
      message: `🚪 API Gateway deployed to ${stage}`,
    }
  },
})
