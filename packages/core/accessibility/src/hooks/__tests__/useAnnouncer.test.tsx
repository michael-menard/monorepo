/**
 * Tests for useAnnouncer Hook
 *
 * Story REPA-008: Consolidate keyboard navigation hooks
 */

import { renderHook, act } from '@testing-library/react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAnnouncer, Announcer } from '../useAnnouncer'

describe('useAnnouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial empty announcement', () => {
    const { result } = renderHook(() => useAnnouncer())

    expect(result.current.announcement).toBe('')
    expect(result.current.priority).toBe('polite')
  })

  it('should announce a message', async () => {
    const { result } = renderHook(() => useAnnouncer())

    act(() => {
      result.current.announce('Test message')
    })

    // Wait for RAF to process
    await act(async () => {
      vi.advanceTimersByTime(16) // One animation frame
    })

    expect(result.current.announcement).toBe('Test message')
  })

  it('should use polite priority by default', async () => {
    const { result } = renderHook(() => useAnnouncer())

    act(() => {
      result.current.announce('Polite message')
    })

    await act(async () => {
      vi.advanceTimersByTime(16)
    })

    expect(result.current.priority).toBe('polite')
  })

  it('should support assertive priority', async () => {
    const { result } = renderHook(() => useAnnouncer())

    act(() => {
      result.current.announce('Urgent message', 'assertive')
    })

    await act(async () => {
      vi.advanceTimersByTime(16)
    })

    expect(result.current.priority).toBe('assertive')
  })

  it('should clear announcement after delay', async () => {
    const { result } = renderHook(() => useAnnouncer({ clearDelay: 100 }))

    act(() => {
      result.current.announce('Temporary message')
    })

    await act(async () => {
      vi.advanceTimersByTime(16) // RAF
    })

    expect(result.current.announcement).toBe('Temporary message')

    await act(async () => {
      vi.advanceTimersByTime(100) // Clear delay
    })

    expect(result.current.announcement).toBe('')
  })

  it('should allow clearing announcement manually', async () => {
    const { result } = renderHook(() => useAnnouncer({ clearDelay: 5000 }))

    act(() => {
      result.current.announce('Message to clear')
    })

    await act(async () => {
      vi.advanceTimersByTime(16)
    })

    expect(result.current.announcement).toBe('Message to clear')

    act(() => {
      result.current.clearAnnouncement()
    })

    expect(result.current.announcement).toBe('')
  })

  it('should handle custom default priority', async () => {
    const { result } = renderHook(() => useAnnouncer({ defaultPriority: 'assertive' }))

    act(() => {
      result.current.announce('Default assertive')
    })

    await act(async () => {
      vi.advanceTimersByTime(16)
    })

    expect(result.current.priority).toBe('assertive')
  })
})

describe('Announcer Component', () => {
  it('should render with aria-live region', () => {
    render(<Announcer announcement="Hello" />)

    const element = screen.getByTestId('screen-reader-announcer')
    expect(element).toHaveAttribute('role', 'status')
    expect(element).toHaveAttribute('aria-live', 'polite')
    expect(element).toHaveAttribute('aria-atomic', 'true')
  })

  it('should display announcement text', () => {
    render(<Announcer announcement="Test announcement" />)

    const element = screen.getByTestId('screen-reader-announcer')
    expect(element).toHaveTextContent('Test announcement')
  })

  it('should use assertive priority when specified', () => {
    render(<Announcer announcement="Urgent" priority="assertive" />)

    const element = screen.getByTestId('screen-reader-announcer')
    expect(element).toHaveAttribute('aria-live', 'assertive')
  })

  it('should have sr-only class by default for visual hiding', () => {
    render(<Announcer announcement="Hidden" />)

    const element = screen.getByTestId('screen-reader-announcer')
    expect(element).toHaveClass('sr-only')
  })

  it('should support custom className', () => {
    render(<Announcer announcement="Custom" className="custom-class" />)

    const element = screen.getByTestId('screen-reader-announcer')
    expect(element).toHaveClass('custom-class')
    expect(element).not.toHaveClass('sr-only')
  })

  it('should render empty when no announcement', () => {
    render(<Announcer announcement="" />)

    const element = screen.getByTestId('screen-reader-announcer')
    expect(element).toHaveTextContent('')
  })
})
