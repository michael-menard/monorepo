/**
 * API Gateway Authorizers
 * 
 * Creates JWT authorizers for API Gateway:
 * - Cognito JWT Authorizer for HTTP API
 * - Validates JWT tokens from Cognito User Pool
 * - Rejects requests before Lambda execution (saves costs)
 */

export function createAuthorizers(api: any, userPool: any, userPoolClient: any, stage: string) {
  /**
   * Cognito JWT Authorizer for HTTP API
   * - Validates JWT tokens from Cognito User Pool
   * - Rejects requests before Lambda execution (saves costs)
   * - Uses SST-managed Cognito User Pool and Client
   */
  const region = aws.getRegionOutput().name

  const cognitoAuthorizer = new aws.apigatewayv2.Authorizer('CognitoJwtAuthorizer', {
    apiId: api.nodes.api.id,
    authorizerType: 'JWT',
    identitySources: ['$request.header.Authorization'],
    name: `cognito-jwt-authorizer-${stage}`,
    jwtConfiguration: {
      audiences: [userPoolClient.id],
      issuer: $interpolate`https://cognito-idp.${region}.amazonaws.com/${userPool.id}`,
    },
  })

  return {
    cognitoAuthorizer,
  }
}
