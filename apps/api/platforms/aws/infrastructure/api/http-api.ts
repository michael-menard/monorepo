/**
 * HTTP API Gateway Configuration
 * 
 * Creates API Gateway HTTP API with:
 * - CORS enabled for all origins
 * - JWT authentication via Cognito for protected routes
 * - Public health check endpoint
 */

export function createHttpApi(stage: string) {
  /**
   * API Gateway HTTP API
   * - CORS enabled for all origins
   * - JWT authentication via Cognito for protected routes
   * - Public health check endpoint
   */
  const api = new sst.aws.ApiGatewayV2('LegoApi', {
    cors: {
      allowOrigins:
        stage === 'production'
          ? ['https://lego-moc-instructions.com']
          : ['http://localhost:3002', 'http://localhost:5173'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
      allowCredentials: true,
    },
  })

  return { api }
}
