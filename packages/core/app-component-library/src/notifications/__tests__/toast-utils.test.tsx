import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// We mock sonner so we can capture the CustomToast render function
const customMock = vi.fn()
const dismissMock = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    custom: customMock,
    dismiss: dismissMock,
  },
}))

// Import after mocking sonner so toast.custom is our mock
import { showSuccessToast } from '../toast-utils'

describe('CustomToast via showSuccessToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders both primary and secondary actions and calls their handlers', () => {
    const primaryHandler = vi.fn()
    const secondaryHandler = vi.fn()

    showSuccessToast(
      'Added to your collection!',
      'View it in your Sets gallery.',
      5000,
      { label: 'Undo', onClick: primaryHandler },
      { label: 'View in Sets', onClick: secondaryHandler },
    )

    expect(customMock).toHaveBeenCalledTimes(1)

    const renderFn = customMock.mock.calls[0][0] as (t: string) => React.ReactElement

    // Render the toast component returned by the render function
    render(<>{renderFn('toast-id')}</>)

    const undoButton = screen.getByRole('button', { name: /undo/i })
    const viewInSetsButton = screen.getByRole('button', { name: /view in sets/i })

    // Click Undo
    fireEvent.click(undoButton)
    expect(primaryHandler).toHaveBeenCalledTimes(1)
    expect(dismissMock).toHaveBeenCalledTimes(1)

    // Click View in Sets
    fireEvent.click(viewInSetsButton)
    expect(secondaryHandler).toHaveBeenCalledTimes(1)
    expect(dismissMock).toHaveBeenCalledTimes(2)
  })
})
