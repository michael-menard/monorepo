import React from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@repo/ui'
import { AccountSettingsPage } from '../index'

// Mock matchMedia before any imports that might use it
const mockMatchMedia = vi.fn()
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
})

// Mock navigator.standalone for iOS PWA detection
Object.defineProperty(window.navigator, 'standalone', {
  writable: true,
  value: false,
})

// Mock the UserPreferencesProvider
const mockUserPreferencesContext = {
  preferences: {
    theme: 'system' as const,
    language: 'en',
    notifications: {
      email: true,
      push: true,
      marketing: false,
    },
    privacy: {
      analytics: true,
      cookies: true,
    },
    accessibility: {
      reducedMotion: false,
      highContrast: false,
      fontSize: 'medium' as const,
    },
  },
  isLoading: false,
  error: null,
  updatePreference: vi.fn(),
  updateNestedPreference: vi.fn(),
  savePreferences: vi.fn(),
  resetPreferences: vi.fn(),
  exportPreferences: vi.fn(),
  importPreferences: vi.fn(),
}

vi.mock('../../../providers/UserPreferencesProvider', () => ({
  useUserPreferencesContext: () => mockUserPreferencesContext,
}))

// Mock the PWA context
const mockPWAContext = {
  needRefresh: false,
  offlineReady: false,
  updateServiceWorker: vi.fn(),
  closePrompt: vi.fn(),
  canInstall: false,
  installPrompt: vi.fn(),
}

vi.mock('../../../components/PWAProvider', () => ({
  usePWA: () => mockPWAContext,
}))

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

const renderWithProviders = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>)
}

describe('AccountSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserPreferencesContext.isLoading = false
    mockUserPreferencesContext.error = null
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

  it('renders the page header', () => {
    renderWithProviders(<AccountSettingsPage />)

    expect(screen.getByText('Account Settings')).toBeInTheDocument()
    expect(
      screen.getByText('Manage your account preferences and customize your experience.'),
    ).toBeInTheDocument()
  })

  it('renders all settings sections', () => {
    renderWithProviders(<AccountSettingsPage />)

    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getAllByText('App Installation')).toHaveLength(2) // Card title and FormSection title
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('Privacy & Security')).toBeInTheDocument()
    expect(screen.getByText('Data Management')).toBeInTheDocument()
  })

  it('renders theme selector in appearance section', () => {
    renderWithProviders(<AccountSettingsPage />)

    expect(screen.getByText('Theme')).toBeInTheDocument()
    expect(screen.getByText('Choose your preferred color scheme')).toBeInTheDocument()
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('renders PWA settings section', () => {
    renderWithProviders(<AccountSettingsPage />)

    expect(screen.getByText('Install and manage the progressive web app')).toBeInTheDocument()
    expect(screen.getByText('Progressive Web App Features')).toBeInTheDocument()
    expect(screen.getByText('Offline Support')).toBeInTheDocument()
    expect(screen.getByText('Benefits of using this app')).toBeInTheDocument()
  })

  it('shows loading state when preferences are loading', () => {
    mockUserPreferencesContext.isLoading = true

    renderWithProviders(<AccountSettingsPage />)

    expect(screen.getByText('Loading preferences...')).toBeInTheDocument()
    expect(screen.queryByText('Account Settings')).not.toBeInTheDocument()
  })

  it('renders coming soon messages for unimplemented sections', () => {
    renderWithProviders(<AccountSettingsPage />)

    expect(screen.getByText(/Coming soon - manage your profile information/)).toBeInTheDocument()
    expect(screen.getByText(/Coming soon - manage email notifications/)).toBeInTheDocument()
    expect(screen.getByText(/Coming soon - password management/)).toBeInTheDocument()
    expect(screen.getByText(/Coming soon - data export/)).toBeInTheDocument()
  })

  it('has proper section descriptions', () => {
    renderWithProviders(<AccountSettingsPage />)

    expect(
      screen.getByText('Update your personal information and profile details'),
    ).toBeInTheDocument()
    expect(screen.getByText('Customize the look and feel of your interface')).toBeInTheDocument()
    expect(screen.getByText('Install and manage the progressive web app')).toBeInTheDocument()
    expect(screen.getByText('Control how and when you receive notifications')).toBeInTheDocument()
    expect(
      screen.getByText('Manage your privacy settings and account security'),
    ).toBeInTheDocument()
    expect(screen.getByText('Export, import, or delete your account data')).toBeInTheDocument()
  })

  it('applies correct icon colors to sections', () => {
    renderWithProviders(<AccountSettingsPage />)

    // Check that icons are present (we can't easily test specific colors without data-testid)
    const profileSection = screen.getByText('Profile').closest('div')
    const appearanceSection = screen.getByText('Appearance').closest('div')
    const notificationsSection = screen.getByText('Notifications').closest('div')
    const securitySection = screen.getByText('Privacy & Security').closest('div')
    const dataSection = screen.getByText('Data Management').closest('div')

    expect(profileSection?.querySelector('svg')).toBeInTheDocument()
    expect(appearanceSection?.querySelector('svg')).toBeInTheDocument()
    expect(notificationsSection?.querySelector('svg')).toBeInTheDocument()
    expect(securitySection?.querySelector('svg')).toBeInTheDocument()
    expect(dataSection?.querySelector('svg')).toBeInTheDocument()
  })
})
