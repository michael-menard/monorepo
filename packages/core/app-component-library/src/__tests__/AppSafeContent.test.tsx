import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import {AppSafeContent} from '../content/AppSafeContent'
import {SANITIZATION_PROFILES} from '../lib/sanitization'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((input: string) => {
      // Mock implementation that removes dangerous content but preserves safe HTML
      return input
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
    }),
  },
}))

describe('AppSafeContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render sanitized content as div by default', () => {
    render(<AppSafeContent content="<script>alert('XSS')</script>Hello World" />)

    const content = screen.getByText('Hello World')
    expect(content).toBeInTheDocument()
    expect(content.tagName).toBe('DIV')
  })

  it('should render as specified HTML element', () => {
    render(<AppSafeContent content="Hello World" as="article" data-testid="safe-content" />)

    const content = screen.getByTestId('safe-content')
    expect(content.tagName).toBe('ARTICLE')
    expect(content).toHaveTextContent('Hello World')
  })

  it('should sanitize malicious content', () => {
    render(
      <AppSafeContent
        content="<script>alert('XSS')</script>Safe content"
        data-testid="safe-content"
      />,
    )

    const content = screen.getByTestId('safe-content')
    expect(content).toHaveTextContent('Safe content')
    expect(content.innerHTML).not.toContain('<script>')
  })

  it('should preserve safe HTML when using appropriate profile', () => {
    render(
      <AppSafeContent
        content="<b>Bold</b> and <i>italic</i> text"
        sanitizationConfig={SANITIZATION_PROFILES.BASIC_TEXT}
        data-testid="safe-content"
      />,
    )

    const content = screen.getByTestId('safe-content')
    expect(content.innerHTML).toContain('<b>Bold</b>')
    expect(content.innerHTML).toContain('<i>italic</i>')
  })

  it('should render plain text content without dangerouslySetInnerHTML', () => {
    render(<AppSafeContent content="Plain text content" data-testid="safe-content" />)

    const content = screen.getByTestId('safe-content')
    expect(content).toHaveTextContent('Plain text content')
    // Should not use dangerouslySetInnerHTML for plain text
    expect(content.innerHTML).toBe('Plain text content')
  })

  it('should use dangerouslySetInnerHTML for HTML content', () => {
    render(
      <AppSafeContent
        content="<b>Bold text</b>"
        sanitizationConfig={SANITIZATION_PROFILES.BASIC_TEXT}
        data-testid="safe-content"
      />,
    )

    const content = screen.getByTestId('safe-content')
    expect(content.innerHTML).toBe('<b>Bold text</b>')
  })

  it('should show sanitization warnings when enabled', async () => {
    const { logger } = await import('@repo/logger')
    const onSanitizationWarning = vi.fn()

    render(
      <AppSafeContent
        content="<script>alert('XSS')</script>Content"
        showSanitizationWarnings={true}
        onSanitizationWarning={onSanitizationWarning}
      />,
    )

    expect(onSanitizationWarning).toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      'AppSafeContent sanitization warnings:',
      expect.any(Array),
    )
  })

  it('should pass through additional props', () => {
    render(
      <AppSafeContent
        content="Test content"
        className="custom-class"
        id="custom-id"
        style={{ color: 'red' }}
        data-testid="safe-content"
      />,
    )

    const content = screen.getByTestId('safe-content')
    expect(content).toHaveClass('custom-class')
    expect(content).toHaveAttribute('id', 'custom-id')
    expect(content.style.color).toBe('red')
  })

  it('should handle empty content', () => {
    render(<AppSafeContent content="" data-testid="safe-content" />)

    const content = screen.getByTestId('safe-content')
    expect(content).toBeInTheDocument()
    expect(content).toBeEmptyDOMElement()
  })

  it('should handle different sanitization profiles', () => {
    const { rerender } = render(
      <AppSafeContent
        content="<script>alert('XSS')</script><b>Bold</b><a href='#'>Link</a>"
        sanitizationConfig={SANITIZATION_PROFILES.STRICT}
        data-testid="safe-content"
      />,
    )

    let content = screen.getByTestId('safe-content')
    expect(content.innerHTML).not.toContain('<script>')

    // Test with BASIC_TEXT profile
    rerender(
      <AppSafeContent
        content="<script>alert('XSS')</script><b>Bold</b><a href='#'>Link</a>"
        sanitizationConfig={SANITIZATION_PROFILES.BASIC_TEXT}
        data-testid="safe-content"
      />,
    )

    content = screen.getByTestId('safe-content')
    expect(content.innerHTML).toContain('<b>Bold</b>')

    // Test with RICH_TEXT profile
    rerender(
      <AppSafeContent
        content="<script>alert('XSS')</script><b>Bold</b><a href='#'>Link</a>"
        sanitizationConfig={SANITIZATION_PROFILES.RICH_TEXT}
        data-testid="safe-content"
      />,
    )

    content = screen.getByTestId('safe-content')
    expect(content.innerHTML).toContain('<b>Bold</b>')
    expect(content.innerHTML).toContain('<a href="#">Link</a>')
  })

  it('should handle complex HTML structures', () => {
    const complexHTML = `
      <div>
        <h1>Title</h1>
        <p>Paragraph with <b>bold</b> and <i>italic</i> text.</p>
        <ul>
          <li>List item 1</li>
          <li>List item 2</li>
        </ul>
        <script>alert('XSS')</script>
      </div>
    `

    render(
      <AppSafeContent
        content={complexHTML}
        sanitizationConfig={SANITIZATION_PROFILES.RICH_TEXT}
        data-testid="safe-content"
      />,
    )

    const content = screen.getByTestId('safe-content')
    expect(content.innerHTML).toContain('<h1>Title</h1>')
    expect(content.innerHTML).toContain('<p>Paragraph')
    expect(content.innerHTML).toContain('<ul>')
    expect(content.innerHTML).toContain('<li>List item')
    expect(content.innerHTML).not.toContain('<script>')
  })

  it('should work with different HTML elements', () => {
    const elements = ['div', 'span', 'article', 'section', 'p', 'h1', 'h2'] as const

    elements.forEach(element => {
      const { unmount } = render(
        <AppSafeContent content="Test content" as={element} data-testid={`content-${element}`} />,
      )

      const content = screen.getByTestId(`content-${element}`)
      expect(content.tagName).toBe(element.toUpperCase())
      unmount()
    })
  })
})
