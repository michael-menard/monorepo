import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SwitchField } from '../SwitchField'

describe('SwitchField', () => {
  it('renders label', () => {
    render(<SwitchField label="Test Switch" checked={false} onChange={vi.fn()} />)
    expect(screen.getByText('Test Switch')).toBeTruthy()
  })

  it('renders switch with correct aria-checked', () => {
    render(<SwitchField label="Test" checked={true} onChange={vi.fn()} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onChange when clicked', () => {
    const onChange = vi.fn()
    render(<SwitchField label="Test" checked={false} onChange={onChange} />)

    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('toggles from true to false', () => {
    const onChange = vi.fn()
    render(<SwitchField label="Test" checked={true} onChange={onChange} />)

    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(false)
  })
})
