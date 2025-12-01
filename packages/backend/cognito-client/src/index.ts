/**
 * AWS Cognito Client for User Profile Operations
 *
 * Provides utilities to interact with AWS Cognito User Pool for retrieving
 * and updating user profile information.
 */

import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  type AdminGetUserCommandOutput,
  type AttributeType,
} from '@aws-sdk/client-cognito-identity-provider'

/**
 * Logger interface - consumers can provide their own logger
 */
export interface CognitoClientLogger {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

/**
 * Default no-op logger
 */
const defaultLogger: CognitoClientLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

/**
 * Configuration for Cognito client
 */
export interface CognitoClientConfig {
  /**
   * AWS region (defaults to process.env.AWS_REGION or 'us-east-1')
   */
  region?: string

  /**
   * Cognito User Pool ID (defaults to process.env.COGNITO_USER_POOL_ID)
   */
  userPoolId?: string

  /**
   * Optional logger instance
   */
  logger?: CognitoClientLogger
}

/**
 * Singleton Cognito client instance
 */
let cognitoClient: CognitoIdentityProviderClient | null = null
let clientLogger: CognitoClientLogger = defaultLogger

/**
 * Get or create Cognito client instance
 *
 * @param config - Optional configuration for the client
 * @returns CognitoIdentityProviderClient instance
 */
export function getCognitoClient(config?: CognitoClientConfig): CognitoIdentityProviderClient {
  if (!cognitoClient) {
    const region = config?.region || process.env.AWS_REGION || 'us-east-1'
    clientLogger = config?.logger || defaultLogger

    cognitoClient = new CognitoIdentityProviderClient({ region })

    clientLogger.info('Cognito client initialized', { region })
  }
  return cognitoClient
}

/**
 * Get user profile from Cognito User Pool
 *
 * @param userId - Cognito user ID (sub claim from JWT)
 * @param config - Optional configuration
 * @returns Cognito user attributes or null if user not found
 */
export async function getCognitoUser(
  userId: string,
  config?: CognitoClientConfig,
): Promise<AdminGetUserCommandOutput | null> {
  try {
    const client = getCognitoClient(config)
    const logger = config?.logger || clientLogger
    const userPoolId = config?.userPoolId || process.env.COGNITO_USER_POOL_ID

    if (!userPoolId) {
      throw new Error('COGNITO_USER_POOL_ID not configured')
    }

    const command = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: userId, // For Cognito, username can be the sub (user ID)
    })

    const response = await client.send(command)
    logger.debug('Retrieved Cognito user', { userId, username: response.Username })
    return response
  } catch (error) {
    const logger = config?.logger || clientLogger
    logger.error('Failed to get Cognito user', { userId, error })
    return null
  }
}

/**
 * Update user attributes in Cognito User Pool
 *
 * @param userId - Cognito user ID (sub claim from JWT)
 * @param attributes - Attributes to update
 * @param config - Optional configuration
 * @returns True if successful, false otherwise
 */
export async function updateCognitoUserAttributes(
  userId: string,
  attributes: AttributeType[],
  config?: CognitoClientConfig,
): Promise<boolean> {
  try {
    const client = getCognitoClient(config)
    const logger = config?.logger || clientLogger
    const userPoolId = config?.userPoolId || process.env.COGNITO_USER_POOL_ID

    if (!userPoolId) {
      throw new Error('COGNITO_USER_POOL_ID not configured')
    }

    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: userId,
      UserAttributes: attributes,
    })

    await client.send(command)
    logger.info('Updated Cognito user attributes', { userId, attributeCount: attributes.length })
    return true
  } catch (error) {
    const logger = config?.logger || clientLogger
    logger.error('Failed to update Cognito user attributes', { userId, error })
    return false
  }
}

/**
 * Helper to extract attribute value from Cognito user attributes
 *
 * @param attributes - Array of Cognito attributes
 * @param name - Attribute name to extract
 * @returns Attribute value or null if not found
 */
export function getCognitoAttribute(
  attributes: AttributeType[] | undefined,
  name: string,
): string | null {
  if (!attributes) {
    return null
  }

  const attribute = attributes.find(attr => attr.Name === name)
  return attribute?.Value || null
}

/**
 * Re-export AWS SDK types for convenience
 */
export type {
  AdminGetUserCommandOutput,
  AttributeType,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider'
