import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { OrganicPile } from '../OrganicPile'
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
  { id: 'a', width: 140, height: 190 },
  { id: 'b', width: 190, height: 125 },
  { id: 'c', width: 160, height: 160 },
  { id: 'd', width: 190, height: 125 },
  { id: 'e', width: 120, height: 100 },
]

const renderItem = (item: StackItem, index: number) => (
  <div data-testid={`item-${item.id}`}>Item {index}</div>
)

describe('OrganicPile', () => {
  it('renders visible items up to maxVisible', () => {
    render(<OrganicPile items={mockItems} renderItem={renderItem} maxVisible={3} />)

    expect(screen.getByTestId('item-a')).toBeInTheDocument()
    expect(screen.getByTestId('item-b')).toBeInTheDocument()
    expect(screen.getByTestId('item-c')).toBeInTheDocument()
    expect(screen.queryByTestId('item-d')).not.toBeInTheDocument()
    expect(screen.queryByTestId('item-e')).not.toBeInTheDocument()
  })

  it('defaults maxVisible to 4', () => {
    render(<OrganicPile items={mockItems} renderItem={renderItem} />)

    expect(screen.getByTestId('item-a')).toBeInTheDocument()
    expect(screen.getByTestId('item-b')).toBeInTheDocument()
    expect(screen.getByTestId('item-c')).toBeInTheDocument()
    expect(screen.getByTestId('item-d')).toBeInTheDocument()
    expect(screen.queryByTestId('item-e')).not.toBeInTheDocument()
  })

  it('renders all items when fewer than maxVisible', () => {
    const twoItems = mockItems.slice(0, 2)
    render(<OrganicPile items={twoItems} renderItem={renderItem} maxVisible={4} />)

    expect(screen.getByTestId('item-a')).toBeInTheDocument()
    expect(screen.getByTestId('item-b')).toBeInTheDocument()
  })

  it('renders empty state when no items', () => {
    render(<OrganicPile items={[]} renderItem={renderItem} />)

    const group = screen.getByRole('group')
    expect(group).toHaveAttribute('aria-label', 'Stack of 0 items')
  })

  it('applies custom className', () => {
    render(<OrganicPile items={mockItems} renderItem={renderItem} className="custom-class" />)

    const group = screen.getByRole('group')
    expect(group).toHaveClass('custom-class')
  })

  it('calls onItemClick when an item is clicked', () => {
    const handleClick = vi.fn()
    render(<OrganicPile items={mockItems} renderItem={renderItem} onItemClick={handleClick} />)

    fireEvent.click(screen.getByTestId('item-b'))
    expect(handleClick).toHaveBeenCalledWith(mockItems[1])
  })

  it('supports keyboard activation with Enter', () => {
    const handleClick = vi.fn()
    render(<OrganicPile items={mockItems} renderItem={renderItem} onItemClick={handleClick} />)

    const itemContainer = screen.getByTestId('item-a').parentElement!
    fireEvent.keyDown(itemContainer, { key: 'Enter' })
    expect(handleClick).toHaveBeenCalledWith(mockItems[0])
  })

  it('supports keyboard activation with Space', () => {
    const handleClick = vi.fn()
    render(<OrganicPile items={mockItems} renderItem={renderItem} onItemClick={handleClick} />)

    const itemContainer = screen.getByTestId('item-a').parentElement!
    fireEvent.keyDown(itemContainer, { key: ' ' })
    expect(handleClick).toHaveBeenCalledWith(mockItems[0])
  })

  it('does not render button role when onItemClick is not provided', () => {
    render(<OrganicPile items={mockItems} renderItem={renderItem} />)

    const buttons = screen.queryAllByRole('button')
    expect(buttons).toHaveLength(0)
  })

  it('renders consistent layout across re-renders (deterministic randomness)', () => {
    const { rerender } = render(
      <OrganicPile items={mockItems} renderItem={renderItem} />,
    )

    const firstRender = screen.getByRole('group').innerHTML

    rerender(<OrganicPile items={mockItems} renderItem={renderItem} />)

    const secondRender = screen.getByRole('group').innerHTML
    expect(firstRender).toBe(secondRender)
  })
})
