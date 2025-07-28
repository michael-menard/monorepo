import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Gallery from '../index.js';
import type { GalleryImage } from '../types/index.js';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock ImageCard component
vi.mock('../components/ImageCard/index.js', () => ({
  default: ({ title, src }: any) => (
    <div data-testid="image-card">
      <img src={src} alt={title} />
      <h3>{title}</h3>
    </div>
  ),
}));

const mockImages: GalleryImage[] = [
  {
    id: '1',
    url: 'https://example.com/image1.jpg',
    title: 'Test Image 1',
    description: 'A test image',
    author: 'Test Author',
    tags: ['test', 'image'],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: '2',
    url: 'https://example.com/image2.jpg',
    title: 'Test Image 2',
    description: 'Another test image',
    author: 'Test Author 2',
    tags: ['test', 'image2'],
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  },
];

describe('Gallery', () => {
  it('renders all images', () => {
    render(<Gallery images={mockImages} />);
    
    const imageCards = screen.getAllByTestId('image-card');
    expect(imageCards).toHaveLength(2);
    
    expect(screen.getByText('Test Image 1')).toBeInTheDocument();
    expect(screen.getByText('Test Image 2')).toBeInTheDocument();
  });

  it('renders images with correct data', () => {
    render(<Gallery images={mockImages} />);
    
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('src', 'https://example.com/image1.jpg');
    expect(images[0]).toHaveAttribute('alt', 'Test Image 1');
    expect(images[1]).toHaveAttribute('src', 'https://example.com/image2.jpg');
    expect(images[1]).toHaveAttribute('alt', 'Test Image 2');
  });

  it('shows empty state when no images provided', () => {
    render(<Gallery images={[]} />);
    
    expect(screen.getByText('No images yet')).toBeInTheDocument();
    expect(screen.getByText('Add some images to get started!')).toBeInTheDocument();
  });

  it('shows empty state when images is null', () => {
    render(<Gallery images={null as any} />);
    
    expect(screen.getByText('No images yet')).toBeInTheDocument();
    expect(screen.getByText('Add some images to get started!')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(<Gallery images={mockImages} className="custom-class" />);
    
    const imageCards = screen.getAllByTestId('image-card');
    expect(imageCards).toHaveLength(2);
    // The component renders correctly with custom className
  });
}); 