/**
 * Feature Flag Context Tests (WISH-2009 - AC12)
 *
 * Tests for FeatureFlagProvider and useFeatureFlagContext.
 * Uses MSW handlers for API mocking (handlers.ts).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { FeatureFlagProvider, useFeatureFlagContext, WishlistFlagKeys } from '../FeatureFlagContext'
import { server } from '../../test/mocks/server'
import { http, HttpResponse } from 'msw'
import {
  setMockFeatureFlags,
  setFeatureFlagError,
  resetFeatureFlagMocks,
} from '../../test/mocks/handlers'

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
    resetFeatureFlagMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    resetFeatureFlagMocks()
  })

  // ─────────────────────────────────────────────────────────────────────
  // Test 1: FeatureFlagProvider renders children
  // ─────────────────────────────────────────────────────────────────────
  it('renders children', async () => {
    setMockFeatureFlags({ 'wishlist-gallery': true })

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
    setMockFeatureFlags({
      'wishlist-gallery': true,
      'wishlist-add-item': false,
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
    // Create a delayed response using MSW
    let resolveResponse: () => void
    const responsePromise = new Promise<void>(resolve => {
      resolveResponse = resolve
    })

    server.use(
      http.get('/api/config/flags', async () => {
        await responsePromise
        return HttpResponse.json({ 'wishlist-gallery': true })
      }),
    )

    render(
      <FeatureFlagProvider>
        <TestConsumer />
      </FeatureFlagProvider>,
    )

    // While loading, flag checks should return false
    expect(screen.getByTestId('loading')).toHaveTextContent('loading')
    expect(screen.getByTestId('gallery-enabled')).toHaveTextContent('no')

    // Resolve the response
    await act(async () => {
      resolveResponse!()
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
    setFeatureFlagError({ status: 500, message: 'Internal Server Error' })

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
    // API returns different value than initial flags
    setMockFeatureFlags({ 'wishlist-gallery': false })

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
