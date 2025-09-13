import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Gallery } from '../Gallery';
import type { GalleryItem, GalleryActions } from '../../../types/index';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
  LayoutGroup: ({ children }: any) => children,
}));

// Mock child components
vi.mock('../layouts/GridLayout', () => ({
  GridLayout: ({ items, actions }: any) => (
    <div data-testid="grid-layout">
      {items.map((item: any) => (
        <div key={item.id} data-testid={`item-${item.id}`} onClick={() => actions.onItemClick?.(item)}>
          {item.title}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../GalleryHeader', () => ({
  GalleryHeader: () => <div data-testid="gallery-header">Header</div>,
}));

vi.mock('../GalleryToolbar', () => ({
  GalleryToolbar: ({ onSelectAll, onClearSelection }: any) => (
    <div data-testid="gallery-toolbar">
      <button onClick={onSelectAll} data-testid="select-all">Select All</button>
      <button onClick={onClearSelection} data-testid="clear-selection">Clear</button>
    </div>
  ),
}));

vi.mock('../LoadingState', () => ({
  LoadingState: () => <div data-testid="loading-state">Loading...</div>,
}));

vi.mock('../ErrorState', () => ({
  ErrorState: ({ onRetry }: any) => (
    <div data-testid="error-state">
      <button onClick={onRetry} data-testid="retry-button">Retry</button>
    </div>
  ),
}));

vi.mock('../EmptyState', () => ({
  EmptyState: () => <div data-testid="empty-state">No items</div>,
}));

describe('Gallery', () => {
  const mockItems: GalleryItem[] = [
    {
      id: '1',
      title: 'Test Item 1',
      imageUrl: 'https://example.com/image1.jpg',
      createdAt: new Date('2023-01-01'),
    },
    {
      id: '2',
      title: 'Test Item 2',
      imageUrl: 'https://example.com/image2.jpg',
      createdAt: new Date('2023-01-02'),
    },
  ];

  const mockActions: GalleryActions = {
    onItemClick: vi.fn(),
    onItemLike: vi.fn(),
    onItemShare: vi.fn(),
    onItemDelete: vi.fn(),
    onItemsSelected: vi.fn(),
    onRefresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders gallery with items', () => {
      render(<Gallery items={mockItems} actions={mockActions} />);
      
      expect(screen.getByTestId('grid-layout')).toBeInTheDocument();
      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-2')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(
        <Gallery items={mockItems} className="custom-gallery" />
      );
      
      expect(container.firstChild).toHaveClass('gallery-container', 'custom-gallery');
    });

    it('renders with default grid layout when no config provided', () => {
      render(<Gallery items={mockItems} />);
      
      expect(screen.getByTestId('grid-layout')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading state when loading is true', () => {
      render(<Gallery items={[]} loading={true} />);
      
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
      expect(screen.queryByTestId('grid-layout')).not.toBeInTheDocument();
    });

    it('shows loading indicator for infinite scroll', () => {
      render(<Gallery items={mockItems} loading={true} />);
      
      expect(screen.getByTestId('grid-layout')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('shows error state when error is provided', () => {
      render(<Gallery items={[]} error="Something went wrong" actions={mockActions} />);
      
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.queryByTestId('grid-layout')).not.toBeInTheDocument();
    });

    it('calls onRefresh when retry button is clicked', () => {
      render(<Gallery items={[]} error="Error" actions={mockActions} />);
      
      fireEvent.click(screen.getByTestId('retry-button'));
      expect(mockActions.onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no items and not loading', () => {
      render(<Gallery items={[]} />);
      
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('does not show empty state when loading', () => {
      render(<Gallery items={[]} loading={true} />);
      
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    });
  });

  describe('Configuration', () => {
    it('applies custom configuration', () => {
      const config = {
        layout: 'grid' as const,
        selectable: true,
        filterConfig: {
          searchable: true,
        },
      };

      render(<Gallery items={mockItems} config={config} />);
      
      expect(screen.getByTestId('gallery-header')).toBeInTheDocument();
      expect(screen.getByTestId('gallery-toolbar')).toBeInTheDocument();
    });

    it('uses preset configuration', () => {
      render(<Gallery items={mockItems} preset="inspiration" />);
      
      expect(screen.getByTestId('grid-layout')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('handles internal selection state', async () => {
      const config = { selectable: true };
      render(<Gallery items={mockItems} config={config} actions={mockActions} />);
      
      fireEvent.click(screen.getByTestId('select-all'));
      
      await waitFor(() => {
        expect(mockActions.onItemsSelected).toHaveBeenCalledWith(['1', '2']);
      });
    });

    it('handles external selection state', () => {
      const config = { selectable: true };
      render(
        <Gallery 
          items={mockItems} 
          config={config} 
          selectedItems={['1']} 
          actions={mockActions} 
        />
      );
      
      fireEvent.click(screen.getByTestId('clear-selection'));
      
      expect(mockActions.onItemsSelected).toHaveBeenCalledWith([]);
    });
  });

  describe('Item Interactions', () => {
    it('handles item click', () => {
      render(<Gallery items={mockItems} actions={mockActions} />);
      
      fireEvent.click(screen.getByTestId('item-1'));
      
      expect(mockActions.onItemClick).toHaveBeenCalledWith(mockItems[0]);
    });
  });

  describe('Data Transformation', () => {
    it('transforms items using adapter', () => {
      const mockAdapter = {
        transform: vi.fn((item) => ({
          ...item,
          title: `Transformed: ${item.title}`,
        })),
        validate: vi.fn(() => true),
      };

      const rawItems = [{ id: '1', title: 'Raw Item', imageUrl: 'test.jpg', createdAt: new Date() }];
      
      render(<Gallery items={rawItems} adapter={mockAdapter} />);
      
      expect(mockAdapter.transform).toHaveBeenCalledWith(rawItems[0]);
      expect(screen.getByText('Transformed: Raw Item')).toBeInTheDocument();
    });

    it('filters out invalid items when using adapter', () => {
      const mockAdapter = {
        transform: vi.fn((item) => item),
        validate: vi.fn((item) => (item as any).id !== '2'),
      };

      render(<Gallery items={mockItems} adapter={mockAdapter} />);
      
      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.queryByTestId('item-2')).not.toBeInTheDocument();
    });
  });
});
