import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PerspectiveStack } from '../PerspectiveStack'
import type { StackItem } from '../__types__'

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, className, style, onClick, onKeyDown, role, tabIndex, ...rest }: any, ref: any) => (
      <div ref={ref} className={className} style={style} onClick={onClick} onKeyDown={onKeyDown} role={role} tabIndex={tabIndex} data-testid={rest['data-testid']}>
        {children}
      </div>
    )),
  },
}))

const mockItems: StackItem[] = [
  { id: 'p1', width: 200, height: 130 },
  { id: 'p2', width: 150, height: 200 },
  { id: 'p3', width: 170, height: 170 },
  { id: 'p4', width: 200, height: 130 },
]

const renderItem = (item: StackItem, index: number) => (
  <div data-testid={`item-${item.id}`}>Item {index}</div>
)

describe('PerspectiveStack', () => {
  it('renders visible items up to maxVisible', () => {
    render(<PerspectiveStack items={mockItems} renderItem={renderItem} maxVisible={2} />)

    expect(screen.getByTestId('item-p1')).toBeInTheDocument()
    expect(screen.getByTestId('item-p2')).toBeInTheDocument()
    expect(screen.queryByTestId('item-p3')).not.toBeInTheDocument()
  })

  it('defaults maxVisible to 4', () => {
    render(<PerspectiveStack items={mockItems} renderItem={renderItem} />)

    expect(screen.getByTestId('item-p1')).toBeInTheDocument()
    expect(screen.getByTestId('item-p2')).toBeInTheDocument()
    expect(screen.getByTestId('item-p3')).toBeInTheDocument()
    expect(screen.getByTestId('item-p4')).toBeInTheDocument()
  })

  it('renders the group with aria-label', () => {
    render(<PerspectiveStack items={mockItems} renderItem={renderItem} />)

    const group = screen.getByRole('group')
    expect(group).toHaveAttribute('aria-label', 'Stack of 4 items')
  })

  it('applies custom className', () => {
    render(<PerspectiveStack items={mockItems} renderItem={renderItem} className="test-class" />)

    const group = screen.getByRole('group')
    expect(group).toHaveClass('test-class')
  })

  it('calls onItemClick when an item is clicked', () => {
    const handleClick = vi.fn()
    render(
      <PerspectiveStack items={mockItems} renderItem={renderItem} onItemClick={handleClick} />,
    )

    fireEvent.click(screen.getByTestId('item-p2'))
    expect(handleClick).toHaveBeenCalledWith(mockItems[1])
  })

  it('supports keyboard activation', () => {
    const handleClick = vi.fn()
    render(
      <PerspectiveStack items={mockItems} renderItem={renderItem} onItemClick={handleClick} />,
    )

    const itemContainer = screen.getByTestId('item-p1').parentElement!
    fireEvent.keyDown(itemContainer, { key: 'Enter' })
    expect(handleClick).toHaveBeenCalledWith(mockItems[0])
  })

  it('renders without click handlers when onItemClick is not provided', () => {
    render(<PerspectiveStack items={mockItems} renderItem={renderItem} />)

    const buttons = screen.queryAllByRole('button')
    expect(buttons).toHaveLength(0)
  })

  it('handles empty items array', () => {
    render(<PerspectiveStack items={[]} renderItem={renderItem} />)

    const group = screen.getByRole('group')
    expect(group).toHaveAttribute('aria-label', 'Stack of 0 items')
    expect(group.children).toHaveLength(0)
  })
})
