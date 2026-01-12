import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteConfirmationModal } from '..'

describe('DeleteConfirmationModal', () => {
  it('renders item title in message', () => {
    render(
      <DeleteConfirmationModal
        open
        onOpenChange={vi.fn()}
        itemTitle="Test Item"
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByText(/remove test item from your wishlist/i)).toBeInTheDocument()
  })

  it('calls onConfirm when remove is clicked', () => {
    const onConfirm = vi.fn()

    render(
      <DeleteConfirmationModal
        open
        onOpenChange={vi.fn()}
        itemTitle="Test Item"
        onConfirm={onConfirm}
      />,
    )

    const removeButton = screen.getByRole('button', { name: /remove/i })
    fireEvent.click(removeButton)

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('shows loading state when isDeleting is true', () => {
    render(
      <DeleteConfirmationModal
        open
        onOpenChange={vi.fn()}
        itemTitle="Test Item"
        onConfirm={vi.fn()}
        isDeleting
      />,
    )

    expect(screen.getByText(/removing/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /removing/i })).toBeDisabled()
  })
})
