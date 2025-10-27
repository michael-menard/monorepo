import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { PWASettings } from '../PWASettings'

// Mock the PWA context
const mockPWAContext = {
  needRefresh: false,
  offlineReady: false,
  updateServiceWorker: vi.fn(),
  closePrompt: vi.fn(),
  canInstall: false,
  installPrompt: vi.fn(),
}

vi.mock('../../PWAProvider', () => ({
  usePWA: () => mockPWAContext,
}))

// Mock matchMedia for standalone mode detection
const mockMatchMedia = vi.fn()
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
})

// Mock navigator.standalone for iOS
Object.defineProperty(window.navigator, 'standalone', {
  writable: true,
  value: false,
})

describe('PWASettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPWAContext.needRefresh = false
    mockPWAContext.offlineReady = false
    mockPWAContext.canInstall = false

    // Reset matchMedia mock
    mockMatchMedia.mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    // Reset navigator.standalone
    ;(window.navigator as any).standalone = false
  })

  it('renders app installation section', () => {
    render(<PWASettings />)

    expect(screen.getByText('App Installation')).toBeInTheDocument()
    expect(
      screen.getByText('Install this app on your device for a native app experience'),
    ).toBeInTheDocument()
  })

  it('shows installation not available when canInstall is false and not installed', () => {
    render(<PWASettings />)

    expect(screen.getByText('Installation Not Available')).toBeInTheDocument()
    expect(
      screen.getByText('App installation is not available on this device or browser.'),
    ).toBeInTheDocument()
  })

  it('shows ready to install when canInstall is true', () => {
    mockPWAContext.canInstall = true

    render(<PWASettings />)

    expect(screen.getByText('Ready to Install')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Install this app on your device for faster access and a better experience.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Install App')).toBeInTheDocument()
  })

  it('calls installPrompt when install button is clicked', () => {
    mockPWAContext.canInstall = true

    render(<PWASettings />)

    const installButton = screen.getByText('Install App')
    fireEvent.click(installButton)

    expect(mockPWAContext.installPrompt).toHaveBeenCalled()
  })

  it('shows app installed when running in standalone mode', () => {
    mockMatchMedia.mockImplementation(() => ({
      matches: true, // Simulate standalone mode
      media: '(display-mode: standalone)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(<PWASettings />)

    expect(screen.getByText('App Installed')).toBeInTheDocument()
    expect(
      screen.getByText('The app is installed and running in standalone mode.'),
    ).toBeInTheDocument()
  })

  it('shows app installed when navigator.standalone is true (iOS)', () => {
    ;(window.navigator as any).standalone = true

    render(<PWASettings />)

    expect(screen.getByText('App Installed')).toBeInTheDocument()
    expect(
      screen.getByText('The app is installed and running in standalone mode.'),
    ).toBeInTheDocument()
  })

  it('shows update section when needRefresh is true', () => {
    mockPWAContext.needRefresh = true

    render(<PWASettings />)

    expect(screen.getByText('App Update Available')).toBeInTheDocument()
    expect(screen.getByText('Update Available')).toBeInTheDocument()
    expect(
      screen.getByText('A new version with the latest features and improvements is ready.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Update Now')).toBeInTheDocument()
  })

  it('calls updateServiceWorker when update button is clicked', () => {
    mockPWAContext.needRefresh = true

    render(<PWASettings />)

    const updateButton = screen.getByText('Update Now')
    fireEvent.click(updateButton)

    expect(mockPWAContext.updateServiceWorker).toHaveBeenCalled()
  })

  it('does not show update section when needRefresh is false', () => {
    render(<PWASettings />)

    expect(screen.queryByText('App Update Available')).not.toBeInTheDocument()
    expect(screen.queryByText('Update Now')).not.toBeInTheDocument()
  })

  it('shows offline ready status when offlineReady is true', () => {
    mockPWAContext.offlineReady = true

    render(<PWASettings />)

    expect(screen.getByText('Offline Support')).toBeInTheDocument()
    expect(screen.getByText('Ready for Offline Use')).toBeInTheDocument()
    expect(
      screen.getByText("The app has been cached and will work even when you're offline."),
    ).toBeInTheDocument()
  })

  it('shows setting up offline support when offlineReady is false', () => {
    render(<PWASettings />)

    expect(screen.getByText('Offline Support')).toBeInTheDocument()
    expect(screen.getByText('Setting Up Offline Support')).toBeInTheDocument()
    expect(
      screen.getByText(
        'The app is being prepared for offline use. This will complete automatically.',
      ),
    ).toBeInTheDocument()
  })

  it('renders PWA features information', () => {
    render(<PWASettings />)

    expect(screen.getByText('Progressive Web App Features')).toBeInTheDocument()
    expect(screen.getByText('Benefits of using this app')).toBeInTheDocument()

    // Check for feature benefits
    expect(screen.getByText('Fast Loading')).toBeInTheDocument()
    expect(screen.getByText('Cached for instant access')).toBeInTheDocument()
    expect(screen.getByText('Offline Access')).toBeInTheDocument()
    expect(screen.getByText('Works without internet')).toBeInTheDocument()
    expect(screen.getByText('Native Feel')).toBeInTheDocument()
    expect(screen.getByText('App-like experience')).toBeInTheDocument()
    expect(screen.getByText('Auto Updates')).toBeInTheDocument()
    expect(screen.getByText('Always up to date')).toBeInTheDocument()
  })
})
