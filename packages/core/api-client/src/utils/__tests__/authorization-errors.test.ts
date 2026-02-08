import { describe, it, expect } from 'vitest'
import {
  parseAuthorizationError,
  isForbiddenError,
  isQuotaExceededError,
  isFeatureNotAvailableError,
  isQuotaExceededErrorParsed,
  isAccountSuspendedError,
  isAuthorizationError,
  isFetchBaseQueryError,
  getAuthorizationErrorTitle,
  getAuthorizationErrorDescription,
  getAuthorizationErrorAction,
  type ParsedAuthorizationError,
} from '../authorization-errors'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'

describe('Authorization Error Utilities', () => {
  describe('isFetchBaseQueryError', () => {
    it('should return true for valid FetchBaseQueryError', () => {
      const error: FetchBaseQueryError = {
        status: 403,
        data: { error: 'FEATURE_NOT_AVAILABLE' },
      }
      expect(isFetchBaseQueryError(error)).toBe(true)
    })

    it('should return false for null', () => {
      expect(isFetchBaseQueryError(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isFetchBaseQueryError(undefined)).toBe(false)
    })

    it('should return false for plain objects without status', () => {
      expect(isFetchBaseQueryError({ data: {} })).toBe(false)
    })
  })

  describe('isForbiddenError', () => {
    it('should return true for 403 status', () => {
      const error: FetchBaseQueryError = { status: 403, data: {} }
      expect(isForbiddenError(error)).toBe(true)
    })

    it('should return false for other status codes', () => {
      const error: FetchBaseQueryError = { status: 401, data: {} }
      expect(isForbiddenError(error)).toBe(false)
    })
  })

  describe('isQuotaExceededError', () => {
    it('should return true for 429 status', () => {
      const error: FetchBaseQueryError = { status: 429, data: {} }
      expect(isQuotaExceededError(error)).toBe(true)
    })

    it('should return false for other status codes', () => {
      const error: FetchBaseQueryError = { status: 403, data: {} }
      expect(isQuotaExceededError(error)).toBe(false)
    })
  })

  describe('parseAuthorizationError', () => {
    it('should parse feature not available error from wrapped format', () => {
      const error: FetchBaseQueryError = {
        status: 403,
        data: {
          error: {
            error: 'FEATURE_NOT_AVAILABLE',
            message: 'Gallery requires Pro tier',
            feature: 'gallery',
            requiredTier: 'pro-tier',
            currentTier: 'free-tier',
          },
        },
      }

      const result = parseAuthorizationError(error)
      expect(result).toEqual({
        type: 'FEATURE_NOT_AVAILABLE',
        feature: 'gallery',
        requiredTier: 'pro-tier',
        currentTier: 'free-tier',
        message: 'Gallery requires Pro tier',
      })
    })

    it('should parse feature not available error from flat format', () => {
      const error: FetchBaseQueryError = {
        status: 403,
        data: {
          error: 'FEATURE_NOT_AVAILABLE',
          message: 'Gallery requires Pro tier',
          feature: 'gallery',
          requiredTier: 'pro-tier',
          currentTier: 'free-tier',
        },
      }

      const result = parseAuthorizationError(error)
      expect(result).toEqual({
        type: 'FEATURE_NOT_AVAILABLE',
        feature: 'gallery',
        requiredTier: 'pro-tier',
        currentTier: 'free-tier',
        message: 'Gallery requires Pro tier',
      })
    })

    it('should parse quota exceeded error', () => {
      const error: FetchBaseQueryError = {
        status: 429,
        data: {
          error: 'QUOTA_EXCEEDED',
          message: 'MOC limit reached',
          quotaType: 'mocs',
          current: 5,
          limit: 5,
        },
      }

      const result = parseAuthorizationError(error)
      expect(result).toEqual({
        type: 'QUOTA_EXCEEDED',
        quotaType: 'mocs',
        current: 5,
        limit: 5,
        message: 'MOC limit reached',
      })
    })

    it('should parse account suspended error', () => {
      const error: FetchBaseQueryError = {
        status: 403,
        data: {
          error: 'ACCOUNT_SUSPENDED',
          message: 'Account suspended',
          reason: 'Terms of service violation',
        },
      }

      const result = parseAuthorizationError(error)
      expect(result).toEqual({
        type: 'ACCOUNT_SUSPENDED',
        reason: 'Terms of service violation',
        message: 'Account suspended',
      })
    })

    it('should return UNKNOWN for errors with unrecognized codes', () => {
      const error: FetchBaseQueryError = {
        status: 500,
        data: { error: 'INTERNAL_ERROR' },
      }

      const result = parseAuthorizationError(error)
      expect(result).toEqual({
        type: 'UNKNOWN',
        code: 'INTERNAL_ERROR',
        message: 'An authorization error occurred',
      })
    })

    it('should return null for non-FetchBaseQueryError', () => {
      const result = parseAuthorizationError(new Error('Network error'))
      expect(result).toBeNull()
    })

    it('should handle unknown error codes gracefully', () => {
      const error: FetchBaseQueryError = {
        status: 403,
        data: {
          error: {
            code: 'UNKNOWN_CODE',
            message: 'Some error occurred',
          },
        },
      }

      const result = parseAuthorizationError(error)
      expect(result).toEqual({
        type: 'UNKNOWN',
        code: 'UNKNOWN_CODE',
        message: 'Some error occurred',
      })
    })
  })

  describe('convenience checkers', () => {
    const featureError: FetchBaseQueryError = {
      status: 403,
      data: {
        error: 'FEATURE_NOT_AVAILABLE',
        message: 'Feature not available',
        feature: 'gallery',
        requiredTier: 'pro-tier',
        currentTier: 'free-tier',
      },
    }

    const quotaError: FetchBaseQueryError = {
      status: 429,
      data: {
        error: 'QUOTA_EXCEEDED',
        message: 'Quota exceeded',
        quotaType: 'mocs',
        current: 5,
        limit: 5,
      },
    }

    const suspendedError: FetchBaseQueryError = {
      status: 403,
      data: {
        error: 'ACCOUNT_SUSPENDED',
        message: 'Account suspended',
        reason: null,
      },
    }

    describe('isFeatureNotAvailableError', () => {
      it('should return true for feature errors', () => {
        expect(isFeatureNotAvailableError(featureError)).toBe(true)
      })

      it('should return false for quota errors', () => {
        expect(isFeatureNotAvailableError(quotaError)).toBe(false)
      })
    })

    describe('isQuotaExceededErrorParsed', () => {
      it('should return true for quota errors', () => {
        expect(isQuotaExceededErrorParsed(quotaError)).toBe(true)
      })

      it('should return false for feature errors', () => {
        expect(isQuotaExceededErrorParsed(featureError)).toBe(false)
      })
    })

    describe('isAccountSuspendedError', () => {
      it('should return true for suspended errors', () => {
        expect(isAccountSuspendedError(suspendedError)).toBe(true)
      })

      it('should return false for feature errors', () => {
        expect(isAccountSuspendedError(featureError)).toBe(false)
      })
    })

    describe('isAuthorizationError', () => {
      it('should return true for feature errors', () => {
        expect(isAuthorizationError(featureError)).toBe(true)
      })

      it('should return true for quota errors', () => {
        expect(isAuthorizationError(quotaError)).toBe(true)
      })

      it('should return true for suspended errors', () => {
        expect(isAuthorizationError(suspendedError)).toBe(true)
      })

      it('should return false for non-authorization errors', () => {
        expect(isAuthorizationError(new Error('test'))).toBe(false)
      })
    })
  })

  describe('error display helpers', () => {
    describe('getAuthorizationErrorTitle', () => {
      it('should return correct title for feature error', () => {
        const error: ParsedAuthorizationError = {
          type: 'FEATURE_NOT_AVAILABLE',
          feature: 'gallery',
          requiredTier: 'pro-tier',
          currentTier: 'free-tier',
          message: 'test',
        }
        expect(getAuthorizationErrorTitle(error)).toBe('Gallery is a Pro Feature')
      })

      it('should return correct title for quota error', () => {
        const error: ParsedAuthorizationError = {
          type: 'QUOTA_EXCEEDED',
          quotaType: 'mocs',
          current: 5,
          limit: 5,
          message: 'test',
        }
        expect(getAuthorizationErrorTitle(error)).toBe('MOCs Limit Reached')
      })

      it('should return correct title for suspended error', () => {
        const error: ParsedAuthorizationError = {
          type: 'ACCOUNT_SUSPENDED',
          reason: 'test',
          message: 'test',
        }
        expect(getAuthorizationErrorTitle(error)).toBe('Account Suspended')
      })

      it('should return generic title for unknown error', () => {
        const error: ParsedAuthorizationError = {
          type: 'UNKNOWN',
          code: 'TEST',
          message: 'test',
        }
        expect(getAuthorizationErrorTitle(error)).toBe('Access Denied')
      })
    })

    describe('getAuthorizationErrorDescription', () => {
      it('should return upgrade message for feature error', () => {
        const error: ParsedAuthorizationError = {
          type: 'FEATURE_NOT_AVAILABLE',
          feature: 'gallery',
          requiredTier: 'pro-tier',
          currentTier: 'free-tier',
          message: 'test',
        }
        expect(getAuthorizationErrorDescription(error)).toBe(
          'Upgrade from Free to Pro to access this feature.',
        )
      })

      it('should return usage info for quota error', () => {
        const error: ParsedAuthorizationError = {
          type: 'QUOTA_EXCEEDED',
          quotaType: 'mocs',
          current: 5,
          limit: 5,
          message: 'test',
        }
        expect(getAuthorizationErrorDescription(error)).toBe(
          "You've used 5 of 5 MOCs. Upgrade your plan for more.",
        )
      })

      it('should return reason for suspended error with reason', () => {
        const error: ParsedAuthorizationError = {
          type: 'ACCOUNT_SUSPENDED',
          reason: 'Terms violation',
          message: 'test',
        }
        expect(getAuthorizationErrorDescription(error)).toBe('Terms violation')
      })

      it('should return contact message for suspended error without reason', () => {
        const error: ParsedAuthorizationError = {
          type: 'ACCOUNT_SUSPENDED',
          reason: null,
          message: 'test',
        }
        expect(getAuthorizationErrorDescription(error)).toBe(
          'Please contact support for more information.',
        )
      })
    })

    describe('getAuthorizationErrorAction', () => {
      it('should return upgrade action for feature error', () => {
        const error: ParsedAuthorizationError = {
          type: 'FEATURE_NOT_AVAILABLE',
          feature: 'gallery',
          requiredTier: 'pro-tier',
          currentTier: 'free-tier',
          message: 'test',
        }
        expect(getAuthorizationErrorAction(error)).toEqual({
          text: 'View Upgrade Options',
          type: 'upgrade',
        })
      })

      it('should return upgrade action for quota error', () => {
        const error: ParsedAuthorizationError = {
          type: 'QUOTA_EXCEEDED',
          quotaType: 'mocs',
          current: 5,
          limit: 5,
          message: 'test',
        }
        expect(getAuthorizationErrorAction(error)).toEqual({
          text: 'Upgrade Plan',
          type: 'upgrade',
        })
      })

      it('should return contact action for suspended error', () => {
        const error: ParsedAuthorizationError = {
          type: 'ACCOUNT_SUSPENDED',
          reason: null,
          message: 'test',
        }
        expect(getAuthorizationErrorAction(error)).toEqual({
          text: 'Contact Support',
          type: 'contact',
        })
      })

      it('should return none action for unknown error', () => {
        const error: ParsedAuthorizationError = {
          type: 'UNKNOWN',
          code: 'TEST',
          message: 'test',
        }
        expect(getAuthorizationErrorAction(error)).toEqual({
          text: '',
          type: 'none',
        })
      })
    })
  })
})
