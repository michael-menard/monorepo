import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AuthorizationErrorDisplay, useAuthorizationError } from '../AuthorizationErrorDisplay'
import { renderHook } from '@testing-library/react'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'

describe('AuthorizationErrorDisplay', () => {
  const featureError: FetchBaseQueryError = {
    status: 403,
    data: {
      error: 'FEATURE_NOT_AVAILABLE',
      message: 'Gallery requires Pro tier',
      feature: 'gallery',
      requiredTier: 'pro-tier',
      currentTier: 'free-tier',
    },
  }

  const quotaError: FetchBaseQueryError = {
    status: 429,
    data: {
      error: 'QUOTA_EXCEEDED',
      message: 'MOC limit reached',
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
      reason: 'Terms of service violation',
    },
  }

  describe('with feature not available error', () => {
    it('should display feature error title', () => {
      render(<AuthorizationErrorDisplay error={featureError} />)

      expect(screen.getByText('Gallery is a Pro Feature')).toBeInTheDocument()
    })

    it('should display upgrade description', () => {
      render(<AuthorizationErrorDisplay error={featureError} />)

      expect(
        screen.getByText('Upgrade from Free to Pro to access this feature.'),
      ).toBeInTheDocument()
    })

    it('should display upgrade button', () => {
      render(<AuthorizationErrorDisplay error={featureError} />)

      expect(screen.getByRole('button', { name: 'View Upgrade Options' })).toBeInTheDocument()
    })

    it('should call onUpgrade when upgrade button clicked', () => {
      const onUpgrade = vi.fn()
      render(<AuthorizationErrorDisplay error={featureError} onUpgrade={onUpgrade} />)

      fireEvent.click(screen.getByRole('button', { name: 'View Upgrade Options' }))

      expect(onUpgrade).toHaveBeenCalledTimes(1)
    })
  })

  describe('with quota exceeded error', () => {
    it('should display quota error title', () => {
      render(<AuthorizationErrorDisplay error={quotaError} />)

      expect(screen.getByText('MOCs Limit Reached')).toBeInTheDocument()
    })

    it('should display quota usage description', () => {
      render(<AuthorizationErrorDisplay error={quotaError} />)

      expect(
        screen.getByText("You've used 5 of 5 MOCs. Upgrade your plan for more."),
      ).toBeInTheDocument()
    })

    it('should display upgrade plan button', () => {
      render(<AuthorizationErrorDisplay error={quotaError} />)

      expect(screen.getByRole('button', { name: 'Upgrade Plan' })).toBeInTheDocument()
    })
  })

  describe('with account suspended error', () => {
    it('should display suspended title', () => {
      render(<AuthorizationErrorDisplay error={suspendedError} />)

      expect(screen.getByText('Account Suspended')).toBeInTheDocument()
    })

    it('should display suspension reason', () => {
      render(<AuthorizationErrorDisplay error={suspendedError} />)

      expect(screen.getByText('Terms of service violation')).toBeInTheDocument()
    })

    it('should display contact support button', () => {
      render(<AuthorizationErrorDisplay error={suspendedError} />)

      expect(screen.getByRole('button', { name: 'Contact Support' })).toBeInTheDocument()
    })

    it('should call onContactSupport when button clicked', () => {
      const onContactSupport = vi.fn()
      render(
        <AuthorizationErrorDisplay error={suspendedError} onContactSupport={onContactSupport} />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Contact Support' }))

      expect(onContactSupport).toHaveBeenCalledTimes(1)
    })
  })

  describe('with non-authorization error', () => {
    it('should render generic access denied for unknown error codes', () => {
      const genericError: FetchBaseQueryError = {
        status: 500,
        data: { error: 'INTERNAL_ERROR' },
      }

      render(<AuthorizationErrorDisplay error={genericError} />)

      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.getByText('An authorization error occurred')).toBeInTheDocument()
    })

    it('should render nothing for non-FetchBaseQueryError', () => {
      const { container } = render(
        <AuthorizationErrorDisplay error={new Error('Network error')} />,
      )

      expect(container.firstChild).toBeNull()
    })

    it('should render nothing for null error', () => {
      const { container } = render(<AuthorizationErrorDisplay error={null} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('variant: inline', () => {
    it('should render inline variant', () => {
      render(<AuthorizationErrorDisplay error={featureError} variant="inline" />)

      // Inline variant shows shorter format
      expect(screen.getByText('Gallery is a Pro Feature')).toBeInTheDocument()
    })

    it('should include inline link for upgrade', () => {
      render(<AuthorizationErrorDisplay error={featureError} variant="inline" />)

      expect(screen.getByText('View Upgrade Options')).toBeInTheDocument()
    })
  })

  describe('variant: banner', () => {
    it('should render banner variant', () => {
      render(<AuthorizationErrorDisplay error={featureError} variant="banner" />)

      expect(screen.getByText('Gallery is a Pro Feature')).toBeInTheDocument()
      expect(
        screen.getByText('Upgrade from Free to Pro to access this feature.'),
      ).toBeInTheDocument()
    })
  })

  describe('variant: card (default)', () => {
    it('should render card variant by default', () => {
      render(<AuthorizationErrorDisplay error={featureError} />)

      expect(screen.getByText('Gallery is a Pro Feature')).toBeInTheDocument()
      expect(
        screen.getByText('Upgrade from Free to Pro to access this feature.'),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'View Upgrade Options' })).toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <AuthorizationErrorDisplay error={featureError} className="custom-class" />,
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })
})

describe('useAuthorizationError', () => {
  it('should return parsed error for feature not available', () => {
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

    const { result } = renderHook(() => useAuthorizationError(error))

    expect(result.current).toEqual({
      type: 'FEATURE_NOT_AVAILABLE',
      feature: 'gallery',
      requiredTier: 'pro-tier',
      currentTier: 'free-tier',
      message: 'Gallery requires Pro tier',
    })
  })

  it('should return null for non-authorization errors', () => {
    const { result } = renderHook(() => useAuthorizationError(new Error('Network error')))

    expect(result.current).toBeNull()
  })
})
