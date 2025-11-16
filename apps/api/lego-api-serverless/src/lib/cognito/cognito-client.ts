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
import { createLogger } from '../utils/logger'

const logger = createLogger('cognito-client')

/**
 * Singleton Cognito client instance
 */
let cognitoClient: CognitoIdentityProviderClient | null = null

/**
 * Get or create Cognito client instance
 */
export function getCognitoClient(): CognitoIdentityProviderClient {
  if (!cognitoClient) {
    cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || 'us-east-1',
    })
    logger.info('Cognito client initialized', {
      region: process.env.AWS_REGION || 'us-east-1',
    })
  }
  return cognitoClient
}

/**
 * Get user profile from Cognito User Pool
 *
 * @param userId - Cognito user ID (sub claim from JWT)
 * @returns Cognito user attributes or null if user not found
 */
export async function getCognitoUser(userId: string): Promise<AdminGetUserCommandOutput | null> {
  try {
    const client = getCognitoClient()
    const userPoolId = process.env.COGNITO_USER_POOL_ID

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
    logger.error('Failed to get Cognito user', { userId, error })
    return null
  }
}

/**
 * Update user attributes in Cognito User Pool
 *
 * @param userId - Cognito user ID (sub claim from JWT)
 * @param attributes - Attributes to update
 * @returns True if successful, false otherwise
 */
export async function updateCognitoUserAttributes(
  userId: string,
  attributes: AttributeType[],
): Promise<boolean> {
  try {
    const client = getCognitoClient()
    const userPoolId = process.env.COGNITO_USER_POOL_ID

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
