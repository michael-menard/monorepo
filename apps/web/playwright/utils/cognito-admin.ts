/**
 * Cognito Admin Utilities for E2E Testing
 *
 * This module provides admin-level Cognito operations for testing purposes.
 * It uses the AWS SDK to bypass email verification and manage test users.
 *
 * Requirements:
 * - AWS credentials must be configured (via environment variables, AWS profile, or IAM role)
 * - The credentials must have permission to call Cognito admin APIs
 *
 * Required IAM permissions:
 * - cognito-idp:AdminConfirmSignUp
 * - cognito-idp:AdminDeleteUser
 * - cognito-idp:AdminGetUser
 */

import {
  CognitoIdentityProviderClient,
  AdminConfirmSignUpCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider'

// Cognito configuration - matches the main app's configuration
const COGNITO_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  userPoolId: process.env.COGNITO_USER_POOL_ID || 'us-east-1_jJPnVUCxF',
}

// Create the Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region,
})

/**
 * Confirm a user's sign up without requiring email verification
 * This bypasses the need to intercept verification emails during testing
 *
 * @param email - The user's email address (used as username in Cognito)
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function adminConfirmSignUp(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await cognitoClient.send(
      new AdminConfirmSignUpCommand({
        UserPoolId: COGNITO_CONFIG.userPoolId,
        Username: email,
      }),
    )

    console.log(`✅ Successfully confirmed user: ${email}`)
    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ Failed to confirm user ${email}:`, errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Delete a test user from Cognito
 * Use this to clean up test users after tests complete
 *
 * @param email - The user's email address (used as username in Cognito)
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function adminDeleteUser(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: COGNITO_CONFIG.userPoolId,
        Username: email,
      }),
    )

    console.log(`✅ Successfully deleted user: ${email}`)
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof UserNotFoundException) {
      console.log(`ℹ️ User ${email} does not exist (already deleted)`)
      return { success: true }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ Failed to delete user ${email}:`, errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Check if a user exists in Cognito
 *
 * @param email - The user's email address (used as username in Cognito)
 * @returns Promise<{ exists: boolean; confirmed?: boolean; error?: string }>
 */
export async function adminGetUser(
  email: string,
): Promise<{ exists: boolean; confirmed?: boolean; error?: string }> {
  try {
    const response = await cognitoClient.send(
      new AdminGetUserCommand({
        UserPoolId: COGNITO_CONFIG.userPoolId,
        Username: email,
      }),
    )

    const isConfirmed = response.UserStatus === 'CONFIRMED'
    console.log(`ℹ️ User ${email} exists (confirmed: ${isConfirmed})`)
    return { exists: true, confirmed: isConfirmed }
  } catch (error: unknown) {
    if (error instanceof UserNotFoundException) {
      return { exists: false }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ Failed to get user ${email}:`, errorMessage)
    return { exists: false, error: errorMessage }
  }
}

/**
 * Helper to generate a unique test email address
 * Uses timestamp to ensure uniqueness across test runs
 *
 * @param prefix - Optional prefix for the email (default: 'testuser')
 * @returns A unique email address for testing
 */
export function generateTestEmail(prefix = 'testuser'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}+${timestamp}${random}@test.example.com`
}

/**
 * Clean up a test user - delete if exists
 * Safe to call even if user doesn't exist
 *
 * @param email - The user's email address
 */
export async function cleanupTestUser(email: string): Promise<void> {
  await adminDeleteUser(email)
}
