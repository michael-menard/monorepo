/**
 * Feature Flag Context Tests (WISH-2009 - AC12)
 *
 * Tests for FeatureFlagProvider and useFeatureFlagContext.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { FeatureFlagProvider, useFeatureFlagContext, WishlistFlagKeys } from '../FeatureFlagContext'

// Mock fetch globally
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

// Test component that uses the context
function TestConsumer() {
  const { flags, isFeatureEnabled, isLoading, error } = useFeatureFlagContext()

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="error">{error?.message ?? 'no-error'}</div>
      <div data-testid="flags">{JSON.stringify(flags)}</div>
      <div data-testid="gallery-enabled">{isFeatureEnabled('wishlist-gallery') ? 'yes' : 'no'}</div>
      <div data-testid="add-item-enabled">
        {isFeatureEnabled(WishlistFlagKeys.ADD_ITEM) ? 'yes' : 'no'}
      </div>
    </div>
  )
}

describe('FeatureFlagContext', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────
  // Test 1: FeatureFlagProvider renders children
  // ─────────────────────────────────────────────────────────────────────
  it('renders children', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 'wishlist-gallery': true }),
    })

    render(
      <FeatureFlagProvider>
        <div data-testid="child">Hello</div>
      </FeatureFlagProvider>,
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  // ─────────────────────────────────────────────────────────────────────
  // Test 2: Context provides correct flag values
  // ─────────────────────────────────────────────────────────────────────
  it('provides correct flag values', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          'wishlist-gallery': true,
          'wishlist-add-item': false,
        }),
    })

    render(
      <FeatureFlagProvider>
        <TestConsumer />
      </FeatureFlagProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
    })

    expect(screen.getByTestId('gallery-enabled')).toHaveTextContent('yes')
    expect(screen.getByTestId('add-item-enabled')).toHaveTextContent('no')
  })

  // ─────────────────────────────────────────────────────────────────────
  // Test 3: Loading state returns false (safe default)
  // ─────────────────────────────────────────────────────────────────────
  it('returns false while loading', async () => {
    // Create a promise that we can control
    let resolvePromise: (value: unknown) => void
    const pendingPromise = new Promise(resolve => {
      resolvePromise = resolve
    })

    mockFetch.mockReturnValueOnce({
      ok: true,
      json: () => pendingPromise,
    })

    render(
      <FeatureFlagProvider>
        <TestConsumer />
      </FeatureFlagProvider>,
    )

    // While loading, flag checks should return false
    expect(screen.getByTestId('loading')).toHaveTextContent('loading')
    expect(screen.getByTestId('gallery-enabled')).toHaveTextContent('no')

    // Resolve the promise
    await act(async () => {
      resolvePromise!({ 'wishlist-gallery': true })
    })

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
    })

    expect(screen.getByTestId('gallery-enabled')).toHaveTextContent('yes')
  })

  // ─────────────────────────────────────────────────────────────────────
  // Test 4: Handles fetch errors gracefully
  // ─────────────────────────────────────────────────────────────────────
  it('handles fetch errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    render(
      <FeatureFlagProvider>
        <TestConsumer />
      </FeatureFlagProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
    })

    expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch feature flags: 500')
  })

  // ─────────────────────────────────────────────────────────────────────
  // Test 5: Uses initial flags when provided
  // ─────────────────────────────────────────────────────────────────────
  it('uses initial flags when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          'wishlist-gallery': false, // API returns different value
        }),
    })

    render(
      <FeatureFlagProvider initialFlags={{ 'wishlist-gallery': true }}>
        <TestConsumer />
      </FeatureFlagProvider>,
    )

    // Should immediately show initial flags (no loading state)
    expect(screen.getByTestId('gallery-enabled')).toHaveTextContent('yes')

    // After fetch completes, should update to API value
    await waitFor(() => {
      expect(screen.getByTestId('gallery-enabled')).toHaveTextContent('no')
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Test: Throws error when used outside provider
  // ─────────────────────────────────────────────────────────────────────
  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<TestConsumer />)).toThrow(
      'useFeatureFlagContext must be used within a FeatureFlagProvider',
    )

    consoleSpy.mockRestore()
  })
})
