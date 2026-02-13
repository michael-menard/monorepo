import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Blocks } from 'lucide-react'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
}))

import { EmptyState, EmptyDashboard } from '../empty-states'

describe('EmptyState', () => {
  const defaultProps = {
    icon: Blocks,
    title: 'No Items',
    description: 'There are no items to display.',
  }

  it('renders title and description', () => {
    render(<EmptyState {...defaultProps} />)

    expect(screen.getByText('No Items')).toBeInTheDocument()
    expect(screen.getByText('There are no items to display.')).toBeInTheDocument()
  })

  it('renders icon with aria-hidden', () => {
    const { container } = render(<EmptyState {...defaultProps} />)

    const icon = container.querySelector('[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
  })

  it('renders onClick action as Button', () => {
    const handleClick = vi.fn()
    render(
      <EmptyState
        {...defaultProps}
        action={{ label: 'Add Item', onClick: handleClick }}
      />,
    )

    const button = screen.getByRole('button', { name: 'Add Item' })
    expect(button).toBeInTheDocument()
  })

  it('renders href action as Link', () => {
    render(
      <EmptyState
        {...defaultProps}
        action={{ label: 'Go Home', href: '/home' }}
      />,
    )

    const link = screen.getByRole('link', { name: 'Go Home' })
    expect(link).toHaveAttribute('href', '/home')
  })

  it('renders no CTA when action is not provided', () => {
    render(<EmptyState {...defaultProps} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders Link when both onClick and href are provided (href takes precedence)', () => {
    const handleClick = vi.fn()
    render(
      <EmptyState
        {...defaultProps}
        action={{ label: 'Click Me', onClick: handleClick, href: '/somewhere' }}
      />,
    )

    const link = screen.getByRole('link', { name: 'Click Me' })
    expect(link).toHaveAttribute('href', '/somewhere')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders feature highlights when features prop provided', () => {
    const features = [
      { icon: Blocks, title: 'Feature 1', description: 'Description 1' },
      { icon: Blocks, title: 'Feature 2', description: 'Description 2' },
    ]

    render(<EmptyState {...defaultProps} features={features} />)

    expect(screen.getByText('Feature 1')).toBeInTheDocument()
    expect(screen.getByText('Feature 2')).toBeInTheDocument()
    expect(screen.getByText('Description 1')).toBeInTheDocument()
    expect(screen.getByText('Description 2')).toBeInTheDocument()
  })

  it('supports custom className', () => {
    const { container } = render(
      <EmptyState {...defaultProps} className="custom-class" />,
    )

    expect(container.querySelector('[data-testid="empty-state"]')).toHaveClass('custom-class')
  })

  it('feature icons are decorative (aria-hidden)', () => {
    const features = [
      { icon: Blocks, title: 'Feature 1', description: 'Description 1' },
    ]

    const { container } = render(<EmptyState {...defaultProps} features={features} />)

    const ariaHiddenIcons = container.querySelectorAll('[aria-hidden="true"]')
    // Main icon + feature icon
    expect(ariaHiddenIcons.length).toBeGreaterThanOrEqual(2)
  })
})

describe('EmptyDashboard', () => {
  it('renders welcome message', () => {
    render(<EmptyDashboard />)

    expect(screen.getByText('Welcome to LEGO MOC Instructions!')).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(<EmptyDashboard />)

    expect(
      screen.getByText(/Organize your MOC instructions, track your collection/),
    ).toBeInTheDocument()
  })

  it('renders CTA link to /instructions/new by default', () => {
    render(<EmptyDashboard />)

    const ctaLink = screen.getByRole('link', { name: 'Add Your First MOC' })
    expect(ctaLink).toHaveAttribute('href', '/instructions/new')
  })

  it('renders all 4 feature highlights', () => {
    render(<EmptyDashboard />)

    expect(screen.getByText('Organize MOCs')).toBeInTheDocument()
    expect(screen.getByText('Gallery View')).toBeInTheDocument()
    expect(screen.getByText('Wishlist')).toBeInTheDocument()
    expect(screen.getByText('Instructions')).toBeInTheDocument()
  })

  it('renders feature descriptions', () => {
    render(<EmptyDashboard />)

    expect(screen.getByText('Keep all your MOC instructions in one place')).toBeInTheDocument()
    expect(screen.getByText('Browse your collection with beautiful thumbnails')).toBeInTheDocument()
    expect(screen.getByText('Track sets and MOCs you want to build')).toBeInTheDocument()
    expect(screen.getByText('Access your PDF instructions anytime')).toBeInTheDocument()
  })

  it('uses custom addLink when provided', () => {
    render(<EmptyDashboard addLink="/custom-add" />)

    const ctaLink = screen.getByRole('link', { name: 'Add Your First MOC' })
    expect(ctaLink).toHaveAttribute('href', '/custom-add')
  })

  it('uses onAddClick when provided', () => {
    const handleClick = vi.fn()
    render(<EmptyDashboard onAddClick={handleClick} />)

    const button = screen.getByRole('button', { name: 'Add Your First MOC' })
    expect(button).toBeInTheDocument()
  })

  it('supports custom className', () => {
    const { container } = render(<EmptyDashboard className="custom-class" />)

    expect(container.querySelector('[data-testid="empty-state"]')).toHaveClass('custom-class')
  })
})
