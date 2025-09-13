import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GalleryCard } from '../GalleryCard';
import type { GalleryItem, GalleryConfig } from '../../../types/index';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('GalleryCard', () => {
  const mockItem: GalleryItem = {
    id: '1',
    title: 'Test Item',
    description: 'Test description',
    imageUrl: 'https://example.com/image.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    author: 'Test Author',
    tags: ['tag1', 'tag2', 'tag3', 'tag4'],
    category: 'test',
    createdAt: new Date('2023-01-01'),
    liked: false,
    type: 'image',
  };

  const mockConfig: GalleryConfig = {
    layout: 'grid',
    viewMode: 'comfortable',
    selectable: true,
    animations: {
      enabled: true,
      duration: 0.3,
      stagger: true,
      staggerDelay: 0.05,
    },
    columns: { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 },
    gap: 4,
    itemsPerPage: 20,
    infiniteScroll: true,
    multiSelect: false,
    draggable: false,
    sortable: true,
    sortOptions: [],
    filterConfig: {
      searchable: true,
      searchFields: ['title'],
      tagFilter: true,
      categoryFilter: true,
      dateFilter: false,
      customFilters: [],
    },
  };

  const mockHandlers = {
    onSelect: vi.fn(),
    onClick: vi.fn(),
    onLike: vi.fn(),
    onShare: vi.fn(),
    onDelete: vi.fn(),
    onDownload: vi.fn(),
    onEdit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders card with item data', () => {
      render(
        <GalleryCard
          item={mockItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Test Item')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByText('Test Author')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/thumb.jpg');
    });

    it('renders without optional fields', () => {
      const minimalItem = {
        id: '1',
        imageUrl: 'https://example.com/image.jpg',
        createdAt: new Date(),
      };

      render(
        <GalleryCard
          item={minimalItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Untitled')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('applies custom className', () => {
      const { container } = render(
        <GalleryCard
          item={mockItem}
          config={mockConfig}
          selected={false}
          className="custom-card"
          {...mockHandlers}
        />
      );

      expect(container.firstChild).toHaveClass('custom-card');
    });
  });

  describe('Selection', () => {
    it('shows selection checkbox when selectable', () => {
      render(
        <GalleryCard
          item={mockItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('hides selection checkbox when not selectable', () => {
      const nonSelectableConfig = { ...mockConfig, selectable: false };
      
      render(
        <GalleryCard
          item={mockItem}
          config={nonSelectableConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('handles selection change', () => {
      render(
        <GalleryCard
          item={mockItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      fireEvent.click(screen.getByRole('checkbox'));
      expect(mockHandlers.onSelect).toHaveBeenCalledWith(true);
    });

    it('shows selected state', () => {
      const { container } = render(
        <GalleryCard
          item={mockItem}
          config={mockConfig}
          selected={true}
          {...mockHandlers}
        />
      );

      expect(container.firstChild).toHaveClass('ring-2', 'ring-blue-500');
      expect(screen.getByRole('checkbox')).toBeChecked();
    });
  });

  describe('Interactions', () => {
    it('handles card click', () => {
      render(
        <GalleryCard
          item={mockItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      fireEvent.click(screen.getByRole('img'));
      expect(mockHandlers.onClick).toHaveBeenCalledTimes(1);
    });

    it('handles like action', () => {
      render(
        <GalleryCard
          item={mockItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      const likeButton = screen.getByRole('button', { name: /heart/i });
      fireEvent.click(likeButton);
      expect(mockHandlers.onLike).toHaveBeenCalledWith(true);
    });

    it('handles share action', () => {
      render(
        <GalleryCard
          item={mockItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      const shareButton = screen.getByRole('button', { name: /share/i });
      fireEvent.click(shareButton);
      expect(mockHandlers.onShare).toHaveBeenCalledTimes(1);
    });

    it('handles download action', () => {
      render(
        <GalleryCard
          item={mockItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /download/i });
      fireEvent.click(downloadButton);
      expect(mockHandlers.onDownload).toHaveBeenCalledTimes(1);
    });

    it('prevents event bubbling on action clicks', () => {
      render(
        <GalleryCard
          item={mockItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      const likeButton = screen.getByRole('button', { name: /heart/i });
      fireEvent.click(likeButton);
      
      expect(mockHandlers.onLike).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onClick).not.toHaveBeenCalled();
    });
  });

  describe('View Modes', () => {
    it('applies compact view mode styles', () => {
      const compactConfig = { ...mockConfig, viewMode: 'compact' as const };
      
      render(
        <GalleryCard
          item={mockItem}
          config={compactConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      expect(screen.queryByText('Test description')).not.toBeInTheDocument();
    });

    it('shows description in comfortable and spacious modes', () => {
      const comfortableConfig = { ...mockConfig, viewMode: 'comfortable' as const };
      
      render(
        <GalleryCard
          item={mockItem}
          config={comfortableConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Test description')).toBeInTheDocument();
    });
  });

  describe('Tags', () => {
    it('displays tags in non-compact mode', () => {
      render(
        <GalleryCard
          item={mockItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      expect(screen.getByText('tag3')).toBeInTheDocument();
      expect(screen.getByText('+1')).toBeInTheDocument(); // Shows +1 for remaining tags
    });

    it('hides tags in compact mode', () => {
      const compactConfig = { ...mockConfig, viewMode: 'compact' as const };
      
      render(
        <GalleryCard
          item={mockItem}
          config={compactConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      expect(screen.queryByText('tag1')).not.toBeInTheDocument();
    });
  });

  describe('Type Badge', () => {
    it('shows type badge for non-image types', () => {
      const inspirationItem = { ...mockItem, type: 'inspiration' as const };
      
      render(
        <GalleryCard
          item={inspirationItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('inspiration')).toBeInTheDocument();
    });

    it('hides type badge for image type', () => {
      render(
        <GalleryCard
          item={mockItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      expect(screen.queryByText('image')).not.toBeInTheDocument();
    });
  });

  describe('Image Loading', () => {
    it('shows loading state initially', () => {
      render(
        <GalleryCard
          item={mockItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveClass('opacity-0');
    });

    it('handles image load event', async () => {
      render(
        <GalleryCard
          item={mockItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      const img = screen.getByRole('img');
      fireEvent.load(img);

      await waitFor(() => {
        expect(img).toHaveClass('opacity-100');
      });
    });

    it('handles image error', () => {
      render(
        <GalleryCard
          item={mockItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      const img = screen.getByRole('img');
      fireEvent.error(img);

      expect(screen.getByText('Image unavailable')).toBeInTheDocument();
    });
  });

  describe('Like State', () => {
    it('shows liked state', () => {
      const likedItem = { ...mockItem, liked: true };
      
      render(
        <GalleryCard
          item={likedItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      const likeButton = screen.getByRole('button', { name: /heart/i });
      expect(likeButton).toHaveClass('bg-red-500', 'text-white');
    });

    it('shows unliked state', () => {
      render(
        <GalleryCard
          item={mockItem}
          config={mockConfig}
          selected={false}
          {...mockHandlers}
        />
      );

      const likeButton = screen.getByRole('button', { name: /heart/i });
      expect(likeButton).toHaveClass('bg-white/90', 'text-gray-700');
    });
  });
});
