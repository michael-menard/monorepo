/**
 * InspirationContextMenu Component Tests
 * BUGF-012: Test coverage for untested components
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InspirationContextMenu } from '../index'

describe('InspirationContextMenu', () => {
  const defaultItem = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Test Inspiration',
    sourceUrl: 'https://example.com/source',
  }

  const defaultProps = {
    item: defaultItem,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onAddToAlbum: vi.fn(),
    onLinkToMoc: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders trigger button', () => {
    render(
      <InspirationContextMenu {...defaultProps}>
        <button>Open</button>
      </InspirationContextMenu>,
    )
    expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument()
  })

  it('shows menu items when opened', async () => {
    const user = userEvent.setup()
    render(
      <InspirationContextMenu {...defaultProps}>
        <button>Open</button>
      </InspirationContextMenu>,
    )

    await user.click(screen.getByRole('button', { name: /open/i }))

    expect(screen.getByTestId('context-menu-edit')).toBeInTheDocument()
    expect(screen.getByTestId('context-menu-delete')).toBeInTheDocument()
  })

  it('calls onEdit when edit menu item clicked', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(
      <InspirationContextMenu {...defaultProps} onEdit={onEdit}>
        <button>Open</button>
      </InspirationContextMenu>,
    )

    await user.click(screen.getByRole('button', { name: /open/i }))
    await user.click(screen.getByTestId('context-menu-edit'))

    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('calls onDelete when delete menu item clicked', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(
      <InspirationContextMenu {...defaultProps} onDelete={onDelete}>
        <button>Open</button>
      </InspirationContextMenu>,
    )

    await user.click(screen.getByRole('button', { name: /open/i }))
    await user.click(screen.getByTestId('context-menu-delete'))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    render(
      <InspirationContextMenu {...defaultProps}>
        <button>Open</button>
      </InspirationContextMenu>,
    )

    const trigger = screen.getByRole('button', { name: /open/i })
    trigger.focus()

    await user.keyboard('{Enter}')
    expect(screen.getByTestId('context-menu-edit')).toBeInTheDocument()
  })
})
