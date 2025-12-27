/**
 * EmptyDashboard Component Tests
 * Story 2.8: Dashboard Empty State
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyDashboard } from '../index'

describe('EmptyDashboard', () => {
  it('renders welcome heading', () => {
    render(<EmptyDashboard />)
    expect(screen.getByText('Welcome to LEGO MOC Instructions!')).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(<EmptyDashboard />)
    expect(
      screen.getByText(/Organize your MOC instructions, track your collection/i)
    ).toBeInTheDocument()
  })

  it('renders primary CTA button with correct text', () => {
    render(<EmptyDashboard />)
    const button = screen.getByRole('link', { name: /Add Your First MOC/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('href', '/instructions/new')
  })

  it('renders secondary CTA button with correct text', () => {
    render(<EmptyDashboard />)
    const button = screen.getByRole('link', { name: /Browse Gallery/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('href', '/instructions')
  })

  it('renders LEGO blocks icon', () => {
    const { container } = render(<EmptyDashboard />)
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const { container } = render(<EmptyDashboard className="custom-class" />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('custom-class')
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(<EmptyDashboard />)
    const icons = container.querySelectorAll('svg')
    icons.forEach(icon => {
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  it('displays content in vertical layout', () => {
    const { container } = render(<EmptyDashboard />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('flex-col')
    expect(wrapper).toHaveClass('items-center')
  })
})
