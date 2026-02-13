import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CardFan } from '../CardFan'
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
  { id: 'f1', width: 150, height: 100 },
  { id: 'f2', width: 120, height: 165 },
  { id: 'f3', width: 140, height: 140 },
  { id: 'f4', width: 150, height: 100 },
  { id: 'f5', width: 120, height: 165 },
]

const renderItem = (item: StackItem, index: number) => (
  <div data-testid={`item-${item.id}`}>Item {index}</div>
)

describe('CardFan', () => {
  it('renders visible items up to maxVisible', () => {
    render(<CardFan items={mockItems} renderItem={renderItem} maxVisible={3} />)

    expect(screen.getByTestId('item-f1')).toBeInTheDocument()
    expect(screen.getByTestId('item-f2')).toBeInTheDocument()
    expect(screen.getByTestId('item-f3')).toBeInTheDocument()
    expect(screen.queryByTestId('item-f4')).not.toBeInTheDocument()
  })

  it('defaults maxVisible to 4', () => {
    render(<CardFan items={mockItems} renderItem={renderItem} />)

    expect(screen.getByTestId('item-f1')).toBeInTheDocument()
    expect(screen.getByTestId('item-f2')).toBeInTheDocument()
    expect(screen.getByTestId('item-f3')).toBeInTheDocument()
    expect(screen.getByTestId('item-f4')).toBeInTheDocument()
    expect(screen.queryByTestId('item-f5')).not.toBeInTheDocument()
  })

  it('renders the group with aria-label', () => {
    render(<CardFan items={mockItems} renderItem={renderItem} />)

    const group = screen.getByRole('group')
    expect(group).toHaveAttribute('aria-label', 'Fan of 5 items')
  })

  it('applies custom className', () => {
    render(<CardFan items={mockItems} renderItem={renderItem} className="fan-class" />)

    const group = screen.getByRole('group')
    expect(group).toHaveClass('fan-class')
  })

  it('calls onItemClick when an item is clicked', () => {
    const handleClick = vi.fn()
    render(<CardFan items={mockItems} renderItem={renderItem} onItemClick={handleClick} />)

    fireEvent.click(screen.getByTestId('item-f3'))
    expect(handleClick).toHaveBeenCalledWith(mockItems[2])
  })

  it('supports keyboard activation', () => {
    const handleClick = vi.fn()
    render(<CardFan items={mockItems} renderItem={renderItem} onItemClick={handleClick} />)

    const itemContainer = screen.getByTestId('item-f1').parentElement!
    fireEvent.keyDown(itemContainer, { key: ' ' })
    expect(handleClick).toHaveBeenCalledWith(mockItems[0])
  })

  it('renders nothing when items array is empty', () => {
    const { container } = render(<CardFan items={[]} renderItem={renderItem} />)

    expect(container.innerHTML).toBe('')
  })

  it('handles a single item without division by zero', () => {
    const singleItem = [mockItems[0]]
    render(<CardFan items={singleItem} renderItem={renderItem} maxVisible={4} />)

    expect(screen.getByTestId('item-f1')).toBeInTheDocument()
    const group = screen.getByRole('group')
    expect(group).toHaveAttribute('aria-label', 'Fan of 1 items')
  })
})
