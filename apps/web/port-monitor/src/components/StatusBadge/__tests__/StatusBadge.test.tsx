import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../index'

describe('StatusBadge', () => {
  it('renders healthy status', () => {
    render(<StatusBadge status="healthy" />)
    expect(screen.getByText('healthy')).toBeInTheDocument()
  })

  it('renders unhealthy status', () => {
    render(<StatusBadge status="unhealthy" />)
    expect(screen.getByText('unhealthy')).toBeInTheDocument()
  })

  it('renders unknown status', () => {
    render(<StatusBadge status="unknown" />)
    expect(screen.getByText('unknown')).toBeInTheDocument()
  })
})
