import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, useTheme } from '@repo/ui'

const TestComponent: React.FC = () => {
  const { theme, resolvedTheme } = useTheme()
  
  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
    </div>
  )
}

describe('Theme System', () => {
  it('renders theme components correctly', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light')
  })
}) 