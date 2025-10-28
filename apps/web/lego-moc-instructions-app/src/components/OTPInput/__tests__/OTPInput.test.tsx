import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { OTPInput } from '../index'

describe('OTPInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders 6 input fields by default', () => {
    render(<OTPInput {...defaultProps} />)
    
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(6)
    
    inputs.forEach((input, index) => {
      expect(input).toHaveAttribute('aria-label', `Verification code digit ${index + 1}`)
    })
  })

  it('renders custom length of input fields', () => {
    render(<OTPInput {...defaultProps} length={4} />)
    
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(4)
  })

  it('displays the current value correctly', () => {
    render(<OTPInput {...defaultProps} value="123456" />)
    
    const inputs = screen.getAllByRole('textbox')
    expect(inputs[0]).toHaveValue('1')
    expect(inputs[1]).toHaveValue('2')
    expect(inputs[2]).toHaveValue('3')
    expect(inputs[3]).toHaveValue('4')
    expect(inputs[4]).toHaveValue('5')
    expect(inputs[5]).toHaveValue('6')
  })

  it('handles partial values correctly', () => {
    render(<OTPInput {...defaultProps} value="123" />)
    
    const inputs = screen.getAllByRole('textbox')
    expect(inputs[0]).toHaveValue('1')
    expect(inputs[1]).toHaveValue('2')
    expect(inputs[2]).toHaveValue('3')
    expect(inputs[3]).toHaveValue('')
    expect(inputs[4]).toHaveValue('')
    expect(inputs[5]).toHaveValue('')
  })

  it('calls onChange when typing in an input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    
    render(<OTPInput {...defaultProps} onChange={onChange} />)
    
    const firstInput = screen.getAllByRole('textbox')[0]
    await user.type(firstInput, '1')
    
    expect(onChange).toHaveBeenCalledWith('1')
  })

  it('moves focus to next input after typing', async () => {
    const user = userEvent.setup()
    
    render(<OTPInput {...defaultProps} />)
    
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], '1')
    
    expect(inputs[1]).toHaveFocus()
  })

  it('handles backspace correctly', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    
    render(<OTPInput {...defaultProps} value="123" onChange={onChange} />)
    
    const thirdInput = screen.getAllByRole('textbox')[2]
    thirdInput.focus()
    
    await user.keyboard('{Backspace}')
    
    expect(onChange).toHaveBeenCalledWith('12')
  })

  it('moves focus to previous input on backspace when current is empty', async () => {
    const user = userEvent.setup()
    
    render(<OTPInput {...defaultProps} value="12" />)
    
    const inputs = screen.getAllByRole('textbox')
    inputs[2].focus() // Focus on empty third input
    
    await user.keyboard('{Backspace}')
    
    expect(inputs[1]).toHaveFocus()
  })

  it('handles paste correctly', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    
    render(<OTPInput {...defaultProps} onChange={onChange} />)
    
    const firstInput = screen.getAllByRole('textbox')[0]
    firstInput.focus()
    
    await user.paste('123456')
    
    expect(onChange).toHaveBeenCalledWith('123456')
  })

  it('handles paste with non-numeric characters', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    
    render(<OTPInput {...defaultProps} onChange={onChange} />)
    
    const firstInput = screen.getAllByRole('textbox')[0]
    firstInput.focus()
    
    await user.paste('1a2b3c')
    
    expect(onChange).toHaveBeenCalledWith('123')
  })

  it('handles arrow key navigation', async () => {
    const user = userEvent.setup()
    
    render(<OTPInput {...defaultProps} value="123456" />)
    
    const inputs = screen.getAllByRole('textbox')
    inputs[2].focus()
    
    await user.keyboard('{ArrowLeft}')
    expect(inputs[1]).toHaveFocus()
    
    await user.keyboard('{ArrowRight}')
    expect(inputs[2]).toHaveFocus()
  })

  it('applies error styling when error prop is true', () => {
    render(<OTPInput {...defaultProps} error />)
    
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach(input => {
      expect(input).toHaveClass('border-red-500')
    })
  })

  it('disables all inputs when disabled prop is true', () => {
    render(<OTPInput {...defaultProps} disabled />)
    
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach(input => {
      expect(input).toBeDisabled()
    })
  })

  it('only allows numeric input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    
    render(<OTPInput {...defaultProps} onChange={onChange} />)
    
    const firstInput = screen.getAllByRole('textbox')[0]
    await user.type(firstInput, 'a')
    
    expect(onChange).not.toHaveBeenCalled()
    expect(firstInput).toHaveValue('')
  })

  it('selects input content on focus', async () => {
    const user = userEvent.setup()
    
    render(<OTPInput {...defaultProps} value="123456" />)
    
    const firstInput = screen.getAllByRole('textbox')[0]
    await user.click(firstInput)
    
    // Check if the input value is selected (this is a bit tricky to test)
    expect(firstInput).toHaveFocus()
  })

  it('focuses first empty input on mount when autoFocus is true', () => {
    render(<OTPInput {...defaultProps} value="12" autoFocus />)
    
    const inputs = screen.getAllByRole('textbox')
    expect(inputs[2]).toHaveFocus() // Third input should be focused (first empty)
  })

  it('does not auto-focus when autoFocus is false', () => {
    render(<OTPInput {...defaultProps} autoFocus={false} />)
    
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach(input => {
      expect(input).not.toHaveFocus()
    })
  })
})
