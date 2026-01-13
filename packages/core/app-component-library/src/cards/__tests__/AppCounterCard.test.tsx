import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AppCounterCard } from '../AppCounterCard'

describe('AppCounterCard', () => {
  it('renders title, value, and fraction correctly', () => {
    render(<AppCounterCard title="Built Sets" total={10} value={3} />)

    expect(screen.getByText('Built Sets')).toBeInTheDocument()
    expect(screen.getByText('3 / 10')).toBeInTheDocument()
  })

  it('calls onChange with incremented and decremented values within bounds', () => {
    const handleChange = vi.fn()
    render(<AppCounterCard title="Built Sets" total={5} value={2} onChange={handleChange} />)

    const incButton = screen.getByRole('button', { name: /increase count/i })
    const decButton = screen.getByRole('button', { name: /decrease count/i })

    fireEvent.click(incButton)
    fireEvent.click(decButton)

    expect(handleChange).toHaveBeenCalledWith(3)
    expect(handleChange).toHaveBeenCalledWith(1)
  })

  it('does not exceed min and max bounds', () => {
    const handleChange = vi.fn()
    render(<AppCounterCard title="Built Sets" total={3} value={3} min={0} max={3} onChange={handleChange} />)

    const incButton = screen.getByRole('button', { name: /increase count/i })
    const decButton = screen.getByRole('button', { name: /decrease count/i })

    // At max, increment should be disabled
    expect(incButton).toBeDisabled()

    // Click decrement down to min (component is controlled; parent must update value
    // for further bounds enforcement, so we only assert emitted values here)
    fireEvent.click(decButton)
    fireEvent.click(decButton)
    fireEvent.click(decButton)

    // Should emit decremented values from starting 3
    expect(handleChange).toHaveBeenNthCalledWith(1, 2)
    expect(handleChange).toHaveBeenNthCalledWith(2, 2)
    expect(handleChange).toHaveBeenNthCalledWith(3, 2)
  })

  it('hides controls when disableControls is true', () => {
    render(<AppCounterCard title="Built Sets" total={10} value={3} disableControls />)

    expect(screen.queryByRole('button', { name: /increase count/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /decrease count/i })).not.toBeInTheDocument()
  })

  it('applies aria attributes for accessibility', () => {
    render(<AppCounterCard title="Built Sets" total={10} value={3} />)

    const region = screen.getByRole('region', { name: 'Built Sets' })
    expect(region).toBeInTheDocument()

    const liveRegion = region.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
  })
})
