import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@repo/ui'
import { ThemeSelector } from '../ThemeSelector'

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

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>)
}

describe('ThemeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.documentElement.classList.remove('dark')
  })

  it('renders all theme options', () => {
    renderWithTheme(<ThemeSelector />)

    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('shows theme descriptions', () => {
    renderWithTheme(<ThemeSelector />)

    expect(screen.getByText('Clean and bright interface')).toBeInTheDocument()
    expect(screen.getByText('Easy on the eyes in low light')).toBeInTheDocument()
    expect(screen.getByText('Matches your device settings')).toBeInTheDocument()
  })

  it('shows system theme as selected by default', () => {
    renderWithTheme(<ThemeSelector />)

    const systemButton = screen.getByText('System').closest('button')
    expect(systemButton).toHaveClass('ring-2', 'ring-primary')
  })

  it('allows selecting light theme', () => {
    renderWithTheme(<ThemeSelector />)

    const lightButton = screen.getByText('Light').closest('button')
    fireEvent.click(lightButton!)

    // After clicking, the light theme should be selected
    expect(lightButton).toHaveClass('ring-2', 'ring-primary')
  })

  it('allows selecting dark theme', () => {
    renderWithTheme(<ThemeSelector />)

    const darkButton = screen.getByText('Dark').closest('button')
    fireEvent.click(darkButton!)

    // After clicking, the dark theme should be selected
    expect(darkButton).toHaveClass('ring-2', 'ring-primary')
  })

  it('shows check icon for selected theme', () => {
    renderWithTheme(<ThemeSelector />)

    // System should be selected by default and show check icon
    const systemButton = screen.getByText('System').closest('button')
    const checkIcon =
      systemButton?.querySelector('svg[data-testid="check-icon"]') ||
      systemButton?.querySelector('svg:last-child')
    expect(checkIcon).toBeInTheDocument()
  })

  it('applies custom className', () => {
    renderWithTheme(<ThemeSelector className="custom-class" />)

    const container = screen.getByText('Light').closest('.custom-class')
    expect(container).toBeInTheDocument()
  })

  it('displays correct icons for each theme', () => {
    renderWithTheme(<ThemeSelector />)

    // Check that each button has an icon (we can't easily test specific icons without data-testid)
    const lightButton = screen.getByText('Light').closest('button')
    const darkButton = screen.getByText('Dark').closest('button')
    const systemButton = screen.getByText('System').closest('button')

    expect(lightButton?.querySelector('svg')).toBeInTheDocument()
    expect(darkButton?.querySelector('svg')).toBeInTheDocument()
    expect(systemButton?.querySelector('svg')).toBeInTheDocument()
  })
})
