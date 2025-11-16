/**
 * Zod Schemas for JWT Authentication Validation
 *
 * Following coding standards: Use Zod schemas + inferred types over manual type definitions.
 */

import { z } from 'zod'

/**
 * Schema for JWT claims from Cognito
 *
 * Standard JWT claims + Cognito-specific claims
 */
export const CognitoJwtClaimsSchema = z
  .object({
    // Standard JWT claims
    sub: z.string().min(1, 'User ID (sub) is required'), // Cognito User ID
    iss: z.string().url('Issuer must be a valid URL'), // Cognito User Pool issuer
    aud: z.string().min(1, 'Audience is required'), // Client ID
    exp: z.number().int().positive('Expiration time must be positive'), // Expiration timestamp
    iat: z.number().int().positive('Issued at time must be positive'), // Issued at timestamp
    token_use: z.enum(['id', 'access']).optional(), // Cognito token type

    // Cognito-specific claims
    'cognito:username': z.string().optional(),
    email: z.string().email().optional(),
    email_verified: z.union([z.string(), z.boolean()]).optional(),
    'cognito:groups': z.array(z.string()).optional(),

    // Allow additional claims
  })
  .passthrough()

export type CognitoJwtClaims = z.infer<typeof CognitoJwtClaimsSchema>

/**
 * Schema for API Gateway v2 JWT authorizer context
 */
export const JwtAuthorizerSchema = z
  .object({
    jwt: z
      .object({
        claims: z.record(z.any()).optional(),
      })
      .optional(),
  })
  .optional()

/**
 * Schema for API Gateway v2 request context with JWT authorizer
 */
export const RequestContextSchema = z
  .object({
    authorizer: JwtAuthorizerSchema,
  })
  .passthrough()

/**
 * Schema for API Gateway v2 event (partial - only what we need for auth)
 */
export const ApiGatewayEventSchema = z
  .object({
    requestContext: RequestContextSchema,
    pathParameters: z.record(z.string()).nullable().optional(),
  })
  .passthrough()

export type ApiGatewayEvent = z.infer<typeof ApiGatewayEventSchema>

/**
 * Schema for validating Cognito issuer URL
 * Format: https://cognito-idp.{region}.amazonaws.com/{userPoolId}
 */
export const CognitoIssuerSchema = z
  .string()
  .regex(
    /^https:\/\/cognito-idp\.[a-z0-9-]+\.amazonaws\.com\/[a-zA-Z0-9_-]+$/,
    'Invalid Cognito issuer format',
  )

/**
 * Schema for resource ID validation (UUID or custom format)
 */
export const ResourceIdSchema = z.string().trim().min(1, 'Resource ID cannot be empty')

/**
 * Schema for user ID validation (Cognito sub claim)
 */
export const UserIdSchema = z.string().trim().min(1, 'User ID cannot be empty')

/**
 * Configuration schema for JWT validation
 */
export const JwtValidationConfigSchema = z.object({
  // Expected Cognito User Pool issuer URL
  expectedIssuer: CognitoIssuerSchema,
  // Expected audience (Cognito Client ID)
  expectedAudience: z.string().min(1, 'Expected audience is required'),
  // Clock skew tolerance in seconds (default: 300 = 5 minutes)
  clockSkewTolerance: z.number().int().nonnegative().default(300),
  // Whether to validate token expiration (default: true)
  validateExpiration: z.boolean().default(true),
})

export type JwtValidationConfig = z.infer<typeof JwtValidationConfigSchema>

/**
 * Default JWT validation configuration
 * Should be overridden with actual Cognito User Pool details
 */
export const createDefaultJwtConfig = (
  userPoolId: string,
  region: string = 'us-east-1',
  clientId: string,
): JwtValidationConfig => {
  return JwtValidationConfigSchema.parse({
    expectedIssuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    expectedAudience: clientId,
    clockSkewTolerance: 300,
    validateExpiration: true,
  })
}
