import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock all dependencies
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../../store/albumsApi.js', () => ({
  useGetAlbumByIdQuery: vi.fn(() => ({
    data: {
      album: {
        id: '1',
        title: 'Test Album',
        description: 'Test Description',
        createdAt: '2024-01-01T00:00:00Z',
        lastUpdatedAt: '2024-01-01T00:00:00Z',
      },
      images: [
        {
          id: '1',
          url: 'test.jpg',
          title: 'Test Image',
          description: 'Test Image Description',
          author: 'Test Author',
          uploadDate: '2024-01-01',
          tags: ['test'],
        },
      ],
    },
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  })),
  useUpdateAlbumMutation: vi.fn(() => [vi.fn()]),
  useDeleteAlbumMutation: vi.fn(() => [vi.fn()]),
  useRemoveImageFromAlbumMutation: vi.fn(() => [vi.fn()]),
}));

// Mock GalleryCard as a simple div
vi.mock('../../GalleryCard/index.js', () => ({
  default: ({ title, description }: any) => (
    <div data-testid="gallery-card">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
}));

// Import the component after mocking
import AlbumView from '../index.js';

describe('AlbumView', () => {
  it('renders album information correctly', () => {
    render(<AlbumView albumId="1" />);
    
    expect(screen.getByText('Test Album')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText(/1 image/)).toBeInTheDocument();
  });

  it('renders back button when onBack is provided', () => {
    const onBack = vi.fn();
    render(<AlbumView albumId="1" onBack={onBack} />);
    
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('renders edit, share, and delete buttons', () => {
    const onShare = vi.fn();
    render(<AlbumView albumId="1" onShare={onShare} />);
    
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('renders gallery cards for images', () => {
    render(<AlbumView albumId="1" />);
    
    // Check if the images grid is rendered
    const imagesGrid = screen.getByRole('grid');
    expect(imagesGrid).toBeInTheDocument();
    
    // The GalleryCard component should render the image title and description
    expect(screen.getByText('Test Image')).toBeInTheDocument();
    expect(screen.getByText('Test Image Description')).toBeInTheDocument();
  });
}); 