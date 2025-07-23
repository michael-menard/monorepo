import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GalleryImageCard from '../index.js';

describe('GalleryImageCard', () => {
  const defaultProps = {
    src: 'test-image.jpg',
    title: 'Test Image',
    description: 'Test description',
    author: 'Test Author',
    uploadDate: '2024-01-01',
    tags: ['lego', 'star-wars', 'architecture'],
  };

  it('renders with all props', () => {
    render(<GalleryImageCard {...defaultProps} />);
    
    expect(screen.getByText('Test Image')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('By Test Author')).toBeInTheDocument();
    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
    expect(screen.getByText('lego')).toBeInTheDocument();
    expect(screen.getByText('star-wars')).toBeInTheDocument();
    expect(screen.getByText('architecture')).toBeInTheDocument();
  });

  it('renders without optional props', () => {
    render(
      <GalleryImageCard
        src="test-image.jpg"
        title="Test Image"
      />
    );
    
    expect(screen.getByText('Test Image')).toBeInTheDocument();
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
    expect(screen.queryByText('By Test Author')).not.toBeInTheDocument();
    expect(screen.queryByText('Jan 1, 2024')).not.toBeInTheDocument();
  });

  it('handles like button click', () => {
    render(<GalleryImageCard {...defaultProps} />);
    
    const likeButton = screen.getByRole('button', { name: /like/i });
    fireEvent.click(likeButton);
    
    expect(screen.getByRole('button', { name: /unlike/i })).toBeInTheDocument();
  });

  it('calls onView when card is clicked', () => {
    const mockOnView = vi.fn();
    render(<GalleryImageCard {...defaultProps} onView={mockOnView} />);
    
    const card = screen.getByText('Test Image').closest('div');
    fireEvent.click(card!);
    
    expect(mockOnView).toHaveBeenCalledTimes(1);
  });

  it('calls onView when Enter key is pressed', () => {
    const mockOnView = vi.fn();
    render(<GalleryImageCard {...defaultProps} onView={mockOnView} />);
    
    const card = screen.getByText('Test Image').closest('div');
    fireEvent.keyDown(card!, { key: 'Enter' });
    
    expect(mockOnView).toHaveBeenCalledTimes(1);
  });

  it('calls onShare when share button is clicked', () => {
    const mockOnShare = vi.fn();
    render(<GalleryImageCard {...defaultProps} onShare={mockOnShare} />);
    
    // Hover to show action buttons
    const card = screen.getByText('Test Image').closest('div');
    fireEvent.mouseEnter(card!);
    
    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);
    
    expect(mockOnShare).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button is clicked', () => {
    const mockOnDelete = vi.fn();
    render(<GalleryImageCard {...defaultProps} onDelete={mockOnDelete} />);
    
    // Hover to show action buttons
    const card = screen.getByText('Test Image').closest('div');
    fireEvent.mouseEnter(card!);
    
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('shows limited tags with overflow indicator', () => {
    const manyTags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];
    render(<GalleryImageCard {...defaultProps} tags={manyTags} />);
    
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument(); // Shows overflow for tags 4 and 5
  });

  it('handles hover state correctly', () => {
    render(<GalleryImageCard {...defaultProps} onView={() => {}} onShare={() => {}} />);
    
    const card = screen.getByText('Test Image').closest('div');
    
    // Initially, action buttons should not be visible
    expect(screen.queryByText('View')).not.toBeInTheDocument();
    expect(screen.queryByText('Share')).not.toBeInTheDocument();
    
    // After hover, action buttons should be visible
    fireEvent.mouseEnter(card!);
    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    
    // After mouse leave, action buttons should be hidden
    fireEvent.mouseLeave(card!);
    expect(screen.queryByText('View')).not.toBeInTheDocument();
    expect(screen.queryByText('Share')).not.toBeInTheDocument();
  });

  it('prevents event propagation on button clicks', () => {
    const mockOnView = vi.fn();
    const mockOnShare = vi.fn();
    
    render(<GalleryImageCard {...defaultProps} onView={mockOnView} onShare={mockOnShare} />);
    
    // Hover to show action buttons
    const card = screen.getByText('Test Image').closest('div');
    fireEvent.mouseEnter(card!);
    
    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);
    
    // Both onShare and onView should be called (onView from card click, onShare from button click)
    expect(mockOnShare).toHaveBeenCalledTimes(1);
    expect(mockOnView).toHaveBeenCalledTimes(1);
  });

  it('formats date correctly', () => {
    render(<GalleryImageCard {...defaultProps} uploadDate="2024-12-25" />);
    
    expect(screen.getByText('Dec 25, 2024')).toBeInTheDocument();
  });

  it('handles Date object for uploadDate', () => {
    render(<GalleryImageCard {...defaultProps} uploadDate={new Date('2024-06-15')} />);
    
    expect(screen.getByText('Jun 15, 2024')).toBeInTheDocument();
  });

  it('applies proper accessibility attributes', () => {
    render(<GalleryImageCard {...defaultProps} />);
    
    const card = screen.getByText('Test Image').closest('div');
    expect(card).toHaveAttribute('tabIndex', '0');
    expect(card).toHaveAttribute('aria-label', 'Test Image');
  });
}); 