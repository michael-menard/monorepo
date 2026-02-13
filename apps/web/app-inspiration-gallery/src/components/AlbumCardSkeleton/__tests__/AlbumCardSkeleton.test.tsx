/**
 * AlbumCardSkeleton Component Tests
 * BUGF-012: Test coverage for untested components
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AlbumCardSkeleton } from '../index'

describe('AlbumCardSkeleton', () => {
  it('renders skeleton card', () => {
    const { container } = render(<AlbumCardSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('has animation classes', () => {
    const { container } = render(<AlbumCardSkeleton />)
    const skeleton = container.querySelector('[class*="animate"]')
    expect(skeleton).toBeInTheDocument()
  })
})
