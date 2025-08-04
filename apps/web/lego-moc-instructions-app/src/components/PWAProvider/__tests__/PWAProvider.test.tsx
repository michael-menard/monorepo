import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PWAProvider, usePWA } from '../PWAProvider'

// Mock the virtual:pwa-register module
vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn(() => ({
    updateSW: vi.fn()
  }))
}))

// Mock window events
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
  writable: true
})

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
  writable: true
})

// Test component that uses the PWA hook
const TestComponent = () => {
  const pwa = usePWA()
  return (
    <div>
      <div data-testid="need-refresh">{pwa.needRefresh.toString()}</div>
      <div data-testid="offline-ready">{pwa.offlineReady.toString()}</div>
      <div data-testid="can-install">{pwa.canInstall.toString()}</div>
      <button onClick={pwa.updateServiceWorker} data-testid="update-sw">
        Update
      </button>
      <button onClick={pwa.closePrompt} data-testid="close-prompt">
        Close
      </button>
      <button onClick={pwa.installPrompt} data-testid="install-prompt">
        Install
      </button>
    </div>
  )
}

describe('PWAProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children and provides PWA context', () => {
    render(
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
    )

    expect(screen.getByTestId('need-refresh')).toBeInTheDocument()
    expect(screen.getByTestId('offline-ready')).toBeInTheDocument()
    expect(screen.getByTestId('can-install')).toBeInTheDocument()
  })

  it('registers service worker on mount', () => {
    render(
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
    )

    expect(mockAddEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    expect(mockAddEventListener).toHaveBeenCalledWith('appinstalled', expect.any(Function))
  })

  it('provides default PWA state', () => {
    render(
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
    )

    expect(screen.getByTestId('need-refresh')).toHaveTextContent('false')
    expect(screen.getByTestId('offline-ready')).toHaveTextContent('false')
    expect(screen.getByTestId('can-install')).toHaveTextContent('false')
  })

  it('provides working update functions', () => {
    render(
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
    )

    const updateButton = screen.getByTestId('update-sw')
    const closeButton = screen.getByTestId('close-prompt')
    const installButton = screen.getByTestId('install-prompt')

    expect(updateButton).toBeInTheDocument()
    expect(closeButton).toBeInTheDocument()
    expect(installButton).toBeInTheDocument()
  })

  it('throws error when usePWA is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('usePWA must be used within a PWAProvider')

    consoleSpy.mockRestore()
  })
}) 