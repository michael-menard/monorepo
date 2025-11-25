import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react'
import {vi} from 'vitest'
// Import after mocks
import AlbumViewWithProps from '../AlbumViewWithProps.js'

// Mock dependencies
vi.mock('../../ImageCard/index.js', () => ({
  default: ({ title }: any) => <div data-testid={`image-card-${title}`}>{title}</div>,
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

const mockAlbum = {
  id: 'album-1',
  title: 'Test Album',
  description: 'Test Description',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  lastUpdatedAt: new Date('2024-01-02T00:00:00Z'),
  coverImageId: 'image-1',
}

const mockImages = [
  {
    id: 'image-1',
    url: 'https://example.com/image1.jpg',
    title: 'Image 1',
    description: 'Test image 1',
    author: 'Test Author',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    tags: ['test'],
  },
  {
    id: 'image-2',
    url: 'https://example.com/image2.jpg',
    title: 'Image 2',
    description: 'Test image 2',
    author: 'Test Author',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    tags: ['test'],
  },
]

describe('AlbumViewWithProps', () => {
  it('should render album title and description', () => {
    render(<AlbumViewWithProps album={mockAlbum} images={mockImages} />)

    expect(screen.getByText('Test Album')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('should render album metadata', () => {
    render(<AlbumViewWithProps album={mockAlbum} images={mockImages} />)

    expect(screen.getByText('2 images')).toBeInTheDocument()
    expect(screen.getByText(/Created/)).toBeInTheDocument()
    expect(screen.getByText(/Last updated/)).toBeInTheDocument()
  })

  it('should render images in the album', () => {
    render(<AlbumViewWithProps album={mockAlbum} images={mockImages} />)

    expect(screen.getByTestId('image-card-Image 1')).toBeInTheDocument()
    expect(screen.getByTestId('image-card-Image 2')).toBeInTheDocument()
  })

  it('should render management buttons', () => {
    const mockOnDelete = vi.fn()
    render(<AlbumViewWithProps album={mockAlbum} images={mockImages} onDelete={mockOnDelete} />)

    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('should render back button when onBack is provided', () => {
    const mockOnBack = vi.fn()
    render(<AlbumViewWithProps album={mockAlbum} images={mockImages} onBack={mockOnBack} />)

    expect(screen.getByLabelText('Go back')).toBeInTheDocument()
  })

  it('should not render back button when onBack is not provided', () => {
    render(<AlbumViewWithProps album={mockAlbum} images={mockImages} />)

    expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument()
  })

  it('should render share button when onShare is provided', () => {
    const mockOnShare = vi.fn()
    render(<AlbumViewWithProps album={mockAlbum} images={mockImages} onShare={mockOnShare} />)

    expect(screen.getByText('Share')).toBeInTheDocument()
  })

  it('should not render share button when onShare is not provided', () => {
    render(<AlbumViewWithProps album={mockAlbum} images={mockImages} />)

    expect(screen.queryByText('Share')).not.toBeInTheDocument()
  })

  it('should display empty state when album has no images', () => {
    render(<AlbumViewWithProps album={mockAlbum} images={[]} />)

    expect(screen.getByText('0 images')).toBeInTheDocument()
    expect(screen.getByText('Album is empty')).toBeInTheDocument()
    expect(screen.getByText('Add some images to this album to get started!')).toBeInTheDocument()
    expect(screen.queryByTestId(/image-card-/)).not.toBeInTheDocument()
  })

  it('should enter edit mode when edit button is clicked', () => {
    render(<AlbumViewWithProps album={mockAlbum} images={mockImages} />)

    fireEvent.click(screen.getByText('Edit'))

    expect(screen.getByDisplayValue('Test Album')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should call onEdit when save button is clicked', () => {
    const mockOnEdit = vi.fn()
    render(<AlbumViewWithProps album={mockAlbum} images={mockImages} onEdit={mockOnEdit} />)

    fireEvent.click(screen.getByText('Edit'))

    const titleInput = screen.getByDisplayValue('Test Album')
    fireEvent.change(titleInput, { target: { value: 'Updated Album Title' } })

    fireEvent.click(screen.getByText('Save'))

    expect(mockOnEdit).toHaveBeenCalledWith('album-1', {
      title: 'Updated Album Title',
      description: 'Test Description',
    })
  })

  it('should cancel edit mode when cancel button is clicked', () => {
    render(<AlbumViewWithProps album={mockAlbum} images={mockImages} />)

    fireEvent.click(screen.getByText('Edit'))

    const titleInput = screen.getByDisplayValue('Test Album')
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } })

    fireEvent.click(screen.getByText('Cancel'))

    expect(screen.getByText('Test Album')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Updated Title')).not.toBeInTheDocument()
  })

  it('should show delete confirmation when delete button is clicked', () => {
    const mockOnDelete = vi.fn()
    render(<AlbumViewWithProps album={mockAlbum} images={mockImages} onDelete={mockOnDelete} />)

    fireEvent.click(screen.getByText('Delete'))

    expect(screen.getByText('Delete Album')).toBeInTheDocument()
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should call onDelete when confirmed', () => {
    const mockOnDelete = vi.fn()
    render(<AlbumViewWithProps album={mockAlbum} images={mockImages} onDelete={mockOnDelete} />)

    fireEvent.click(screen.getByText('Delete'))
    fireEvent.click(screen.getAllByText('Delete')[1]) // Click the second Delete button (in modal)

    expect(mockOnDelete).toHaveBeenCalledWith('album-1')
  })

  it('should call onShare when share button is clicked', () => {
    const mockOnShare = vi.fn()
    render(<AlbumViewWithProps album={mockAlbum} images={mockImages} onShare={mockOnShare} />)

    fireEvent.click(screen.getByText('Share'))

    expect(mockOnShare).toHaveBeenCalledWith('album-1')
  })

  it('should call onBack when back button is clicked', () => {
    const mockOnBack = vi.fn()
    render(<AlbumViewWithProps album={mockAlbum} images={mockImages} onBack={mockOnBack} />)

    const backButton = screen.getByLabelText('Go back')
    fireEvent.click(backButton)

    expect(mockOnBack).toHaveBeenCalled()
  })

  it('should use consistent grid layout for images', () => {
    render(<AlbumViewWithProps album={mockAlbum} images={mockImages} />)

    const gridContainer = screen.getByRole('grid')
    expect(gridContainer).toHaveClass(
      'grid',
      'grid-cols-1',
      'sm:grid-cols-2',
      'md:grid-cols-3',
      'lg:grid-cols-4',
      'xl:grid-cols-5',
    )
  })
})
