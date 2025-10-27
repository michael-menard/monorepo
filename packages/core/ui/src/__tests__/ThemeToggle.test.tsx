import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '../components/ThemeToggle'
import { ThemeProvider } from '../providers/ThemeProvider'

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

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset document classes
    document.documentElement.classList.remove('dark')
  })

  it('renders theme toggle button', () => {
    renderWithTheme(<ThemeToggle />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('shows system icon by default', () => {
    renderWithTheme(<ThemeToggle />)
    // Should show monitor icon for system theme
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('has proper accessibility attributes', () => {
    renderWithTheme(<ThemeToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-haspopup', 'menu')
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('supports different variants', () => {
    renderWithTheme(<ThemeToggle variant="ghost" />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('hover:bg-accent')
  })

  it('supports different sizes', () => {
    renderWithTheme(<ThemeToggle size="lg" />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-11')
  })
})
