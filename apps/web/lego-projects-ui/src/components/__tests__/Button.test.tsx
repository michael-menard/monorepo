/**
 * Example Button Component Tests
 * Validates Vitest configuration and testing utilities
 */
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderComponent } from '../../test/utils.js';

// Simple Button component for testing
const Button = ({ 
  onClick, 
  children, 
  disabled = false 
}: { 
  onClick?: () => void
  children: React.ReactNode
  disabled?: boolean 
}) => (
  <button onClick={onClick} disabled={disabled} data-testid="button">
    {children}
  </button>
)

describe('Button Component', () => {
  it('renders with text', () => {
    renderComponent(<Button>Click me</Button>)
    
    expect(screen.getByTestId('button')).toBeInTheDocument()
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const handleClick = vi.fn()
    const { user } = renderComponent(
      <Button onClick={handleClick}>Click me</Button>
    )
    
    await user.click(screen.getByTestId('button'))
    
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('can be disabled', () => {
    renderComponent(<Button disabled>Disabled</Button>)
    
    expect(screen.getByTestId('button')).toBeDisabled()
  })

  it('supports keyboard interaction', async () => {
    const handleClick = vi.fn()
    const { user } = renderComponent(
      <Button onClick={handleClick}>Press me</Button>
    )
    
    const button = screen.getByTestId('button')
    button.focus()
    
    await user.keyboard('{Enter}')
    expect(handleClick).toHaveBeenCalledOnce()
  })
}) 