/**
 * GalleryLoadingSkeleton Component Tests
 * BUGF-012: Test coverage for untested components
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GalleryLoadingSkeleton } from '../index'

describe('GalleryLoadingSkeleton', () => {
  it('renders default number of skeletons', () => {
    const { container } = render(<GalleryLoadingSkeleton />)
    const skeletons = container.querySelectorAll('[aria-hidden="true"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders specified count of skeletons', () => {
    const { container } = render(<GalleryLoadingSkeleton count={5} />)
    const skeletons = container.querySelectorAll('[aria-hidden="true"]')
    expect(skeletons.length).toBe(5)
  })

  it('has accessible loading label', () => {
    const { container } = render(<GalleryLoadingSkeleton />)
    const loadingEl = container.querySelector('[aria-label*="Loading"]')
    expect(loadingEl).toBeInTheDocument()
  })
})
