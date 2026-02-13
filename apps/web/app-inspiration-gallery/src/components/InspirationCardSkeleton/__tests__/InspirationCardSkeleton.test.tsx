/**
 * InspirationCardSkeleton Component Tests
 * BUGF-012: Test coverage for untested components
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { InspirationCardSkeleton } from '../index'

describe('InspirationCardSkeleton', () => {
  it('renders skeleton card', () => {
    const { container } = render(<InspirationCardSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('has animation classes', () => {
    const { container } = render(<InspirationCardSkeleton />)
    const skeleton = container.querySelector('[class*="animate"]')
    expect(skeleton).toBeInTheDocument()
  })
})
