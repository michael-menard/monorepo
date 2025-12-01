import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {AppForm} from '../forms/AppForm'
import {SANITIZATION_PROFILES} from '../lib/sanitization'

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((input: string, config?: any) => {
      // Mock implementation that respects STRICT vs BASIC_TEXT profiles
      let result = input
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')

      // If ALLOWED_TAGS is empty (STRICT profile), remove all HTML
      if (config?.ALLOWED_TAGS && config.ALLOWED_TAGS.length === 0) {
        result = result.replace(/<[^>]*>/g, '')
      }

      return result
    }),
  },
}))

describe('AppForm', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render form with children', () => {
    render(
      <AppForm>
        <input name="test" data-testid="test-input" />
        <button type="submit">Submit</button>
      </AppForm>,
    )

    expect(screen.getByTestId('test-input')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })

  it('should sanitize form data on submit by default', async () => {
    const onSubmit = vi.fn()

    render(
      <AppForm onSubmit={onSubmit}>
        <input name="message" defaultValue="<script>alert('XSS')</script>Hello" />
        <input name="email" defaultValue="user@example.com" />
        <button type="submit">Submit</button>
      </AppForm>,
    )

    const submitButton = screen.getByRole('button', { name: 'Submit' })
    await user.click(submitButton)

    expect(onSubmit).toHaveBeenCalled()
    const [event, sanitizedData] = onSubmit.mock.calls[0]

    // Check that FormData was sanitized
    expect(sanitizedData.get('message')).toBe('Hello')
    expect(sanitizedData.get('email')).toBe('user@example.com')
  })

  it('should not sanitize when sanitizeOnSubmit is false', async () => {
    const onSubmit = vi.fn()

    render(
      <AppForm onSubmit={onSubmit} sanitizeOnSubmit={false}>
        <input name="message" defaultValue="<script>alert('XSS')</script>Hello" />
        <button type="submit">Submit</button>
      </AppForm>,
    )

    const submitButton = screen.getByRole('button', { name: 'Submit' })
    await user.click(submitButton)

    expect(onSubmit).toHaveBeenCalled()
    const [event, formData] = onSubmit.mock.calls[0]

    // Should contain original unsanitized value
    expect(formData.get('message')).toBe("<script>alert('XSS')</script>Hello")
  })

  it('should use field-specific sanitization configs', async () => {
    const onSubmit = vi.fn()
    const fieldConfigs = {
      title: SANITIZATION_PROFILES.BASIC_TEXT,
      description: SANITIZATION_PROFILES.STRICT,
    }

    render(
      <AppForm onSubmit={onSubmit} fieldSanitizationConfigs={fieldConfigs}>
        <input name="title" defaultValue="<b>Important</b> Title" />
        <input name="description" defaultValue="<script>alert('XSS')</script><b>Content</b>" />
        <button type="submit">Submit</button>
      </AppForm>,
    )

    const submitButton = screen.getByRole('button', { name: 'Submit' })
    await user.click(submitButton)

    expect(onSubmit).toHaveBeenCalled()
    const [event, sanitizedData] = onSubmit.mock.calls[0]

    // Title should preserve basic HTML (BASIC_TEXT profile)
    expect(sanitizedData.get('title')).toBe('<b>Important</b> Title')

    // Description should be strictly sanitized (HTML removed)
    expect(sanitizedData.get('description')).toBe('Content')
  })

  it('should use default sanitization config for fields without specific config', async () => {
    const onSubmit = vi.fn()

    render(
      <AppForm
        onSubmit={onSubmit}
        defaultSanitizationConfig={SANITIZATION_PROFILES.BASIC_TEXT}
        fieldSanitizationConfigs={{ email: SANITIZATION_PROFILES.STRICT }}
      >
        <input name="message" defaultValue="<b>Bold</b> message" />
        <input name="email" defaultValue="<b>user@example.com</b>" />
        <button type="submit">Submit</button>
      </AppForm>,
    )

    const submitButton = screen.getByRole('button', { name: 'Submit' })
    await user.click(submitButton)

    expect(onSubmit).toHaveBeenCalled()
    const [event, sanitizedData] = onSubmit.mock.calls[0]

    // Message should use default BASIC_TEXT config
    expect(sanitizedData.get('message')).toBe('<b>Bold</b> message')

    // Email should use STRICT config
    expect(sanitizedData.get('email')).toBe('user@example.com')
  })

  it('should show sanitization warnings when enabled', async () => {
    const onSubmit = vi.fn()
    const onSanitizationWarning = vi.fn()
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    render(
      <AppForm
        onSubmit={onSubmit}
        showSanitizationWarnings={true}
        onSanitizationWarning={onSanitizationWarning}
      >
        <input name="message" defaultValue="<script>alert('XSS')</script>Hello" />
        <button type="submit">Submit</button>
      </AppForm>,
    )

    const submitButton = screen.getByRole('button', { name: 'Submit' })
    await user.click(submitButton)

    // Should call warning callback
    expect(onSanitizationWarning).toHaveBeenCalled()
    expect(onSanitizationWarning.mock.calls[0][0]).toEqual(
      expect.arrayContaining([expect.stringContaining('Field "message" was sanitized')]),
    )

    // Should log warnings to console
    expect(consoleSpy).toHaveBeenCalledWith('AppForm sanitization warnings:', expect.any(Array))

    consoleSpy.mockRestore()
  })

  it('should handle forms with no string values', async () => {
    const onSubmit = vi.fn()

    render(
      <AppForm onSubmit={onSubmit}>
        <input name="file" type="file" />
        <button type="submit">Submit</button>
      </AppForm>,
    )

    const submitButton = screen.getByRole('button', { name: 'Submit' })
    await user.click(submitButton)

    expect(onSubmit).toHaveBeenCalled()
    const [event, sanitizedData] = onSubmit.mock.calls[0]

    // Should handle non-string form data gracefully
    expect(sanitizedData).toBeInstanceOf(FormData)
  })

  it('should forward ref correctly', () => {
    const ref = vi.fn()
    render(
      <AppForm ref={ref}>
        <button type="submit">Submit</button>
      </AppForm>,
    )

    expect(ref).toHaveBeenCalledWith(expect.any(HTMLFormElement))
  })

  it('should preserve all other form props', () => {
    render(
      <AppForm className="custom-form" method="post" action="/submit" data-testid="custom-form">
        <button type="submit">Submit</button>
      </AppForm>,
    )

    const form = screen.getByTestId('custom-form')
    expect(form).toHaveClass('custom-form')
    expect(form).toHaveAttribute('method', 'post')
    expect(form).toHaveAttribute('action', '/submit')
  })

  it('should handle form submission without onSubmit handler', async () => {
    render(
      <AppForm>
        <input name="test" defaultValue="test value" />
        <button type="submit">Submit</button>
      </AppForm>,
    )

    const submitButton = screen.getByRole('button', { name: 'Submit' })

    // Should not throw error when clicking submit without onSubmit handler
    expect(() => user.click(submitButton)).not.toThrow()
  })

  it('should handle empty form data', async () => {
    const onSubmit = vi.fn()

    render(
      <AppForm onSubmit={onSubmit}>
        <button type="submit">Submit</button>
      </AppForm>,
    )

    const submitButton = screen.getByRole('button', { name: 'Submit' })
    await user.click(submitButton)

    expect(onSubmit).toHaveBeenCalled()
    const [event, sanitizedData] = onSubmit.mock.calls[0]

    // Should handle empty form data
    expect(sanitizedData).toBeInstanceOf(FormData)
    expect([...sanitizedData.entries()]).toHaveLength(0)
  })

  it('should handle complex form with multiple field types', async () => {
    const onSubmit = vi.fn()

    render(
      <AppForm onSubmit={onSubmit}>
        <input name="text" type="text" defaultValue="<script>alert('XSS')</script>Text" />
        <input name="email" type="email" defaultValue="user@example.com" />
        <input name="number" type="number" defaultValue="123" />
        <textarea name="message" defaultValue="<b>Message</b> content" />
        <select name="category" defaultValue="<script>alert('XSS')</script>category1">
          <option value="category1">Category 1</option>
        </select>
        <button type="submit">Submit</button>
      </AppForm>,
    )

    const submitButton = screen.getByRole('button', { name: 'Submit' })
    await user.click(submitButton)

    expect(onSubmit).toHaveBeenCalled()
    const [event, sanitizedData] = onSubmit.mock.calls[0]

    expect(sanitizedData.get('text')).toBe('Text')
    expect(sanitizedData.get('email')).toBe('user@example.com')
    expect(sanitizedData.get('number')).toBe('123')
    expect(sanitizedData.get('message')).toBe('Message content')
    expect(sanitizedData.get('category')).toBe('category1')
  })
})
