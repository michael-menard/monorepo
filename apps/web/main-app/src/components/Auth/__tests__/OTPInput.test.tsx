import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { OTPInput } from '../OTPInput'

describe('OTPInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    length: 6,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correct number of input fields', () => {
    render(<OTPInput {...defaultProps} data-testid="otp-input" />)

    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(6)
  })

  it('renders custom length of input fields', () => {
    render(<OTPInput {...defaultProps} length={4} data-testid="otp-input" />)

    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(4)
  })

  it('displays current value correctly', () => {
    render(<OTPInput {...defaultProps} value="123" data-testid="otp-input" />)

    const inputs = screen.getAllByRole('textbox')
    expect(inputs[0]).toHaveValue('1')
    expect(inputs[1]).toHaveValue('2')
    expect(inputs[2]).toHaveValue('3')
    expect(inputs[3]).toHaveValue('')
  })

  it('calls onChange when typing in input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<OTPInput {...defaultProps} onChange={onChange} data-testid="otp-input" />)

    const firstInput = screen.getAllByRole('textbox')[0]
    await user.type(firstInput, '5')

    expect(onChange).toHaveBeenCalledWith('5')
  })

  it('moves focus to next input after typing', async () => {
    const user = userEvent.setup()

    render(<OTPInput {...defaultProps} data-testid="otp-input" />)

    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], '1')

    expect(inputs[1]).toHaveFocus()
  })

  it('handles backspace correctly', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<OTPInput {...defaultProps} value="123" onChange={onChange} data-testid="otp-input" />)

    const inputs = screen.getAllByRole('textbox')
    inputs[2].focus()
    await user.keyboard('{Backspace}')

    expect(onChange).toHaveBeenCalledWith('12')
  })

  it('handles paste correctly', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<OTPInput {...defaultProps} onChange={onChange} data-testid="otp-input" />)

    const firstInput = screen.getAllByRole('textbox')[0]
    firstInput.focus()

    await user.paste('123456')

    expect(onChange).toHaveBeenCalledWith('123456')
  })

  it('only allows numeric input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<OTPInput {...defaultProps} onChange={onChange} data-testid="otp-input" />)

    const firstInput = screen.getAllByRole('textbox')[0]
    await user.type(firstInput, 'a')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('handles arrow key navigation', async () => {
    const user = userEvent.setup()

    render(<OTPInput {...defaultProps} value="123" data-testid="otp-input" />)

    const inputs = screen.getAllByRole('textbox')
    inputs[1].focus()

    await user.keyboard('{ArrowRight}')
    expect(inputs[2]).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    expect(inputs[1]).toHaveFocus()
  })

  it('applies error styling when error prop is true', () => {
    render(<OTPInput {...defaultProps} error={true} data-testid="otp-input" />)

    const inputs = screen.getAllByRole('textbox')
    inputs.forEach(input => {
      expect(input).toHaveClass('border-red-500')
    })
  })

  it('disables inputs when disabled prop is true', () => {
    render(<OTPInput {...defaultProps} disabled={true} data-testid="otp-input" />)

    const inputs = screen.getAllByRole('textbox')
    inputs.forEach(input => {
      expect(input).toBeDisabled()
    })
  })

  it('focuses first empty input on mount when autoFocus is true', async () => {
    render(<OTPInput {...defaultProps} value="12" autoFocus={true} data-testid="otp-input" />)

    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox')
      expect(inputs[2]).toHaveFocus()
    })
  })

  it('has proper accessibility attributes', () => {
    render(<OTPInput {...defaultProps} data-testid="otp-input" />)

    const inputs = screen.getAllByRole('textbox')
    inputs.forEach((input, index) => {
      expect(input).toHaveAttribute('aria-label', `Verification code digit ${index + 1}`)
      expect(input).toHaveAttribute('inputMode', 'numeric')
      expect(input).toHaveAttribute('pattern', '[0-9]*')
    })
  })
})
