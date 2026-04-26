import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GalleryCard } from '../GalleryCard'

const IMAGES = [
  { id: 'img-1', url: 'https://example.com/img1.jpg' },
  { id: 'img-2', url: 'https://example.com/img2.jpg' },
  { id: 'img-3', url: 'https://example.com/img3.jpg' },
]

describe('GalleryCard', () => {
  it('renders gallery images', () => {
    render(<GalleryCard galleryImages={IMAGES} />)
    expect(screen.getByText('Gallery')).toBeInTheDocument()
    expect(screen.getAllByAltText(/Gallery image \d+/)).toHaveLength(3)
  })

  it('shows empty state when no images', () => {
    render(<GalleryCard galleryImages={[]} />)
    expect(screen.getByText('No gallery images linked yet.')).toBeInTheDocument()
  })

  it('opens lightbox on image click and shows navigation arrows', () => {
    render(<GalleryCard galleryImages={IMAGES} />)
    fireEvent.click(screen.getByAltText('Gallery image 1'))
    expect(screen.getByText('Gallery image 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous image' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next image' })).toBeInTheDocument()
  })

  it('navigates forward with next button', () => {
    render(<GalleryCard galleryImages={IMAGES} />)
    fireEvent.click(screen.getByAltText('Gallery image 1'))
    expect(screen.getByText('Gallery image 1 of 3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next image' }))
    expect(screen.getByText('Gallery image 2 of 3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next image' }))
    expect(screen.getByText('Gallery image 3 of 3')).toBeInTheDocument()
  })

  it('wraps around when navigating past the last image', () => {
    render(<GalleryCard galleryImages={IMAGES} />)
    fireEvent.click(screen.getByAltText('Gallery image 3'))
    expect(screen.getByText('Gallery image 3 of 3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next image' }))
    expect(screen.getByText('Gallery image 1 of 3')).toBeInTheDocument()
  })

  it('wraps around when navigating before the first image', () => {
    render(<GalleryCard galleryImages={IMAGES} />)
    fireEvent.click(screen.getByAltText('Gallery image 1'))

    fireEvent.click(screen.getByRole('button', { name: 'Previous image' }))
    expect(screen.getByText('Gallery image 3 of 3')).toBeInTheDocument()
  })

  it('navigates with arrow keys', async () => {
    const user = userEvent.setup()
    render(<GalleryCard galleryImages={IMAGES} />)
    fireEvent.click(screen.getByAltText('Gallery image 1'))
    expect(screen.getByText('Gallery image 1 of 3')).toBeInTheDocument()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('Gallery image 2 of 3')).toBeInTheDocument()

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText('Gallery image 1 of 3')).toBeInTheDocument()
  })

  it('does not show navigation arrows for a single image', () => {
    render(<GalleryCard galleryImages={[IMAGES[0]]} />)
    fireEvent.click(screen.getByAltText('Gallery image 1'))
    expect(screen.getByText('Gallery image 1 of 1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous image' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument()
  })
})
