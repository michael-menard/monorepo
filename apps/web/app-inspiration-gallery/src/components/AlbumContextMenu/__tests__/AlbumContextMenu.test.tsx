/**
 * AlbumContextMenu Component Tests
 * BUGF-012: Test coverage for untested components
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlbumContextMenu } from '../index'

describe('AlbumContextMenu', () => {
  const defaultItem = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Test Album',
  }

  const defaultProps = {
    item: defaultItem,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders trigger button', () => {
    render(
      <AlbumContextMenu {...defaultProps}>
        <button>Open</button>
      </AlbumContextMenu>,
    )
    expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument()
  })

  it('shows menu items when opened', async () => {
    const user = userEvent.setup()
    render(
      <AlbumContextMenu {...defaultProps}>
        <button>Open</button>
      </AlbumContextMenu>,
    )

    await user.click(screen.getByRole('button', { name: /open/i }))

    expect(screen.getByTestId('album-context-edit')).toBeInTheDocument()
    expect(screen.getByTestId('album-context-delete')).toBeInTheDocument()
  })

  it('calls onEdit when edit menu item clicked', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(
      <AlbumContextMenu {...defaultProps} onEdit={onEdit}>
        <button>Open</button>
      </AlbumContextMenu>,
    )

    await user.click(screen.getByRole('button', { name: /open/i }))
    await user.click(screen.getByTestId('album-context-edit'))

    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('calls onDelete when delete menu item clicked', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(
      <AlbumContextMenu {...defaultProps} onDelete={onDelete}>
        <button>Open</button>
      </AlbumContextMenu>,
    )

    await user.click(screen.getByRole('button', { name: /open/i }))
    await user.click(screen.getByTestId('album-context-delete'))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    render(
      <AlbumContextMenu {...defaultProps}>
        <button>Open</button>
      </AlbumContextMenu>,
    )

    const trigger = screen.getByRole('button', { name: /open/i })
    trigger.focus()

    await user.keyboard('{Enter}')
    expect(screen.getByTestId('album-context-edit')).toBeInTheDocument()
  })
})
