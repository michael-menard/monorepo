import React from 'react'
import {render, screen} from '@testing-library/react'
import {vi} from 'vitest'
// Import after mocks
import AlbumView from '../index.js'

// Mock all dependencies
vi.mock('../../../store/albumsApi.js', () => ({
  useGetAlbumByIdQuery: vi.fn(() => ({
    data: {
      album: {
        id: 'album-1',
        title: 'Test Album',
        description: 'Test Description',
        createdAt: '2024-01-01T00:00:00Z',
        lastUpdatedAt: '2024-01-01T00:00:00Z',
      },
      images: [
        {
          id: 'image-1',
          url: 'https://example.com/image1.jpg',
          title: 'Image 1',
          description: 'Test image 1',
          author: 'Test Author',
          uploadDate: '2024-01-01T00:00:00Z',
          tags: ['test'],
        },
      ],
    },
    error: undefined,
    isLoading: false,
    refetch: vi.fn(),
  })),
  useUpdateAlbumMutation: vi.fn(() => [vi.fn(), {}]),
  useDeleteAlbumMutation: vi.fn(() => [vi.fn(), {}]),
  useRemoveImageFromAlbumMutation: vi.fn(() => [vi.fn(), {}]),
  albumsApi: {
    reducerPath: 'albumsApi',
    reducer: (state = {}, action: any) => state,
    middleware: () => () => () => {},
  },
}))

vi.mock('../../ImageCard/index.js', () => ({
  default: ({ title }: any) => <div data-testid={`image-card-${title}`}>{title}</div>,
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

describe('AlbumView', () => {
  it('should render album title and description', () => {
    render(<AlbumView albumId="album-1" />)

    expect(screen.getByText('Test Album')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('should render album metadata', () => {
    render(<AlbumView albumId="album-1" />)

    expect(screen.getByText('1 image')).toBeInTheDocument()
    expect(screen.getByText(/Created/)).toBeInTheDocument()
    expect(screen.getByText(/Last updated/)).toBeInTheDocument()
  })

  it('should render images in the album', () => {
    render(<AlbumView albumId="album-1" />)

    expect(screen.getByTestId('image-card-Image 1')).toBeInTheDocument()
  })

  it('should render management buttons', () => {
    render(<AlbumView albumId="album-1" />)

    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('should render back button when onBack is provided', () => {
    const mockOnBack = vi.fn()
    render(<AlbumView albumId="album-1" onBack={mockOnBack} />)

    expect(screen.getByLabelText('Go back')).toBeInTheDocument()
  })

  it('should not render back button when onBack is not provided', () => {
    render(<AlbumView albumId="album-1" />)

    expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument()
  })

  it('should render share button when onShare is provided', () => {
    const mockOnShare = vi.fn()
    render(<AlbumView albumId="album-1" onShare={mockOnShare} />)

    expect(screen.getByText('Share')).toBeInTheDocument()
  })

  it('should not render share button when onShare is not provided', () => {
    render(<AlbumView albumId="album-1" />)

    expect(screen.queryByText('Share')).not.toBeInTheDocument()
  })
})
