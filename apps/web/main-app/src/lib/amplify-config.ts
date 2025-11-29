/**
 * AWS Amplify Configuration
 *
 * Configures AWS Amplify v6 for Cognito authentication.
 * This module must be imported and called BEFORE React renders
 * to ensure Amplify is configured when auth operations are attempted.
 */

import { Amplify, type ResourcesConfig } from 'aws-amplify'
import { logger } from '@repo/logger'

/**
 * Amplify configuration object
 * Uses Vite environment variables for Cognito settings
 */
export const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_AWS_USER_POOL_WEB_CLIENT_ID || '',
      loginWith: {
        email: true,
      },
    },
  },
}

/**
 * Flag to track if Amplify has been configured
 */
let isConfigured = false

/**
 * Configure AWS Amplify with Cognito settings
 *
 * This function should be called once at application startup,
 * before React renders, typically in main.tsx
 *
 * @returns boolean - true if configuration was successful
 */
export const configureAmplify = (): boolean => {
  if (isConfigured) {
    logger.warn('Amplify already configured, skipping duplicate configuration')
    return true
  }

  const userPoolId = import.meta.env.VITE_AWS_USER_POOL_ID
  const clientId = import.meta.env.VITE_AWS_USER_POOL_WEB_CLIENT_ID

  // Validate required environment variables
  if (!userPoolId || !clientId) {
    logger.error('Missing required Cognito environment variables', {
      hasUserPoolId: !!userPoolId,
      hasClientId: !!clientId,
    })

    // In development, log more details
    if (import.meta.env.DEV) {
      logger.warn(
        'Amplify configuration skipped - ensure VITE_AWS_USER_POOL_ID and VITE_AWS_USER_POOL_WEB_CLIENT_ID are set',
      )
    }

    return false
  }

  try {
    Amplify.configure(amplifyConfig)
    isConfigured = true

    logger.info('AWS Amplify configured successfully', {
      region: userPoolId.split('_')[0], // Extract region from user pool ID
      userPoolId: `${userPoolId.substring(0, 15)}...`, // Partial for logging
    })

    return true
  } catch (error) {
    logger.error('Failed to configure AWS Amplify', { error })
    return false
  }
}

/**
 * Check if Amplify has been configured
 */
export const isAmplifyConfigured = (): boolean => isConfigured

/**
 * Get the current Amplify configuration (for debugging)
 */
export const getAmplifyConfig = (): ResourcesConfig => amplifyConfig
