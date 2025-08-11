import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Gallery } from '../index.js';
import type { GalleryImage } from '../schemas/index.js';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
  LayoutGroup: ({ children }: any) => <div>{children}</div>,
}));

// Mock ImageCard component
vi.mock('../components/ImageCard/index.js', () => ({
  default: ({ title, src, onView }: any) => (
    <div data-testid="image-card" onClick={onView}>
      <img src={src} alt={title} />
      <h3>{title}</h3>
    </div>
  ),
}));

// Mock BatchOperationsToolbar component
vi.mock('../components/BatchOperationsToolbar/index.js', () => ({
  default: ({ selectedImages, totalImages }: any) => (
    <div data-testid="batch-toolbar">
      <span>{selectedImages.length} selected</span>
      <span>{totalImages} total</span>
    </div>
  ),
}));

// Mock hooks
vi.mock('../hooks/useAlbumDragAndDrop.js', () => ({
  useAlbumDragAndDrop: () => ({
    actions: {
      handleDragStart: vi.fn(),
    },
  }),
}));

const mockImages: Array<GalleryImage> = [
  {
    id: '1',
    url: 'https://example.com/image1.jpg',
    title: 'Test Image 1',
    description: 'Test description 1',
    author: 'Test Author',
    tags: ['test', 'image'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    url: 'https://example.com/image2.jpg',
    title: 'Test Image 2',
    description: 'Test description 2',
    author: 'Test Author 2',
    tags: ['test', 'image'],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

describe('Gallery Component', () => {
  it('renders grid layout by default', () => {
    render(<Gallery images={mockImages} />);
    
    const imageCards = screen.getAllByTestId('image-card');
    expect(imageCards).toHaveLength(2);
    const container = imageCards[0].closest('.grid');
    expect(container).not.toBeNull();
    expect(container!).toHaveClass('grid');
  });

  it('renders masonry layout when specified', () => {
    render(<Gallery images={mockImages} layout="masonry" />);
    
    const imageCards = screen.getAllByTestId('image-card');
    expect(imageCards).toHaveLength(2);
    const container = imageCards[0].closest('.columns-1');
    expect(container).not.toBeNull();
    expect(container!).toHaveClass('columns-1');
  });

  it('renders empty state when no images', () => {
    render(<Gallery images={[]} />);
    
    expect(screen.getByText('No images yet')).toBeInTheDocument();
    expect(screen.getByText('Add some images to get started!')).toBeInTheDocument();
  });

  it('calls onImageClick when image card is clicked', () => {
    const mockOnImageClick = vi.fn();
    render(<Gallery images={mockImages} onImageClick={mockOnImageClick} />);
    
    const imageCards = screen.getAllByTestId('image-card');
    fireEvent.click(imageCards[0]);
    
    expect(mockOnImageClick).toHaveBeenCalledWith(mockImages[0]);
  });

  it('displays batch operations toolbar when images are selected', () => {
    render(<Gallery images={mockImages} selectedImages={['1']} />);
    
    const toolbar = screen.getByTestId('batch-toolbar');
    expect(toolbar).toBeInTheDocument();
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByText('2 total')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Gallery images={mockImages} className="custom-class" />);
    
    const imageCards = screen.getAllByTestId('image-card');
    const container = imageCards[0].closest('.grid, .columns-1');
    expect(container).not.toBeNull();
    expect(container!).toHaveClass('custom-class');
  });

  it('handles responsive grid classes correctly', () => {
    render(<Gallery images={mockImages} layout="grid" />);
    
    const imageCards = screen.getAllByTestId('image-card');
    const container = imageCards[0].closest('.grid');
    expect(container).not.toBeNull();
    expect(container!).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3');
  });

  it('handles responsive masonry classes correctly', () => {
    render(<Gallery images={mockImages} layout="masonry" />);
    
    const imageCards = screen.getAllByTestId('image-card');
    const container = imageCards[0].closest('.columns-1');
    expect(container).not.toBeNull();
    expect(container!).toHaveClass('columns-1', 'sm:columns-2', 'md:columns-3');
  });
}); 