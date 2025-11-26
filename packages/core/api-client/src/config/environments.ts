/**
 * Serverless API Configuration
 * Reads configuration from environment variables
 */

import { createLogger } from '@repo/logger'

const logger = createLogger('api-client:config')

export interface ServerlessApiConfig {
  baseUrl: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  maxRetryDelay: number
  connectionWarmingEnabled: boolean
}

/**
 * Get serverless API configuration from environment variables
 * @throws {Error} If required environment variables are missing
 */
export function getServerlessApiConfig(): ServerlessApiConfig {
  const baseUrl = import.meta.env.VITE_SERVERLESS_API_BASE_URL
  const timeout = parseInt(import.meta.env.VITE_SERVERLESS_API_TIMEOUT || '15000')
  const retryAttempts = parseInt(import.meta.env.VITE_SERVERLESS_API_RETRY_ATTEMPTS || '3')
  const retryDelay = parseInt(import.meta.env.VITE_SERVERLESS_API_RETRY_DELAY || '1000')
  const maxRetryDelay = parseInt(import.meta.env.VITE_SERVERLESS_API_MAX_RETRY_DELAY || '10000')
  const connectionWarmingEnabled = import.meta.env.VITE_SERVERLESS_CONNECTION_WARMING !== 'false'

  if (!baseUrl) {
    throw new Error(
      'VITE_SERVERLESS_API_BASE_URL environment variable is required. ' +
      'Please set it in your .env file (e.g., .env.development, .env.production)'
    )
  }

  // Validate URL format
  try {
    new URL(baseUrl)
  } catch {
    throw new Error(
      `Invalid VITE_SERVERLESS_API_BASE_URL: "${baseUrl}". Must be a valid URL.`
    )
  }

  return {
    baseUrl,
    timeout,
    retryAttempts,
    retryDelay,
    maxRetryDelay,
    connectionWarmingEnabled,
  }
}

/**
 * Environment variable validation schema
 */
export const ENV_VARS = {
  VITE_SERVERLESS_API_BASE_URL: 'string (required)',
  VITE_SERVERLESS_API_TIMEOUT: 'number (optional, default: 15000)',
  VITE_SERVERLESS_API_RETRY_ATTEMPTS: 'number (optional, default: 3)',
  VITE_SERVERLESS_API_RETRY_DELAY: 'number (optional, default: 1000)',
  VITE_SERVERLESS_API_MAX_RETRY_DELAY: 'number (optional, default: 10000)',
  VITE_SERVERLESS_CONNECTION_WARMING: 'boolean (optional, default: true)',
} as const

/**
 * Validate environment configuration
 */
export function validateEnvironmentConfig(): void {
  try {
    getServerlessApiConfig()
    logger.info('✅ Serverless API configuration validated successfully')
  } catch (error) {
    logger.error('❌ Serverless API Configuration Error', error instanceof Error ? error : new Error(String(error)))
    logger.info('📋 Required Environment Variables:')
    Object.entries(ENV_VARS).forEach(([key, description]) => {
      logger.info(`  ${key}: ${description}`)
    })
    throw error
  }
}
