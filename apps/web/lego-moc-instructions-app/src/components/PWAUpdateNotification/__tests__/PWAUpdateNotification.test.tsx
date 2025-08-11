import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PWAUpdateNotification } from '../PWAUpdateNotification'

// Mock the PWA context
const mockPWAContext = {
  needRefresh: false,
  offlineReady: false,
  updateServiceWorker: vi.fn(),
  closePrompt: vi.fn(),
  canInstall: false,
  installPrompt: vi.fn()
}

vi.mock('../../PWAProvider', () => ({
  usePWA: () => mockPWAContext,
  PWAProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

describe('PWAUpdateNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset flags to avoid multiple close buttons across tests
    mockPWAContext.needRefresh = false
    mockPWAContext.offlineReady = false
    mockPWAContext.canInstall = false
  })

  it('renders nothing when no notifications are needed', () => {
    render(<PWAUpdateNotification />)
    
    expect(screen.queryByText('New version available')).not.toBeInTheDocument()
    expect(screen.queryByText('Ready for offline use')).not.toBeInTheDocument()
    expect(screen.queryByText('Install App')).not.toBeInTheDocument()
  })

  it('renders update notification when needRefresh is true', () => {
    mockPWAContext.needRefresh = true
    
    render(<PWAUpdateNotification />)
    
    expect(screen.getByText('New version available')).toBeInTheDocument()
    expect(screen.getByText('A new version of the app is available. Update to get the latest features.')).toBeInTheDocument()
    expect(screen.getByText('Update')).toBeInTheDocument()
    expect(screen.getByText('Later')).toBeInTheDocument()
  })

  it('renders offline ready notification when offlineReady is true', () => {
    mockPWAContext.offlineReady = true
    
    render(<PWAUpdateNotification />)
    
    expect(screen.getByText('Ready for offline use')).toBeInTheDocument()
    expect(screen.getByText('The app is now ready to work offline.')).toBeInTheDocument()
  })

  it('renders install notification when canInstall is true', () => {
    mockPWAContext.canInstall = true
    
    render(<PWAUpdateNotification />)
    
    expect(screen.getByText('Install App')).toBeInTheDocument()
    expect(screen.getByText('Install this app on your device for a better experience.')).toBeInTheDocument()
    expect(screen.getByText('Install')).toBeInTheDocument()
    expect(screen.getByText('Not now')).toBeInTheDocument()
  })

  it('calls updateServiceWorker when update button is clicked', () => {
    mockPWAContext.needRefresh = true
    
    render(<PWAUpdateNotification />)
    
    const updateButton = screen.getByText('Update')
    fireEvent.click(updateButton)
    
    expect(mockPWAContext.updateServiceWorker).toHaveBeenCalled()
  })

  it('calls closePrompt when close button is clicked', () => {
    mockPWAContext.needRefresh = true
    
    render(<PWAUpdateNotification />)
    
    const closeButton = screen.getByRole('button', { name: 'Close update' })
    fireEvent.click(closeButton)
    
    expect(mockPWAContext.closePrompt).toHaveBeenCalled()
  })

  it('calls installPrompt when install button is clicked', () => {
    mockPWAContext.canInstall = true
    
    render(<PWAUpdateNotification />)
    
    const installButton = screen.getByText('Install')
    fireEvent.click(installButton)
    
    expect(mockPWAContext.installPrompt).toHaveBeenCalled()
  })

  it('displays multiple notifications when multiple states are true', () => {
    mockPWAContext.needRefresh = true
    mockPWAContext.offlineReady = true
    mockPWAContext.canInstall = true
    
    render(<PWAUpdateNotification />)
    
    expect(screen.getByText('New version available')).toBeInTheDocument()
    expect(screen.getByText('Ready for offline use')).toBeInTheDocument()
    expect(screen.getByText('Install App')).toBeInTheDocument()
  })
}) 