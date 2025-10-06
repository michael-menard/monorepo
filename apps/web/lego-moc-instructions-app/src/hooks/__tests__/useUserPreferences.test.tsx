import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useUserPreferences } from '../useUserPreferences'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useUserPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with default preferences when localStorage is empty', async () => {
    localStorageMock.getItem.mockReturnValue(null)
    
    const { result } = renderHook(() => useUserPreferences())
    
    // Wait for loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    
    expect(result.current.isLoading).toBe(false)
    expect(result.current.preferences.theme).toBe('system')
    expect(result.current.preferences.language).toBe('en')
    expect(result.current.preferences.notifications.email).toBe(true)
    expect(result.current.preferences.privacy.analytics).toBe(true)
  })

  it('loads preferences from localStorage', async () => {
    const storedPreferences = {
      theme: 'dark',
      language: 'es',
      notifications: { email: false, push: true, marketing: false },
      privacy: { analytics: false, cookies: true },
      accessibility: { reducedMotion: true, highContrast: false, fontSize: 'large' }
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPreferences))
    
    const { result } = renderHook(() => useUserPreferences())
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    
    expect(result.current.preferences.theme).toBe('dark')
    expect(result.current.preferences.language).toBe('es')
    expect(result.current.preferences.notifications.email).toBe(false)
    expect(result.current.preferences.privacy.analytics).toBe(false)
    expect(result.current.preferences.accessibility.reducedMotion).toBe(true)
  })

  it('handles invalid localStorage data gracefully', async () => {
    localStorageMock.getItem.mockReturnValue('invalid json')
    
    const { result } = renderHook(() => useUserPreferences())
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    
    expect(result.current.error).toBe('Failed to load preferences')
    expect(result.current.preferences.theme).toBe('system') // Falls back to defaults
  })

  it('updates a single preference', async () => {
    localStorageMock.getItem.mockReturnValue(null)
    
    const { result } = renderHook(() => useUserPreferences())
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    
    act(() => {
      result.current.updatePreference('theme', 'dark')
    })
    
    expect(result.current.preferences.theme).toBe('dark')
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'user-preferences',
      expect.stringContaining('"theme":"dark"')
    )
  })

  it('updates nested preferences', async () => {
    localStorageMock.getItem.mockReturnValue(null)
    
    const { result } = renderHook(() => useUserPreferences())
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    
    act(() => {
      result.current.updateNestedPreference('notifications', 'email', false)
    })
    
    expect(result.current.preferences.notifications.email).toBe(false)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'user-preferences',
      expect.stringContaining('"email":false')
    )
  })

  it('resets preferences to defaults', async () => {
    const storedPreferences = { theme: 'dark', language: 'es' }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPreferences))
    
    const { result } = renderHook(() => useUserPreferences())
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    
    expect(result.current.preferences.theme).toBe('dark')
    
    act(() => {
      result.current.resetPreferences()
    })
    
    expect(result.current.preferences.theme).toBe('system')
    expect(result.current.preferences.language).toBe('en')
  })

  it('exports preferences as JSON', async () => {
    localStorageMock.getItem.mockReturnValue(null)
    
    const { result } = renderHook(() => useUserPreferences())
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    
    const exported = result.current.exportPreferences()
    const parsed = JSON.parse(exported)
    
    expect(parsed.theme).toBe('system')
    expect(parsed.language).toBe('en')
  })

  it('imports valid preferences', async () => {
    localStorageMock.getItem.mockReturnValue(null)
    
    const { result } = renderHook(() => useUserPreferences())
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    
    const importData = JSON.stringify({
      theme: 'dark',
      language: 'fr',
      notifications: { email: false, push: false, marketing: true },
      privacy: { analytics: false, cookies: false },
      accessibility: { reducedMotion: true, highContrast: true, fontSize: 'large' }
    })
    
    let importResult: boolean
    act(() => {
      importResult = result.current.importPreferences(importData)
    })
    
    expect(importResult!).toBe(true)
    expect(result.current.preferences.theme).toBe('dark')
    expect(result.current.preferences.language).toBe('fr')
  })

  it('handles invalid import data', async () => {
    localStorageMock.getItem.mockReturnValue(null)
    
    const { result } = renderHook(() => useUserPreferences())
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    
    let importResult: boolean
    act(() => {
      importResult = result.current.importPreferences('invalid json')
    })
    
    expect(importResult!).toBe(false)
    expect(result.current.error).toBe('Invalid preferences format')
  })
})
