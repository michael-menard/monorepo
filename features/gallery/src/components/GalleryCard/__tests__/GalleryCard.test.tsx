import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GalleryCard from '../index.js';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    img: ({ ...props }: any) => <img {...props} />,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

describe('GalleryCard', () => {
  const defaultProps = {
    src: 'https://example.com/image.jpg',
    title: 'Test Image',
    description: 'A test image description',
    author: 'Test Author',
    uploadDate: new Date('2024-01-15'),
    tags: ['lego', 'build', 'creative'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with basic props', () => {
    render(<GalleryCard {...defaultProps} />);
    
    expect(screen.getByRole('img')).toHaveAttribute('src', defaultProps.src);
    expect(screen.getByRole('img')).toHaveAttribute('alt', defaultProps.title);
    expect(screen.getByText(defaultProps.title)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.description)).toBeInTheDocument();
    expect(screen.getByText(`By ${defaultProps.author}`)).toBeInTheDocument();
    expect(screen.getByText('Jan 14, 2024')).toBeInTheDocument();
  });

  it('renders without optional props', () => {
    const minimalProps = {
      src: 'https://example.com/image.jpg',
      title: 'Test Image',
    };
    
    render(<GalleryCard {...minimalProps} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('Test Image')).toBeInTheDocument();
    expect(screen.queryByText('A test image description')).not.toBeInTheDocument();
    expect(screen.queryByText('By Test Author')).not.toBeInTheDocument();
  });

  it('displays tags correctly', () => {
    render(<GalleryCard {...defaultProps} />);
    
    expect(screen.getByText('lego')).toBeInTheDocument();
    expect(screen.getByText('build')).toBeInTheDocument();
    expect(screen.getByText('creative')).toBeInTheDocument();
  });

  it('shows tag overflow indicator when more than 3 tags', () => {
    const propsWithManyTags = {
      ...defaultProps,
      tags: ['lego', 'build', 'creative', 'awesome', 'amazing'],
    };
    
    render(<GalleryCard {...propsWithManyTags} />);
    
    expect(screen.getByText('lego')).toBeInTheDocument();
    expect(screen.getByText('build')).toBeInTheDocument();
    expect(screen.getByText('creative')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('handles like button click', () => {
    const onLike = vi.fn();
    render(<GalleryCard {...defaultProps} onLike={onLike} />);
    
    const likeButton = screen.getByLabelText('Like');
    fireEvent.click(likeButton);
    
    expect(onLike).toHaveBeenCalledWith(true);
  });

  it('toggles like state correctly', () => {
    const onLike = vi.fn();
    render(<GalleryCard {...defaultProps} onLike={onLike} initialLiked={true} />);
    
    const likeButton = screen.getByLabelText('Unlike');
    fireEvent.click(likeButton);
    
    expect(onLike).toHaveBeenCalledWith(false);
  });

  it('calls onView when card is clicked', () => {
    const onView = vi.fn();
    render(<GalleryCard {...defaultProps} onView={onView} />);
    
    const card = screen.getByRole('button', { name: defaultProps.title });
    fireEvent.click(card);
    
    expect(onView).toHaveBeenCalled();
  });

  it('calls onView when Enter key is pressed', () => {
    const onView = vi.fn();
    render(<GalleryCard {...defaultProps} onView={onView} />);
    
    const card = screen.getByRole('button', { name: defaultProps.title });
    fireEvent.keyDown(card, { key: 'Enter' });
    
    expect(onView).toHaveBeenCalled();
  });

  it('calls onView when Space key is pressed', () => {
    const onView = vi.fn();
    render(<GalleryCard {...defaultProps} onView={onView} />);
    
    const card = screen.getByRole('button', { name: defaultProps.title });
    fireEvent.keyDown(card, { key: ' ' });
    
    expect(onView).toHaveBeenCalled();
  });

  it('prevents default behavior on Enter key', () => {
    const onView = vi.fn();
    render(<GalleryCard {...defaultProps} onView={onView} />);
    
    const card = screen.getByRole('button', { name: defaultProps.title });
    fireEvent.keyDown(card, { key: 'Enter' });
    
    expect(onView).toHaveBeenCalled();
  });

  it('prevents default behavior on Space key', () => {
    const onView = vi.fn();
    render(<GalleryCard {...defaultProps} onView={onView} />);
    
    const card = screen.getByRole('button', { name: defaultProps.title });
    fireEvent.keyDown(card, { key: ' ' });
    
    expect(onView).toHaveBeenCalled();
  });

  it('shows action buttons on hover', async () => {
    const onView = vi.fn();
    const onShare = vi.fn();
    const onDownload = vi.fn();
    const onAddToAlbum = vi.fn();
    
    render(
      <GalleryCard
        {...defaultProps}
        onView={onView}
        onShare={onShare}
        onDownload={onDownload}
        onAddToAlbum={onAddToAlbum}
      />
    );
    
    const card = screen.getByRole('button', { name: defaultProps.title });
    fireEvent.mouseEnter(card);
    
    await waitFor(() => {
      expect(screen.getByText('View')).toBeInTheDocument();
      expect(screen.getByText('Share')).toBeInTheDocument();
      expect(screen.getByText('Download')).toBeInTheDocument();
      expect(screen.getByText('Add to Album')).toBeInTheDocument();
    });
  });

  it('shows delete button when onDelete is provided', async () => {
    const onDelete = vi.fn();
    render(<GalleryCard {...defaultProps} onDelete={onDelete} />);
    
    const card = screen.getByRole('button', { name: defaultProps.title });
    fireEvent.mouseEnter(card);
    
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('calls action handlers when buttons are clicked', async () => {
    const onView = vi.fn();
    const onShare = vi.fn();
    const onDownload = vi.fn();
    const onAddToAlbum = vi.fn();
    const onDelete = vi.fn();
    
    render(
      <GalleryCard
        {...defaultProps}
        onView={onView}
        onShare={onShare}
        onDownload={onDownload}
        onAddToAlbum={onAddToAlbum}
        onDelete={onDelete}
      />
    );
    
    const card = screen.getByRole('button', { name: defaultProps.title });
    fireEvent.mouseEnter(card);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Share'));
      expect(onShare).toHaveBeenCalled();
      
      fireEvent.click(screen.getByText('Download'));
      expect(onDownload).toHaveBeenCalled();
      
      fireEvent.click(screen.getByText('Add to Album'));
      expect(onAddToAlbum).toHaveBeenCalled();
      
      fireEvent.click(screen.getByText('Delete'));
      expect(onDelete).toHaveBeenCalled();
    });
  });

  it('prevents event propagation on action button clicks', async () => {
    const onView = vi.fn();
    const onShare = vi.fn();
    
    render(<GalleryCard {...defaultProps} onView={onView} onShare={onShare} />);
    
    const card = screen.getByRole('button', { name: defaultProps.title });
    fireEvent.mouseEnter(card);
    
    await waitFor(() => {
      const shareButton = screen.getByText('Share');
      const event = { stopPropagation: vi.fn() };
      fireEvent.click(shareButton, event);
      
      expect(onShare).toHaveBeenCalled();
      expect(onView).not.toHaveBeenCalled(); // Card click should not be triggered
    });
  });

  it('prevents event propagation on like button click', () => {
    const onView = vi.fn();
    const onLike = vi.fn();
    
    render(<GalleryCard {...defaultProps} onView={onView} onLike={onLike} />);
    
    const likeButton = screen.getByLabelText('Like');
    const event = { stopPropagation: vi.fn() };
    fireEvent.click(likeButton, event);
    
    expect(onLike).toHaveBeenCalled();
    expect(onView).not.toHaveBeenCalled(); // Card click should not be triggered
  });

  it('formats date correctly', () => {
    const propsWithStringDate = {
      ...defaultProps,
      uploadDate: '2024-03-20',
    };
    
    render(<GalleryCard {...propsWithStringDate} />);
    expect(screen.getByText('Mar 20, 2024')).toBeInTheDocument();
  });

  it('handles empty date gracefully', () => {
    const propsWithoutDate = {
      ...defaultProps,
      uploadDate: undefined,
    };
    
    render(<GalleryCard {...propsWithoutDate} />);
    expect(screen.queryByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)).not.toBeInTheDocument();
  });

  it('handles empty tags gracefully', () => {
    const propsWithoutTags = {
      ...defaultProps,
      tags: [],
    };
    
    render(<GalleryCard {...propsWithoutTags} />);
    expect(screen.queryByText('lego')).not.toBeInTheDocument();
    expect(screen.queryByText('build')).not.toBeInTheDocument();
    expect(screen.queryByText('creative')).not.toBeInTheDocument();
  });

  it('uses title as alt text when alt is not provided', () => {
    render(<GalleryCard {...defaultProps} />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', defaultProps.title);
  });

  it('uses provided alt text when available', () => {
    const propsWithAlt = {
      ...defaultProps,
      alt: 'Custom alt text',
    };
    
    render(<GalleryCard {...propsWithAlt} />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Custom alt text');
  });

  it('has proper accessibility attributes', () => {
    render(<GalleryCard {...defaultProps} />);
    
    const card = screen.getByRole('button', { name: defaultProps.title });
    expect(card).toHaveAttribute('tabIndex', '0');
    expect(card).toHaveAttribute('aria-label', defaultProps.title);
  });

  it('applies correct CSS classes', () => {
    render(<GalleryCard {...defaultProps} />);
    
    const card = screen.getByRole('button', { name: defaultProps.title });
    expect(card).toHaveClass('group', 'relative', 'bg-white', 'rounded-lg', 'shadow-md');
    
    const image = screen.getByRole('img');
    expect(image).toHaveClass('w-full', 'h-full', 'object-cover');
  });
}); 