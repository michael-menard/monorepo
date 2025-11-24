import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MocCardSkeleton, MocCardCompactSkeleton, GalleryGridSkeleton } from '../skeleton'

describe('MocCardSkeleton', () => {
  it('renders with all elements by default', () => {
    const { container } = render(<MocCardSkeleton />)
    
    // Should have image skeleton
    expect(container.querySelector('.h-48')).toBeInTheDocument()
    
    // Should have title skeleton
    expect(container.querySelector('.h-6')).toBeInTheDocument()
    
    // Should have description skeletons
    expect(container.querySelectorAll('.h-4')).toHaveLength(5) // 2 description + 3 metadata
    
    // Should have action skeletons
    expect(container.querySelectorAll('.h-9')).toHaveLength(2)
  })

  it('hides image when showImage is false', () => {
    const { container } = render(<MocCardSkeleton showImage={false} />)
    expect(container.querySelector('.h-48')).not.toBeInTheDocument()
  })

  it('hides metadata when showMetadata is false', () => {
    const { container } = render(<MocCardSkeleton showMetadata={false} />)
    // Should have fewer h-4 elements (only description, no metadata)
    expect(container.querySelectorAll('.h-4')).toHaveLength(2)
  })

  it('hides actions when showActions is false', () => {
    const { container } = render(<MocCardSkeleton showActions={false} />)
    expect(container.querySelectorAll('.h-9')).toHaveLength(0)
  })
})

describe('MocCardCompactSkeleton', () => {
  it('renders compact layout', () => {
    const { container } = render(<MocCardCompactSkeleton />)
    
    // Should have compact image skeleton
    expect(container.querySelector('.h-16.w-16')).toBeInTheDocument()
    
    // Should have flex layout
    expect(container.querySelector('.flex.items-center')).toBeInTheDocument()
  })
})

describe('GalleryGridSkeleton', () => {
  it('renders default number of skeletons', () => {
    const { container } = render(<GalleryGridSkeleton />)
    
    // Should render 12 skeletons by default
    expect(container.querySelectorAll('.space-y-3')).toHaveLength(12)
  })

  it('renders custom number of skeletons', () => {
    const { container } = render(<GalleryGridSkeleton count={6} />)
    
    // Should render 6 skeletons
    expect(container.querySelectorAll('.space-y-3')).toHaveLength(6)
  })

  it('applies grid layout classes', () => {
    const { container } = render(<GalleryGridSkeleton />)
    
    // Should have grid layout classes
    const gridContainer = container.firstChild
    expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4', 'gap-6')
  })
})
