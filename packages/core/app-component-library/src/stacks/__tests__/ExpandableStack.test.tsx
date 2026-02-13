import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ExpandableStack } from '../ExpandableStack'
import type { StackItem } from '../__types__'

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, className, style, onClick, ...rest }: any, ref: any) => (
      <div ref={ref} className={className} style={style} onClick={onClick} data-testid={rest['data-testid']}>
        {children}
      </div>
    )),
    button: React.forwardRef(({ children, className, style, onClick, type, ...rest }: any, ref: any) => (
      <button ref={ref} className={className} style={style} onClick={onClick} type={type} data-testid={rest['data-testid']}>
        {children}
      </button>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

const mockItems: StackItem[] = [
  { id: 'e1', width: 140, height: 190 },
  { id: 'e2', width: 190, height: 125 },
  { id: 'e3', width: 160, height: 160 },
]

const renderPreviewItem = (item: StackItem) => (
  <div data-testid={`preview-${item.id}`}>Preview {item.id}</div>
)

describe('ExpandableStack', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders children as the collapsed view', () => {
    render(
      <ExpandableStack items={mockItems} renderPreviewItem={renderPreviewItem}>
        <div data-testid="collapsed">Collapsed View</div>
      </ExpandableStack>,
    )

    expect(screen.getByTestId('collapsed')).toBeInTheDocument()
  })

  it('renders just children when enabled is false', () => {
    render(
      <ExpandableStack items={mockItems} renderPreviewItem={renderPreviewItem} enabled={false}>
        <div data-testid="collapsed">Collapsed View</div>
      </ExpandableStack>,
    )

    expect(screen.getByTestId('collapsed')).toBeInTheDocument()
    expect(screen.queryByTestId('expandable-stack')).not.toBeInTheDocument()
  })

  it('shows the grid overlay after hover delay', () => {
    render(
      <ExpandableStack items={mockItems} renderPreviewItem={renderPreviewItem} hoverDelayMs={300}>
        <div>Collapsed</div>
      </ExpandableStack>,
    )

    const wrapper = screen.getByTestId('expandable-stack')
    fireEvent.mouseEnter(wrapper)

    // Not expanded yet (delay not elapsed)
    expect(screen.queryByTestId('expandable-stack-overlay')).not.toBeInTheDocument()

    // Advance past the delay
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByTestId('expandable-stack-overlay')).toBeInTheDocument()
  })

  it('renders preview items in the grid when expanded', () => {
    render(
      <ExpandableStack items={mockItems} renderPreviewItem={renderPreviewItem} hoverDelayMs={0}>
        <div>Collapsed</div>
      </ExpandableStack>,
    )

    const wrapper = screen.getByTestId('expandable-stack')
    fireEvent.mouseEnter(wrapper)

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(screen.getByTestId('preview-e1')).toBeInTheDocument()
    expect(screen.getByTestId('preview-e2')).toBeInTheDocument()
    expect(screen.getByTestId('preview-e3')).toBeInTheDocument()
  })

  it('cancels pending hover when mouse leaves', () => {
    render(
      <ExpandableStack items={mockItems} renderPreviewItem={renderPreviewItem} hoverDelayMs={300}>
        <div>Collapsed</div>
      </ExpandableStack>,
    )

    const wrapper = screen.getByTestId('expandable-stack')

    // Mouse enter, wait 100ms (less than 300ms), then leave
    fireEvent.mouseEnter(wrapper)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    fireEvent.mouseLeave(wrapper)

    // Advance past original delay
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Should NOT have expanded
    expect(screen.queryByTestId('expandable-stack-overlay')).not.toBeInTheDocument()
  })

  it('hides the grid when mouse leaves after expansion', () => {
    render(
      <ExpandableStack items={mockItems} renderPreviewItem={renderPreviewItem} hoverDelayMs={0}>
        <div>Collapsed</div>
      </ExpandableStack>,
    )

    const wrapper = screen.getByTestId('expandable-stack')

    fireEvent.mouseEnter(wrapper)
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(screen.getByTestId('expandable-stack-overlay')).toBeInTheDocument()

    fireEvent.mouseLeave(wrapper)
    expect(screen.queryByTestId('expandable-stack-overlay')).not.toBeInTheDocument()
  })

  it('calls onItemClick when a preview item is clicked', () => {
    const handleClick = vi.fn()
    render(
      <ExpandableStack
        items={mockItems}
        renderPreviewItem={renderPreviewItem}
        onItemClick={handleClick}
        hoverDelayMs={0}
      >
        <div>Collapsed</div>
      </ExpandableStack>,
    )

    const wrapper = screen.getByTestId('expandable-stack')
    fireEvent.mouseEnter(wrapper)
    act(() => {
      vi.advanceTimersByTime(0)
    })

    // Click the button containing the preview
    const previewItem = screen.getByTestId('preview-e2')
    fireEvent.click(previewItem.closest('button')!)

    expect(handleClick).toHaveBeenCalledWith(mockItems[1])
  })

  it('applies custom className', () => {
    render(
      <ExpandableStack items={mockItems} renderPreviewItem={renderPreviewItem} className="custom">
        <div>Collapsed</div>
      </ExpandableStack>,
    )

    const wrapper = screen.getByTestId('expandable-stack')
    expect(wrapper).toHaveClass('custom')
  })
})
