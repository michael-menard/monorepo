import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Gallery } from '../components/Gallery/Gallery';
import { GalleryAdapters } from '../utils/adapters';
import type { GalleryItem, GalleryActions } from '../types/index';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
  LayoutGroup: ({ children }: any) => children,
}));

describe('Gallery Integration Tests', () => {
  const mockItems: GalleryItem[] = [
    {
      id: '1',
      title: 'Space Station MOC',
      description: 'Amazing space station build',
      imageUrl: 'https://example.com/space.jpg',
      author: 'SpaceBuilder',
      tags: ['space', 'moc', 'advanced'],
      category: 'space',
      createdAt: new Date('2023-01-01'),
      liked: false,
      type: 'inspiration',
    },
    {
      id: '2',
      title: 'Castle Instructions',
      description: 'Medieval castle building guide',
      imageUrl: 'https://example.com/castle.jpg',
      author: 'CastleDesigner',
      tags: ['castle', 'instructions', 'medieval'],
      category: 'instructions',
      createdAt: new Date('2023-01-02'),
      liked: true,
      type: 'instruction',
    },
    {
      id: '3',
      title: 'Millennium Falcon Set',
      description: 'Ultimate Collector Series',
      imageUrl: 'https://example.com/falcon.jpg',
      author: 'LEGO',
      tags: ['star-wars', 'ucs', 'wishlist'],
      category: 'wishlist',
      createdAt: new Date('2023-01-03'),
      liked: false,
      type: 'wishlist',
    },
  ];

  const mockActions: GalleryActions = {
    onItemClick: vi.fn(),
    onItemLike: vi.fn(),
    onItemShare: vi.fn(),
    onItemDelete: vi.fn(),
    onItemDownload: vi.fn(),
    onItemEdit: vi.fn(),
    onItemsSelected: vi.fn(),
    onBatchDelete: vi.fn(),
    onBatchDownload: vi.fn(),
    onBatchShare: vi.fn(),
    onLoadMore: vi.fn(),
    onRefresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete User Workflows', () => {
    it('handles complete selection workflow', async () => {
      const config = {
        selectable: true,
        multiSelect: true,
      };

      render(
        <Gallery
          items={mockItems}
          config={config}
          actions={mockActions}
        />
      );

      // Select individual items
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // Select first item checkbox (index 0 is select-all)
      
      await waitFor(() => {
        expect(mockActions.onItemsSelected).toHaveBeenCalledWith(['1']);
      });

      // Select all items
      const selectAllButton = screen.getByTestId('select-all');
      fireEvent.click(selectAllButton);

      await waitFor(() => {
        expect(mockActions.onItemsSelected).toHaveBeenCalledWith(['1', '2', '3']);
      });

      // Clear selection
      const clearButton = screen.getByTestId('clear-selection');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockActions.onItemsSelected).toHaveBeenCalledWith([]);
      });
    });

    it('handles batch operations workflow', async () => {
      const config = {
        selectable: true,
        multiSelect: true,
      };

      render(
        <Gallery
          items={mockItems}
          config={config}
          selectedItems={['1', '2']}
          actions={mockActions}
        />
      );

      // Batch delete
      const batchDeleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(batchDeleteButton);

      expect(mockActions.onBatchDelete).toHaveBeenCalledWith(['1', '2']);

      // Batch download
      const batchDownloadButton = screen.getByRole('button', { name: /download/i });
      fireEvent.click(batchDownloadButton);

      expect(mockActions.onBatchDownload).toHaveBeenCalledWith(['1', '2']);

      // Batch share
      const batchShareButton = screen.getByRole('button', { name: /share/i });
      fireEvent.click(batchShareButton);

      expect(mockActions.onBatchShare).toHaveBeenCalledWith(['1', '2']);
    });

    it('handles search and filter workflow', async () => {
      const config = {
        filterConfig: {
          searchable: true,
          tagFilter: true,
          categoryFilter: true,
        },
      };

      render(
        <Gallery
          items={mockItems}
          config={config}
          actions={mockActions}
        />
      );

      // Search functionality
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'space' } });

      // Filter by category
      const categorySelect = screen.getByDisplayValue(/all categories/i);
      fireEvent.change(categorySelect, { target: { value: 'space' } });

      // Apply filters
      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      fireEvent.click(applyButton);

      // Clear filters
      const clearButton = screen.getByRole('button', { name: /clear all/i });
      fireEvent.click(clearButton);
    });

    it('handles sorting workflow', async () => {
      const config = {
        sortable: true,
        sortOptions: [
          { field: 'createdAt', direction: 'desc', label: 'Newest First' },
          { field: 'title', direction: 'asc', label: 'Title A-Z' },
          { field: 'author', direction: 'asc', label: 'Author A-Z' },
        ],
      };

      render(
        <Gallery
          items={mockItems}
          config={config}
          actions={mockActions}
        />
      );

      // Change sort order
      const sortSelect = screen.getByDisplayValue(/newest first/i);
      fireEvent.change(sortSelect, { target: { value: 'title-asc' } });

      // Verify items are displayed (integration with layout)
      expect(screen.getByText('Space Station MOC')).toBeInTheDocument();
      expect(screen.getByText('Castle Instructions')).toBeInTheDocument();
      expect(screen.getByText('Millennium Falcon Set')).toBeInTheDocument();
    });

    it('handles item interaction workflow', async () => {
      render(
        <Gallery
          items={mockItems}
          actions={mockActions}
        />
      );

      // Click on item
      const firstItem = screen.getByText('Space Station MOC');
      fireEvent.click(firstItem);

      expect(mockActions.onItemClick).toHaveBeenCalledWith(mockItems[0]);

      // Like item
      const likeButtons = screen.getAllByRole('button', { name: /heart/i });
      fireEvent.click(likeButtons[0]);

      expect(mockActions.onItemLike).toHaveBeenCalledWith('1', true);

      // Share item
      const shareButtons = screen.getAllByRole('button', { name: /share/i });
      fireEvent.click(shareButtons[0]);

      expect(mockActions.onItemShare).toHaveBeenCalledWith('1');

      // Download item
      const downloadButtons = screen.getAllByRole('button', { name: /download/i });
      fireEvent.click(downloadButtons[0]);

      expect(mockActions.onItemDownload).toHaveBeenCalledWith('1');
    });
  });

  describe('Preset Integration', () => {
    it('inspiration preset works end-to-end', () => {
      render(
        <Gallery
          items={mockItems}
          preset="inspiration"
          actions={mockActions}
        />
      );

      // Should use masonry layout
      expect(screen.getByTestId('masonry-layout')).toBeInTheDocument();
      
      // Should show search header
      expect(screen.getByTestId('gallery-header')).toBeInTheDocument();
      
      // Should not show selection toolbar (not selectable)
      expect(screen.queryByTestId('gallery-toolbar')).not.toBeInTheDocument();
    });

    it('instructions preset works end-to-end', () => {
      render(
        <Gallery
          items={mockItems}
          preset="instructions"
          actions={mockActions}
        />
      );

      // Should use grid layout
      expect(screen.getByTestId('grid-layout')).toBeInTheDocument();
      
      // Should show selection toolbar (selectable)
      expect(screen.getByTestId('gallery-toolbar')).toBeInTheDocument();
      
      // Should show batch operations when items selected
      render(
        <Gallery
          items={mockItems}
          preset="instructions"
          selectedItems={['1', '2']}
          actions={mockActions}
        />
      );

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('wishlist preset works end-to-end', () => {
      render(
        <Gallery
          items={mockItems}
          preset="wishlist"
          actions={mockActions}
        />
      );

      // Should use grid layout with drag-and-drop
      expect(screen.getByTestId('grid-layout')).toBeInTheDocument();
      
      // Should show selection toolbar
      expect(screen.getByTestId('gallery-toolbar')).toBeInTheDocument();
    });

    it('compact preset works end-to-end', () => {
      render(
        <Gallery
          items={mockItems}
          preset="compact"
          actions={mockActions}
        />
      );

      // Should use list layout
      expect(screen.getByTestId('list-layout')).toBeInTheDocument();
      
      // Should not show filters (minimal UI)
      expect(screen.queryByTestId('gallery-header')).not.toBeInTheDocument();
    });
  });

  describe('Data Adapter Integration', () => {
    it('transforms data correctly with inspiration adapter', () => {
      const rawInspirationData = [
        {
          id: '1',
          title: 'Amazing Build',
          imageUrl: 'https://example.com/build.jpg',
          description: 'Cool build',
          author: 'Builder',
          tags: ['space'],
          createdAt: '2023-01-01T00:00:00Z',
          liked: true,
        },
      ];

      render(
        <Gallery
          items={rawInspirationData}
          adapter={GalleryAdapters.inspiration}
          actions={mockActions}
        />
      );

      expect(screen.getByText('Amazing Build')).toBeInTheDocument();
      expect(screen.getByText('Cool build')).toBeInTheDocument();
      expect(screen.getByText('Builder')).toBeInTheDocument();
    });

    it('handles invalid data with adapter validation', () => {
      const invalidData = [
        { id: '1', title: 'Valid Item', imageUrl: 'test.jpg', createdAt: new Date() },
        { id: '2' }, // Invalid - missing required fields
        { id: '3', title: 'Another Valid', imageUrl: 'test2.jpg', createdAt: new Date() },
      ];

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(
        <Gallery
          items={invalidData}
          adapter={GalleryAdapters.image}
          actions={mockActions}
        />
      );

      // Should only show valid items
      expect(screen.getByText('Valid Item')).toBeInTheDocument();
      expect(screen.getByText('Another Valid')).toBeInTheDocument();
      expect(screen.queryByText('Invalid Item')).not.toBeInTheDocument();

      // Should warn about invalid data
      expect(consoleWarnSpy).toHaveBeenCalledWith('Gallery: Invalid item data', { id: '2' });

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Error Recovery Workflows', () => {
    it('handles error state and recovery', async () => {
      const { rerender } = render(
        <Gallery
          items={[]}
          error="Network error"
          actions={mockActions}
        />
      );

      // Should show error state
      expect(screen.getByTestId('error-state')).toBeInTheDocument();

      // Click retry
      const retryButton = screen.getByTestId('retry-button');
      fireEvent.click(retryButton);

      expect(mockActions.onRefresh).toHaveBeenCalledTimes(1);

      // Simulate successful retry
      rerender(
        <Gallery
          items={mockItems}
          error={null}
          actions={mockActions}
        />
      );

      // Should show items now
      expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
      expect(screen.getByText('Space Station MOC')).toBeInTheDocument();
    });

    it('handles loading to content transition', async () => {
      const { rerender } = render(
        <Gallery
          items={[]}
          loading={true}
          actions={mockActions}
        />
      );

      // Should show loading state
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();

      // Simulate data loaded
      rerender(
        <Gallery
          items={mockItems}
          loading={false}
          actions={mockActions}
        />
      );

      // Should show content
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      expect(screen.getByText('Space Station MOC')).toBeInTheDocument();
    });
  });

  describe('Layout Switching Integration', () => {
    it('switches between different layouts', () => {
      const { rerender } = render(
        <Gallery
          items={mockItems}
          config={{ layout: 'grid' }}
          actions={mockActions}
        />
      );

      expect(screen.getByTestId('grid-layout')).toBeInTheDocument();

      // Switch to list layout
      rerender(
        <Gallery
          items={mockItems}
          config={{ layout: 'list' }}
          actions={mockActions}
        />
      );

      expect(screen.queryByTestId('grid-layout')).not.toBeInTheDocument();
      expect(screen.getByTestId('list-layout')).toBeInTheDocument();

      // Switch to table layout
      rerender(
        <Gallery
          items={mockItems}
          config={{ layout: 'table' }}
          actions={mockActions}
        />
      );

      expect(screen.queryByTestId('list-layout')).not.toBeInTheDocument();
      expect(screen.getByTestId('table-layout')).toBeInTheDocument();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('handles large number of items', () => {
      const manyItems = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
        imageUrl: `https://example.com/image${i}.jpg`,
        createdAt: new Date(),
      }));

      render(
        <Gallery
          items={manyItems}
          config={{ itemsPerPage: 20 }}
          actions={mockActions}
        />
      );

      // Should render without crashing
      expect(screen.getByText('Item 0')).toBeInTheDocument();
      expect(screen.getByText('Item 19')).toBeInTheDocument();
    });

    it('handles empty items array', () => {
      render(
        <Gallery
          items={[]}
          actions={mockActions}
        />
      );

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('handles rapid state changes', async () => {
      const { rerender } = render(
        <Gallery
          items={mockItems}
          selectedItems={[]}
          actions={mockActions}
        />
      );

      // Rapid selection changes
      rerender(<Gallery items={mockItems} selectedItems={['1']} actions={mockActions} />);
      rerender(<Gallery items={mockItems} selectedItems={['1', '2']} actions={mockActions} />);
      rerender(<Gallery items={mockItems} selectedItems={[]} actions={mockActions} />);

      // Should handle without errors
      expect(screen.getByText('Space Station MOC')).toBeInTheDocument();
    });
  });
});
