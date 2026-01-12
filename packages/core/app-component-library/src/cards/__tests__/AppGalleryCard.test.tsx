import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AppGalleryCard } from '../AppGalleryCard'

// Basic smoke tests to ensure AppGalleryCard is a thin, working wrapper
// over the shared @repo/gallery GalleryCard component.

describe('AppGalleryCard', () => {
  const baseProps = {
    image: {
      src: 'https://example.com/image.jpg',
      alt: 'Example image',
      aspectRatio: '4/3' as const,
    },
    title: 'Test Card Title',
    subtitle: 'Test subtitle',
  }

  it('renders title and subtitle', () => {
    render(<AppGalleryCard {...baseProps} data-testid="app-gallery-card" />)

    const card = screen.getByTestId('app-gallery-card')
    expect(card).toBeInTheDocument()
    expect(screen.getByTestId('app-gallery-card-title')).toHaveTextContent('Test Card Title')
    expect(screen.getByTestId('app-gallery-card-subtitle')).toHaveTextContent('Test subtitle')
  })

  it('renders image with provided src and alt', () => {
    render(<AppGalleryCard {...baseProps} data-testid="app-gallery-card" />)

    const img = screen.getByTestId('app-gallery-card-image') as HTMLImageElement
    expect(img).toBeInTheDocument()
    expect(img.src).toContain(baseProps.image.src)
    expect(img.alt).toBe(baseProps.image.alt)
  })

  it('forwards onClick handler to underlying card', () => {
    const handleClick = vi.fn()
    render(
      <AppGalleryCard
        {...baseProps}
        data-testid="app-gallery-card"
        onClick={handleClick}
      />,
    )

    const card = screen.getByTestId('app-gallery-card')
    fireEvent.click(card)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    render(
      <AppGalleryCard
        {...baseProps}
        data-testid="app-gallery-card"
        className="custom-class"
      />,
    )

    const card = screen.getByTestId('app-gallery-card')
    expect(card.className).toContain('custom-class')
  })
})
