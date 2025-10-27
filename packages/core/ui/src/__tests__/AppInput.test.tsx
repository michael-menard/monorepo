import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {AppInput} from '../AppInput'
import {SANITIZATION_PROFILES} from '../lib/sanitization'

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((input: string) => {
      // Simple mock that removes script tags and dangerous content
      return input
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
    }),
  },
}))

describe('AppInput', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with basic props', () => {
    render(<AppInput placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('should sanitize input on change by default', async () => {
    const onChange = vi.fn()
    render(<AppInput onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, '<script>alert("XSS")</script>Hello')

    // Should have called onChange with sanitized value
    expect(onChange).toHaveBeenCalled()
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]
    expect(lastCall[0].target.value).not.toContain('<script>')
  })

  it('should not sanitize on change when sanitizeOnChange is false', async () => {
    const onChange = vi.fn()
    render(<AppInput onChange={onChange} sanitizeOnChange={false} />)

    const input = screen.getByRole('textbox')
    await user.type(input, '<script>alert("XSS")</script>')

    // Should pass through unsanitized value on change
    expect(onChange).toHaveBeenCalled()
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]
    expect(lastCall[0].target.value).toContain('<script>')
  })

  it('should sanitize on blur when sanitizeOnChange is false', async () => {
    const onBlur = vi.fn()
    render(<AppInput onBlur={onBlur} sanitizeOnChange={false} />)

    const input = screen.getByRole('textbox')
    await user.type(input, '<script>alert("XSS")</script>Hello')
    await user.tab() // Trigger blur

    expect(onBlur).toHaveBeenCalled()
    const lastCall = onBlur.mock.calls[onBlur.mock.calls.length - 1]
    expect(lastCall[0].target.value).not.toContain('<script>')
  })

  it('should use appropriate sanitization profile based on input type', () => {
    const { rerender } = render(<AppInput type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')

    rerender(<AppInput type="search" />)
    expect(screen.getByRole('searchbox')).toHaveAttribute('type', 'search')

    rerender(<AppInput type="url" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'url')
  })

  it('should use custom sanitization config when provided', async () => {
    const onChange = vi.fn()
    const customConfig = SANITIZATION_PROFILES.BASIC_TEXT

    render(<AppInput onChange={onChange} sanitizationConfig={customConfig} />)

    const input = screen.getByRole('textbox')
    await user.type(input, '<b>Bold text</b>')

    expect(onChange).toHaveBeenCalled()
  })

  it('should show sanitization warnings when enabled', async () => {
    const onSanitizationWarning = vi.fn()
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    render(
      <AppInput showSanitizationWarnings={true} onSanitizationWarning={onSanitizationWarning} />,
    )

    const input = screen.getByRole('textbox')
    await user.type(input, '<script>alert("XSS")</script>')

    // Should call the warning callback
    expect(onSanitizationWarning).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should work as controlled component', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<AppInput value="initial" onChange={onChange} />)

    expect(screen.getByDisplayValue('initial')).toBeInTheDocument()

    rerender(<AppInput value="updated" onChange={onChange} />)
    expect(screen.getByDisplayValue('updated')).toBeInTheDocument()
  })

  it('should work as uncontrolled component', async () => {
    render(<AppInput defaultValue="default" />)
    expect(screen.getByDisplayValue('default')).toBeInTheDocument()

    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'new value')

    expect(screen.getByDisplayValue('new value')).toBeInTheDocument()
  })

  it('should handle different input types correctly', () => {
    const inputTypes = ['text', 'email', 'password', 'search', 'url', 'tel', 'number']

    inputTypes.forEach(type => {
      const { unmount } = render(<AppInput type={type as any} data-testid={`input-${type}`} />)
      const input = screen.getByTestId(`input-${type}`)
      expect(input).toHaveAttribute('type', type)
      unmount()
    })
  })

  it('should forward ref correctly', () => {
    const ref = vi.fn()
    render(<AppInput ref={ref} />)
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement))
  })

  it('should preserve all other Input props', () => {
    render(
      <AppInput
        className="custom-class"
        disabled
        required
        maxLength={100}
        data-testid="custom-input"
      />,
    )

    const input = screen.getByTestId('custom-input')
    expect(input).toHaveClass('custom-class')
    expect(input).toBeDisabled()
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('maxLength', '100')
  })

  it('should handle empty and whitespace input correctly', async () => {
    const onChange = vi.fn()
    render(<AppInput onChange={onChange} />)

    const input = screen.getByRole('textbox')

    // Test whitespace input
    await user.type(input, '   ')

    expect(onChange).toHaveBeenCalled()

    // Test clearing input
    await user.clear(input)
    expect(input).toHaveValue('')
  })

  it('should sanitize initial value if provided and controlled', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    render(
      <AppInput
        value="<script>alert('XSS')</script>Clean text"
        showSanitizationWarnings={true}
        onChange={() => {}}
      />,
    )

    // Should warn about initial value sanitization
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Initial value was sanitized'),
      expect.any(Object),
    )

    consoleSpy.mockRestore()
  })

  it('should support debounceMs prop', () => {
    const onChange = vi.fn()

    render(<AppInput onChange={onChange} debounceMs={300} />)

    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()

    // Component should render without errors when debounceMs is provided
    expect(input).toHaveAttribute('type', 'text')
  })

  it('should handle debounceMs of 0', () => {
    const onChange = vi.fn()

    render(<AppInput onChange={onChange} debounceMs={0} />)

    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()

    // Component should render without errors when debounceMs is 0
    expect(input).toHaveAttribute('type', 'text')
  })
})
