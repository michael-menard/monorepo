/**
 * useFeatureFlag Hook Tests (WISH-2009 - AC12)
 *
 * Tests for useFeatureFlag and useFeatureFlags hooks.
 * Uses MSW handlers for API mocking (handlers.ts).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFeatureFlag, useFeatureFlags } from '../useFeatureFlag'
import { FeatureFlagProvider } from '../../contexts/FeatureFlagContext'
import type { ReactNode } from 'react'
import { setMockFeatureFlags, resetFeatureFlagMocks } from '../../test/mocks/handlers'

// Wrapper component with provider
function createWrapper(initialFlags = {}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <FeatureFlagProvider initialFlags={initialFlags}>{children}</FeatureFlagProvider>
  }
}

describe('useFeatureFlag', () => {
  beforeEach(() => {
    resetFeatureFlagMocks()
    setMockFeatureFlags({
      'wishlist-gallery': true,
      'wishlist-add-item': false,
      'wishlist-edit-item': true,
    })
  })

  afterEach(() => {
    resetFeatureFlagMocks()
  })

  // ─────────────────────────────────────────────────────────────────────
  // Test 1: Returns true for enabled flag
  // ─────────────────────────────────────────────────────────────────────
  it('returns true for enabled flag', async () => {
    const { result } = renderHook(() => useFeatureFlag('wishlist-gallery'), {
      wrapper: createWrapper({ 'wishlist-gallery': true }),
    })

    expect(result.current).toBe(true)
  })

  // ─────────────────────────────────────────────────────────────────────
  // Test 2: Returns false for disabled flag
  // ─────────────────────────────────────────────────────────────────────
  it('returns false for disabled flag', async () => {
    const { result } = renderHook(() => useFeatureFlag('wishlist-add-item'), {
      wrapper: createWrapper({ 'wishlist-add-item': false }),
    })

    expect(result.current).toBe(false)
  })

  // ─────────────────────────────────────────────────────────────────────
  // Test 3: Returns false for unknown flag
  // ─────────────────────────────────────────────────────────────────────
  it('returns false for unknown flag', async () => {
    const { result } = renderHook(() => useFeatureFlag('unknown-flag'), {
      wrapper: createWrapper({ 'wishlist-gallery': true }),
    })

    expect(result.current).toBe(false)
  })

  // ─────────────────────────────────────────────────────────────────────
  // Test 4: Multiple flags can be checked
  // ─────────────────────────────────────────────────────────────────────
  it('allows checking multiple flags', async () => {
    const { result } = renderHook(
      () => ({
        gallery: useFeatureFlag('wishlist-gallery'),
        addItem: useFeatureFlag('wishlist-add-item'),
        editItem: useFeatureFlag('wishlist-edit-item'),
      }),
      {
        wrapper: createWrapper({
          'wishlist-gallery': true,
          'wishlist-add-item': false,
          'wishlist-edit-item': true,
        }),
      },
    )

    expect(result.current.gallery).toBe(true)
    expect(result.current.addItem).toBe(false)
    expect(result.current.editItem).toBe(true)
  })
})

describe('useFeatureFlags', () => {
  beforeEach(() => {
    resetFeatureFlagMocks()
    setMockFeatureFlags({
      'wishlist-gallery': true,
      'wishlist-add-item': false,
    })
  })

  afterEach(() => {
    resetFeatureFlagMocks()
  })

  // ─────────────────────────────────────────────────────────────────────
  // Test 5: Returns flags object and loading state
  // ─────────────────────────────────────────────────────────────────────
  it('returns flags object and loading state', async () => {
    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper({
        'wishlist-gallery': true,
        'wishlist-add-item': false,
      }),
    })

    expect(result.current.flags).toEqual({
      'wishlist-gallery': true,
      'wishlist-add-item': false,
    })
    expect(result.current.error).toBeNull()
  })

  it('provides refetch function', async () => {
    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    })

    expect(typeof result.current.refetch).toBe('function')
  })

  it('updates flags after fetch', async () => {
    setMockFeatureFlags({
      'wishlist-gallery': true,
      'new-flag': true,
    })

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.flags['wishlist-gallery']).toBe(true)
    expect(result.current.flags['new-flag']).toBe(true)
  })
})
