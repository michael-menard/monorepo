import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StarRatingInput } from '../StarRatingInput'

describe('StarRatingInput', () => {
  it('renders label and 5 stars', () => {
    render(<StarRatingInput label="Test Rating" value={0} onChange={vi.fn()} />)
    expect(screen.getByText('Test Rating')).toBeTruthy()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('calls onChange when a star is clicked', () => {
    const onChange = vi.fn()
    render(<StarRatingInput label="Rating" value={0} onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: '3 stars' }))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('clears rating when same star is clicked', () => {
    const onChange = vi.fn()
    render(<StarRatingInput label="Rating" value={3} onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: '3 stars' }))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('shows current value when set', () => {
    render(<StarRatingInput label="Rating" value={4} onChange={vi.fn()} />)
    expect(screen.getByText('4/5')).toBeTruthy()
  })

  it('does not show value when 0', () => {
    render(<StarRatingInput label="Rating" value={0} onChange={vi.fn()} />)
    expect(screen.queryByText('0/5')).toBeNull()
  })
})
