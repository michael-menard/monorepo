import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { GalleryTableError } from '../components/GalleryTableError'

describe('GalleryTableError', () => {
  it('renders user-friendly error message', () => {
    const error = new Error('Network error')

    render(<GalleryTableError error={error} />)

    expect(screen.getByTestId('gallery-table-error')).toBeInTheDocument()
    expect(screen.getByTestId('gallery-table-error-title')).toHaveTextContent(
      'Failed to load items',
    )
    expect(screen.getByTestId('gallery-table-error-description')).toHaveTextContent(
      'Something went wrong while loading your wishlist. Please try again.',
    )
  })

  it('does not expose technical error details', () => {
    const error = new Error('Very technical stack trace details')

    render(<GalleryTableError error={error} />)

    expect(screen.queryByText(/Very technical stack trace details/)).toBeNull()
  })

  it('calls onRetry when Try Again button is clicked', () => {
    const error = new Error('Network error')
    const handleRetry = vi.fn()

    render(<GalleryTableError error={error} onRetry={handleRetry} />)

    const button = screen.getByTestId('gallery-table-error-retry')
    fireEvent.click(button)

    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('disables button and shows loading label while retrying', () => {
    const error = new Error('Network error')

    render(<GalleryTableError error={error} onRetry={vi.fn()} isRetrying />)

    const button = screen.getByTestId('gallery-table-error-retry')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Loading')
  })

  it('has correct ARIA attributes for screen readers', () => {
    const error = new Error('Network error')

    render(<GalleryTableError error={error} />)

    const container = screen.getByTestId('gallery-table-error')
    expect(container).toHaveAttribute('role', 'alert')
    expect(container).toHaveAttribute('aria-live', 'assertive')

    const button = screen.queryByTestId('gallery-table-error-retry')
    if (button) {
      expect(button).toHaveAttribute('aria-label', 'Try loading again')
    }
  })

  it('does not render retry button when onRetry is not provided', () => {
    const error = new Error('Network error')

    render(<GalleryTableError error={error} />)

    expect(screen.queryByTestId('gallery-table-error-retry')).toBeNull()
  })
})
