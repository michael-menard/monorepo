import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeatureGate, FEATURE_REQUIRED_TIER } from '../FeatureGate'
import type { Feature, Tier } from '../FeatureGate'

describe('FeatureGate', () => {
  const mockHasFeature = vi.fn()

  const defaultProps = {
    feature: 'gallery' as Feature,
    hasFeature: mockHasFeature,
    children: <div data-testid="protected-content">Protected Content</div>,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when user has feature access', () => {
    it('should render children', () => {
      mockHasFeature.mockReturnValue(true)

      render(<FeatureGate {...defaultProps} />)

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should not render fallback', () => {
      mockHasFeature.mockReturnValue(true)

      render(
        <FeatureGate
          {...defaultProps}
          fallback={<div data-testid="fallback">Fallback</div>}
        />,
      )

      expect(screen.queryByTestId('fallback')).not.toBeInTheDocument()
    })
  })

  describe('when user lacks feature access', () => {
    it('should render default upgrade prompt when no fallback provided', () => {
      mockHasFeature.mockReturnValue(false)

      render(<FeatureGate {...defaultProps} currentTier="free-tier" />)

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByText(/Gallery is a Pro Feature/i)).toBeInTheDocument()
      expect(screen.getByText(/Upgrade from Free to Pro/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /View Upgrade Options/i })).toBeInTheDocument()
    })

    it('should render custom fallback when provided', () => {
      mockHasFeature.mockReturnValue(false)

      render(
        <FeatureGate
          {...defaultProps}
          fallback={<div data-testid="custom-fallback">Custom Upgrade Message</div>}
        />,
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      expect(screen.getByText('Custom Upgrade Message')).toBeInTheDocument()
    })

    it('should render nothing when showUpgradePrompt is false and no fallback', () => {
      mockHasFeature.mockReturnValue(false)

      const { container } = render(
        <FeatureGate {...defaultProps} showUpgradePrompt={false} />,
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(container.firstChild).toBeNull()
    })
  })

  describe('loading state', () => {
    it('should render loadingFallback when isLoading and loadingFallback provided', () => {
      mockHasFeature.mockReturnValue(false)

      render(
        <FeatureGate
          {...defaultProps}
          isLoading={true}
          loadingFallback={<div data-testid="loading">Loading...</div>}
        />,
      )

      expect(screen.getByTestId('loading')).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('should check feature access when isLoading but no loadingFallback', () => {
      mockHasFeature.mockReturnValue(true)

      render(<FeatureGate {...defaultProps} isLoading={true} />)

      // Should still render children since hasFeature returns true
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })
  })

  describe('feature checking', () => {
    it('should call hasFeature with the correct feature', () => {
      mockHasFeature.mockReturnValue(true)

      render(<FeatureGate {...defaultProps} feature="chat" />)

      expect(mockHasFeature).toHaveBeenCalledWith('chat')
    })

    it.each([
      ['moc', 'free-tier'],
      ['wishlist', 'free-tier'],
      ['profile', 'free-tier'],
      ['gallery', 'pro-tier'],
      ['chat', 'pro-tier'],
      ['reviews', 'pro-tier'],
      ['user_discovery', 'pro-tier'],
      ['setlist', 'power-tier'],
      ['privacy_advanced', 'power-tier'],
    ] as [Feature, Tier][])('should show correct required tier for %s feature', (feature, expectedTier) => {
      expect(FEATURE_REQUIRED_TIER[feature]).toBe(expectedTier)
    })
  })

  describe('tier display', () => {
    it('should display current tier in upgrade prompt', () => {
      mockHasFeature.mockReturnValue(false)

      render(<FeatureGate {...defaultProps} currentTier="free-tier" />)

      expect(screen.getByText(/Upgrade from Free/i)).toBeInTheDocument()
    })

    it('should handle null tier gracefully', () => {
      mockHasFeature.mockReturnValue(false)

      render(<FeatureGate {...defaultProps} currentTier={null} />)

      // Should default to "Free" when tier is null
      expect(screen.getByText(/Upgrade from Free/i)).toBeInTheDocument()
    })
  })
})
