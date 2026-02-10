import { z } from 'zod'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import {
  type Feature,
  type QuotaType,
  type Tier,
  type AuthorizationErrorCode,
  FeatureErrorResponseSchema,
  QuotaErrorResponseSchema,
  SuspendedErrorResponseSchema,
  FEATURE_DISPLAY_NAMES,
  QUOTA_DISPLAY_NAMES,
  TIER_DISPLAY_NAMES,
} from '../schemas/permissions'

/**
 * Authorization Error Utilities
 *
 * Utilities for detecting and handling authorization-specific errors
 * from the permissions API (403/429 responses).
 */

// ─────────────────────────────────────────────────────────────────────────
// Error Type Guards
// ─────────────────────────────────────────────────────────────────────────

/**
 * Parsed authorization error with typed data
 */
export type ParsedAuthorizationError =
  | {
      type: 'FEATURE_NOT_AVAILABLE'
      feature: Feature
      requiredTier: Tier
      currentTier: Tier
      message: string
    }
  | {
      type: 'QUOTA_EXCEEDED'
      quotaType: QuotaType
      current: number
      limit: number
      message: string
    }
  | {
      type: 'ACCOUNT_SUSPENDED'
      reason: string | null
      message: string
    }
  | {
      type: 'UNKNOWN'
      code: string
      message: string
    }

/**
 * Check if an error is a FetchBaseQueryError
 */
export function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    ('data' in error || 'error' in error)
  )
}

/**
 * Get the error data from a FetchBaseQueryError
 */
function getErrorData(error: FetchBaseQueryError): unknown {
  if ('data' in error && error.data) {
    const data = error.data as Record<string, unknown>
    // Handle wrapped error format: { error: { code, message, ... } }
    if ('error' in data && typeof data.error === 'object') {
      return data.error
    }
    return data
  }
  return null
}

/**
 * Check if error is a 403 Forbidden response
 */
export function isForbiddenError(error: unknown): boolean {
  return isFetchBaseQueryError(error) && error.status === 403
}

/**
 * Check if error is a 429 Too Many Requests response
 */
export function isQuotaExceededError(error: unknown): boolean {
  return isFetchBaseQueryError(error) && error.status === 429
}

/**
 * Parse an RTK Query error into a typed authorization error
 */
export function parseAuthorizationError(error: unknown): ParsedAuthorizationError | null {
  if (!isFetchBaseQueryError(error)) {
    return null
  }

  const data = getErrorData(error)
  if (!data || typeof data !== 'object') {
    return null
  }

  const errorData = data as Record<string, unknown>
  const errorCode = errorData.error || errorData.code

  // Try to parse as feature error
  const featureResult = FeatureErrorResponseSchema.safeParse(errorData)
  if (featureResult.success) {
    return {
      type: 'FEATURE_NOT_AVAILABLE',
      feature: featureResult.data.feature,
      requiredTier: featureResult.data.requiredTier,
      currentTier: featureResult.data.currentTier,
      message: featureResult.data.message,
    }
  }

  // Try to parse as quota error
  const quotaResult = QuotaErrorResponseSchema.safeParse(errorData)
  if (quotaResult.success) {
    return {
      type: 'QUOTA_EXCEEDED',
      quotaType: quotaResult.data.quotaType,
      current: quotaResult.data.current,
      limit: quotaResult.data.limit,
      message: quotaResult.data.message,
    }
  }

  // Try to parse as suspended error
  const suspendedResult = SuspendedErrorResponseSchema.safeParse(errorData)
  if (suspendedResult.success) {
    return {
      type: 'ACCOUNT_SUSPENDED',
      reason: suspendedResult.data.reason,
      message: suspendedResult.data.message,
    }
  }

  // Check for known error codes in the error data
  if (errorCode === 'FEATURE_NOT_AVAILABLE') {
    return {
      type: 'FEATURE_NOT_AVAILABLE',
      feature: (errorData.feature as Feature) || 'gallery',
      requiredTier: (errorData.requiredTier as Tier) || 'pro-tier',
      currentTier: (errorData.currentTier as Tier) || 'free-tier',
      message: (errorData.message as string) || 'This feature is not available on your plan',
    }
  }

  if (errorCode === 'QUOTA_EXCEEDED') {
    return {
      type: 'QUOTA_EXCEEDED',
      quotaType: (errorData.quotaType as QuotaType) || 'mocs',
      current: (errorData.current as number) || 0,
      limit: (errorData.limit as number) || 0,
      message: (errorData.message as string) || 'You have reached your quota limit',
    }
  }

  if (errorCode === 'ACCOUNT_SUSPENDED') {
    return {
      type: 'ACCOUNT_SUSPENDED',
      reason: (errorData.reason as string | null) || null,
      message: (errorData.message as string) || 'Your account has been suspended',
    }
  }

  // Unknown error format
  if (typeof errorCode === 'string') {
    return {
      type: 'UNKNOWN',
      code: errorCode,
      message: (errorData.message as string) || 'An authorization error occurred',
    }
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────
// Error Display Helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get a user-friendly title for an authorization error
 */
export function getAuthorizationErrorTitle(error: ParsedAuthorizationError): string {
  switch (error.type) {
    case 'FEATURE_NOT_AVAILABLE':
      return `${FEATURE_DISPLAY_NAMES[error.feature]} is a ${TIER_DISPLAY_NAMES[error.requiredTier]} Feature`
    case 'QUOTA_EXCEEDED':
      return `${QUOTA_DISPLAY_NAMES[error.quotaType]} Limit Reached`
    case 'ACCOUNT_SUSPENDED':
      return 'Account Suspended'
    case 'UNKNOWN':
      return 'Access Denied'
  }
}

/**
 * Get a user-friendly description for an authorization error
 */
export function getAuthorizationErrorDescription(error: ParsedAuthorizationError): string {
  switch (error.type) {
    case 'FEATURE_NOT_AVAILABLE':
      return `Upgrade from ${TIER_DISPLAY_NAMES[error.currentTier]} to ${TIER_DISPLAY_NAMES[error.requiredTier]} to access this feature.`
    case 'QUOTA_EXCEEDED':
      return `You've used ${error.current} of ${error.limit} ${QUOTA_DISPLAY_NAMES[error.quotaType]}. Upgrade your plan for more.`
    case 'ACCOUNT_SUSPENDED':
      return error.reason || 'Please contact support for more information.'
    case 'UNKNOWN':
      return error.message
  }
}

/**
 * Get the action button text for an authorization error
 */
export function getAuthorizationErrorAction(error: ParsedAuthorizationError): {
  text: string
  type: 'upgrade' | 'contact' | 'none'
} {
  switch (error.type) {
    case 'FEATURE_NOT_AVAILABLE':
      return { text: 'View Upgrade Options', type: 'upgrade' }
    case 'QUOTA_EXCEEDED':
      return { text: 'Upgrade Plan', type: 'upgrade' }
    case 'ACCOUNT_SUSPENDED':
      return { text: 'Contact Support', type: 'contact' }
    case 'UNKNOWN':
      return { text: '', type: 'none' }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Convenience Checkers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Check if error is specifically a feature not available error
 */
export function isFeatureNotAvailableError(error: unknown): boolean {
  const parsed = parseAuthorizationError(error)
  return parsed?.type === 'FEATURE_NOT_AVAILABLE'
}

/**
 * Check if error is specifically a quota exceeded error
 */
export function isQuotaExceededErrorParsed(error: unknown): boolean {
  const parsed = parseAuthorizationError(error)
  return parsed?.type === 'QUOTA_EXCEEDED'
}

/**
 * Check if error is specifically an account suspended error
 */
export function isAccountSuspendedError(error: unknown): boolean {
  const parsed = parseAuthorizationError(error)
  return parsed?.type === 'ACCOUNT_SUSPENDED'
}

/**
 * Check if error is any authorization-related error
 */
export function isAuthorizationError(error: unknown): boolean {
  return parseAuthorizationError(error) !== null
}
