import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from '@tanstack/react-router'
import { OfflineFallback } from '../OfflineFallback'

// Mock the router
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  MemoryRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useNavigate: () => mockNavigate,
}))

// Mock window.location.reload
const mockReload = vi.fn()
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
})

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  )
}

describe('OfflineFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with default props', () => {
    renderWithRouter(<OfflineFallback />)

    expect(screen.getByText('You are offline')).toBeInTheDocument()
    expect(screen.getByText(/This content is not available offline/)).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    expect(screen.getByText('Go Back')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('should render with custom title and message', () => {
    const customTitle = 'Custom Offline Title'
    const customMessage = 'Custom offline message'

    renderWithRouter(
      <OfflineFallback 
        title={customTitle}
        message={customMessage}
      />
    )

    expect(screen.getByText(customTitle)).toBeInTheDocument()
    expect(screen.getByText(customMessage)).toBeInTheDocument()
  })

  it('should handle retry button click with default behavior', () => {
    renderWithRouter(<OfflineFallback />)

    const retryButton = screen.getByText('Try Again')
    fireEvent.click(retryButton)

    expect(mockReload).toHaveBeenCalled()
  })

  it('should handle retry button click with custom onRetry', () => {
    const mockOnRetry = vi.fn()

    renderWithRouter(
      <OfflineFallback onRetry={mockOnRetry} />
    )

    const retryButton = screen.getByText('Try Again')
    fireEvent.click(retryButton)

    expect(mockOnRetry).toHaveBeenCalled()
    expect(mockReload).not.toHaveBeenCalled()
  })

  it('should handle go back button click', () => {
    renderWithRouter(<OfflineFallback />)

    const goBackButton = screen.getByText('Go Back')
    fireEvent.click(goBackButton)

    expect(mockNavigate).toHaveBeenCalledWith({ to: '..' })
  })

  it('should handle home button click', () => {
    renderWithRouter(<OfflineFallback />)

    const homeButton = screen.getByText('Home')
    fireEvent.click(homeButton)

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
  })

  it('should hide retry button when showRetry is false', () => {
    renderWithRouter(<OfflineFallback showRetry={false} />)

    expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
  })

  it('should hide home button when showHome is false', () => {
    renderWithRouter(<OfflineFallback showHome={false} />)

    expect(screen.queryByText('Home')).not.toBeInTheDocument()
  })

  it('should show offline warning message', () => {
    renderWithRouter(<OfflineFallback />)

    expect(screen.getByText(/Some features may be limited while offline/)).toBeInTheDocument()
    expect(screen.getByText(/Your changes will sync when you're back online/)).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    renderWithRouter(<OfflineFallback />)

    const retryButton = screen.getByRole('button', { name: /try again/i })
    const goBackButton = screen.getByRole('button', { name: /go back/i })
    const homeButton = screen.getByRole('button', { name: /home/i })

    expect(retryButton).toBeInTheDocument()
    expect(goBackButton).toBeInTheDocument()
    expect(homeButton).toBeInTheDocument()
  })
}) 