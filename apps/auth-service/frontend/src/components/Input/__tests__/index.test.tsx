import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Input from '../index'

// Mock icon component
const MockIcon = ({ className }: { className?: string }) => (
  <div data-testid="mock-icon" className={className}>Icon</div>
)

describe('Input Component', () => {
  it('renders input with basic props', () => {
    render(<Input placeholder="Enter text" data-testid="input" />)
    
    const input = screen.getByTestId('input')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'Enter text')
  })

  it('renders input with icon when provided', () => {
    render(<Input icon={MockIcon} placeholder="With icon" data-testid="input" />)
    
    const input = screen.getByTestId('input')
    const icon = screen.getByTestId('mock-icon')
    
    expect(input).toBeInTheDocument()
    expect(icon).toBeInTheDocument()
    expect(input).toHaveClass('pl-12') // Should have left padding when icon is present
  })

  it('does not render icon when not provided', () => {
    render(<Input placeholder="Without icon" data-testid="input" />)
    
    const input = screen.getByTestId('input')
    const icon = screen.queryByTestId('mock-icon')
    
    expect(input).toBeInTheDocument()
    expect(icon).not.toBeInTheDocument()
    expect(input).not.toHaveClass('pl-12') // Should not have left padding when no icon
  })

  it('handles user input correctly', async () => {
    const user = userEvent.setup()
    render(<Input data-testid="input" />)
    
    const input = screen.getByTestId('input')
    await user.type(input, 'test input')
    
    expect(input).toHaveValue('test input')
  })

  it('applies all HTML input attributes', () => {
    render(
      <Input
        type="email"
        name="email"
        id="email-input"
        required
        disabled
        data-testid="input"
      />
    )
    
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('name', 'email')
    expect(input).toHaveAttribute('id', 'email-input')
    expect(input).toBeRequired()
    expect(input).toBeDisabled()
  })

  it('has correct styling classes', () => {
    render(<Input data-testid="input" />)
    
    const input = screen.getByTestId('input')
    expect(input).toHaveClass(
      'w-full',
      'px-4',
      'py-3',
      'bg-gray-800',
      'border',
      'border-gray-700',
      'rounded-lg',
      'text-white',
      'placeholder-gray-400',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-green-500',
      'focus:border-transparent'
    )
  })

  it('has correct styling when icon is present', () => {
    render(<Input icon={MockIcon} data-testid="input" />)
    
    const input = screen.getByTestId('input')
    expect(input).toHaveClass('pl-12')
  })

  it('handles focus events', async () => {
    const user = userEvent.setup()
    render(<Input data-testid="input" />)
    
    const input = screen.getByTestId('input')
    await user.click(input)
    
    expect(input).toHaveFocus()
  })

  it('handles change events', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()
    render(<Input onChange={handleChange} data-testid="input" />)
    
    const input = screen.getByTestId('input')
    await user.type(input, 'a')
    
    expect(handleChange).toHaveBeenCalled()
  })

  it('renders with different input types', () => {
    const { rerender } = render(<Input type="text" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'text')
    
    rerender(<Input type="password" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'password')
    
    rerender(<Input type="email" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'email')
  })

  it('handles aria attributes', () => {
    render(
      <Input
        aria-label="Email input"
        aria-describedby="email-help"
        data-testid="input"
      />
    )
    
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('aria-label', 'Email input')
    expect(input).toHaveAttribute('aria-describedby', 'email-help')
  })
}) 