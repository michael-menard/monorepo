import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import {
  FormErrorMessage,
  EnhancedFormMessage,
  FieldErrorMessage,
  FormLevelErrorMessage,
  type ErrorMessageType,
} from '../form-error-message'

describe('FormErrorMessage', () => {
  it('renders error message with default styling', () => {
    render(<FormErrorMessage message="This is an error message" />)

    expect(screen.getByText('This is an error message')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders with different error types', () => {
    const errorTypes: ErrorMessageType[] = ['error', 'warning', 'info', 'success']

    errorTypes.forEach(type => {
      const { unmount } = render(<FormErrorMessage message={`${type} message`} type={type} />)

      expect(screen.getByText(`${type} message`)).toBeInTheDocument()
      expect(screen.getByRole(type === 'error' ? 'alert' : 'status')).toBeInTheDocument()

      unmount()
    })
  })

  it('renders with field name', () => {
    render(<FormErrorMessage message="Invalid input" fieldName="Email" />)

    expect(screen.getByText('Email:')).toBeInTheDocument()
    expect(screen.getByText('Invalid input')).toBeInTheDocument()
  })

  it('renders with icon by default', () => {
    render(<FormErrorMessage message="Error message" />)

    // Check that icon is present (aria-hidden="true")
    expect(screen.getByRole('alert')).toBeInTheDocument()
    const icon = screen.getByRole('alert').querySelector('[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
  })

  it('renders without icon when showIcon is false', () => {
    render(<FormErrorMessage message="Error message" showIcon={false} />)

    const icon = screen.getByRole('alert').querySelector('[aria-hidden="true"]')
    expect(icon).not.toBeInTheDocument()
  })

  it('renders close button when showCloseButton is true', () => {
    const onClose = vi.fn()
    render(<FormErrorMessage message="Error message" showCloseButton={true} onClose={onClose} />)

    const closeButton = screen.getByLabelText('Close message')
    expect(closeButton).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<FormErrorMessage message="Error message" showCloseButton={true} onClose={onClose} />)

    const closeButton = screen.getByLabelText('Close message')
    closeButton.click()

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders children instead of message when provided', () => {
    render(
      <FormErrorMessage>
        <span data-testid="custom-error">Custom error content</span>
      </FormErrorMessage>,
    )

    expect(screen.getByTestId('custom-error')).toBeInTheDocument()
    expect(screen.getByText('Custom error content')).toBeInTheDocument()
  })

  it('does not render when no message or children provided', () => {
    const { container } = render(<FormErrorMessage />)

    expect(container.firstChild).toBeNull()
  })

  it('applies custom className', () => {
    render(<FormErrorMessage message="Error message" className="custom-class" />)

    const errorElement = screen.getByRole('alert')
    expect(errorElement).toHaveClass('custom-class')
  })
})

describe('EnhancedFormMessage', () => {
  it('renders error message from error prop', () => {
    const error = { message: 'Field error message' }
    render(<EnhancedFormMessage error={error} />)

    expect(screen.getByText('Field error message')).toBeInTheDocument()
  })

  it('renders message prop when error is not provided', () => {
    render(<EnhancedFormMessage message="Direct message" />)

    expect(screen.getByText('Direct message')).toBeInTheDocument()
  })

  it('prioritizes error.message over message prop', () => {
    const error = { message: 'Error message' }
    render(<EnhancedFormMessage error={error} message="Direct message" />)

    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.queryByText('Direct message')).not.toBeInTheDocument()
  })

  it('does not render when no error or message provided', () => {
    const { container } = render(<EnhancedFormMessage />)

    expect(container.firstChild).toBeNull()
  })
})

describe('FieldErrorMessage', () => {
  it('renders field error with field name', () => {
    const error = { message: 'Invalid input' }
    render(<FieldErrorMessage error={error} fieldName="Email" />)

    expect(screen.getByText('Email:')).toBeInTheDocument()
    expect(screen.getByText('Invalid input')).toBeInTheDocument()
  })

  it('renders without field name when not provided', () => {
    const error = { message: 'Invalid input' }
    render(<FieldErrorMessage error={error} />)

    expect(screen.getByText('Invalid input')).toBeInTheDocument()
  })

  it('renders message prop when error is not provided', () => {
    render(<FieldErrorMessage message="Direct message" fieldName="Email" />)

    expect(screen.getByText('Email:')).toBeInTheDocument()
    expect(screen.getByText('Direct message')).toBeInTheDocument()
  })

  it('applies field-specific styling', () => {
    const error = { message: 'Invalid input' }
    render(<FieldErrorMessage error={error} fieldName="Email" />)

    const errorElement = screen.getByRole('alert')
    expect(errorElement).toHaveClass('mt-1')
  })
})

describe('FormLevelErrorMessage', () => {
  it('renders string error', () => {
    render(<FormLevelErrorMessage error="Form error message" />)

    expect(screen.getByText('Form error message')).toBeInTheDocument()
  })

  it('renders error object with message', () => {
    const error = { message: 'Form error message' }
    render(<FormLevelErrorMessage error={error} />)

    expect(screen.getByText('Form error message')).toBeInTheDocument()
  })

  it('renders message prop when error is not provided', () => {
    render(<FormLevelErrorMessage message="Direct message" />)

    expect(screen.getByText('Direct message')).toBeInTheDocument()
  })

  it('prioritizes error over message prop', () => {
    const error = { message: 'Error message' }
    render(<FormLevelErrorMessage error={error} message="Direct message" />)

    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.queryByText('Direct message')).not.toBeInTheDocument()
  })

  it('renders with close button by default', () => {
    const onClose = vi.fn()
    render(<FormLevelErrorMessage error="Form error" onClose={onClose} />)

    expect(screen.getByLabelText('Close message')).toBeInTheDocument()
  })

  it('applies form-level styling', () => {
    render(<FormLevelErrorMessage error="Form error" />)

    const errorElement = screen.getByRole('alert')
    expect(errorElement).toHaveClass('mb-4')
  })
})

describe('Accessibility', () => {
  it('provides proper ARIA attributes for error messages', () => {
    render(<FormErrorMessage message="Error message" type="error" />)

    const errorElement = screen.getByRole('alert')
    expect(errorElement).toHaveAttribute('aria-live', 'assertive')
  })

  it('provides proper ARIA attributes for non-error messages', () => {
    render(<FormErrorMessage message="Info message" type="info" />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveAttribute('aria-live', 'polite')
  })

  it('provides proper ARIA attributes for close button', () => {
    const onClose = vi.fn()
    render(<FormLevelErrorMessage error="Form error" onClose={onClose} />)

    const closeButton = screen.getByLabelText('Close message')
    expect(closeButton).toHaveAttribute('aria-label', 'Close message')
  })

  it('marks icons as decorative', () => {
    render(<FormErrorMessage message="Error message" />)

    const icon = screen.getByRole('alert').querySelector('[aria-hidden="true"]')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
})
