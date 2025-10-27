import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../providers/ThemeProvider'
import { ThemeToggle } from '../components/ThemeToggle'

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

const TestApp: React.FC = () => {
  const { theme, resolvedTheme } = useTheme()

  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      <ThemeToggle />
    </div>
  )
}

describe('Theme Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.documentElement.classList.remove('dark')
  })

  it('renders theme components correctly', () => {
    render(
      <ThemeProvider>
        <TestApp />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light')
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('applies dark class when theme is set to dark', () => {
    const TestComponent: React.FC = () => {
      const { setTheme } = useTheme()

      React.useEffect(() => {
        setTheme('dark')
      }, [setTheme])

      return <div>Test</div>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    )

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('saves theme preference to localStorage', () => {
    const TestComponent: React.FC = () => {
      const { setTheme } = useTheme()

      React.useEffect(() => {
        setTheme('light')
      }, [setTheme])

      return <div>Test</div>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    )

    expect(localStorageMock.setItem).toHaveBeenCalledWith('ui-theme', 'light')
  })
})
