/**
 * Story 3.1.40: EditPageSkeleton Tests
 *
 * Tests for the edit page loading skeleton component.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock @repo/app-component-library Skeleton and Card components
vi.mock('@repo/app-component-library', () => ({
  Skeleton: ({ className, ...props }: { className?: string }) => (
    <div data-testid="skeleton" className={className} {...props} />
  ),
  Card: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="card" {...props}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
}))

import { EditPageSkeleton } from '../EditPageSkeleton'

describe('EditPageSkeleton', () => {
  describe('Unit: Component renders correctly', () => {
    it('should render the skeleton container', () => {
      render(<EditPageSkeleton />)

      const skeleton = screen.getByTestId('edit-page-skeleton')
      expect(skeleton).toBeInTheDocument()
    })

    it('should render multiple skeleton placeholders', () => {
      render(<EditPageSkeleton />)

      const skeletons = screen.getAllByTestId('skeleton')
      // Should have skeletons for: back button, title, subtitle, save button,
      // form fields, and file items
      expect(skeletons.length).toBeGreaterThan(10)
    })

    it('should render card containers', () => {
      render(<EditPageSkeleton />)

      const cards = screen.getAllByTestId('card')
      // Should have at least 2 cards: form card and files card
      expect(cards.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Unit: Accessibility', () => {
    it('should have accessible container structure', () => {
      render(<EditPageSkeleton />)

      // Container should be rendered with proper structure
      const skeleton = screen.getByTestId('edit-page-skeleton')
      expect(skeleton).toHaveClass('container')
    })
  })

  describe('Unit: Skeleton layout matches edit page', () => {
    it('should render header section with back button and save button skeletons', () => {
      render(<EditPageSkeleton />)

      const skeletons = screen.getAllByTestId('skeleton')
      // First skeleton should be for the back button (10x10)
      expect(skeletons[0]).toHaveClass('h-10', 'w-10')
    })

    it('should render file item skeletons', () => {
      render(<EditPageSkeleton />)

      // Should render 3 file item skeletons by default
      const skeletons = screen.getAllByTestId('skeleton')
      const fileItemSkeletons = skeletons.filter(s =>
        s.className?.includes('h-10') && s.className?.includes('w-10') && s.className?.includes('rounded')
      )
      expect(fileItemSkeletons.length).toBeGreaterThanOrEqual(3)
    })
  })
})
