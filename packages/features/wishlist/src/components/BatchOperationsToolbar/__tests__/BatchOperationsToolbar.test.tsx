import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BatchOperationsToolbar from '../index.js';

// Mock the RTK Query hooks
vi.mock('../../../store/wishlistApi.js', () => ({
  useBatchDeleteWishlistItemsMutation: () => [
    vi.fn().mockResolvedValue({ data: { message: 'Success', deletedIds: ['1', '2'] } }),
  ],
  useBatchTogglePurchasedMutation: () => [
    vi.fn().mockResolvedValue({ data: { message: 'Success', updatedIds: ['1', '2'] } }),
  ],
  useBatchUpdateWishlistItemsMutation: () => [
    vi.fn().mockResolvedValue({ data: { message: 'Success', updatedIds: ['1', '2'] } }),
  ],
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock UI components
vi.mock('@repo/ui', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

describe('BatchOperationsToolbar', () => {
  const defaultProps = {
    selectedItems: ['1', '2', '3'],
    totalItems: 10,
    wishlistId: 'test-wishlist-id',
    onClearSelection: vi.fn(),
    onItemsDeleted: vi.fn(),
    onItemsUpdated: vi.fn(),
    onItemsToggled: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when items are selected', () => {
    render(<BatchOperationsToolbar {...defaultProps} />);
    
    expect(screen.getByText('3 of 10 selected')).toBeInTheDocument();
    expect(screen.getByText('Mark Purchased')).toBeInTheDocument();
    expect(screen.getByText('Mark Not Purchased')).toBeInTheDocument();
    expect(screen.getByText('Update Priority')).toBeInTheDocument();
    expect(screen.getByText('Update Category')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('does not render when no items are selected', () => {
    render(<BatchOperationsToolbar {...defaultProps} selectedItems={[]} />);
    
    expect(screen.queryByText('0 of 10 selected')).not.toBeInTheDocument();
  });

  it('calls onClearSelection when Clear button is clicked', () => {
    render(<BatchOperationsToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Clear'));
    
    expect(defaultProps.onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('shows delete confirmation on first delete click', () => {
    render(<BatchOperationsToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Delete'));
    
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
  });

  it('handles batch delete operation', async () => {
    render(<BatchOperationsToolbar {...defaultProps} />);
    
    // First click shows confirmation
    fireEvent.click(screen.getByText('Delete'));
    
    // Second click confirms and executes
    fireEvent.click(screen.getByText('Confirm Delete'));
    
    await waitFor(() => {
      expect(defaultProps.onItemsDeleted).toHaveBeenCalledWith(['1', '2', '3']);
    });
  });

  it('handles batch toggle purchased operation', async () => {
    render(<BatchOperationsToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mark Purchased'));
    
    await waitFor(() => {
      expect(defaultProps.onItemsToggled).toHaveBeenCalledWith(['1', '2', '3'], true);
    });
  });

  it('handles batch toggle not purchased operation', async () => {
    render(<BatchOperationsToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mark Not Purchased'));
    
    await waitFor(() => {
      expect(defaultProps.onItemsToggled).toHaveBeenCalledWith(['1', '2', '3'], false);
    });
  });

  it('shows priority update dialog', () => {
    render(<BatchOperationsToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Update Priority'));
    
    // disambiguate heading vs button label by selecting the dialog heading
    expect(screen.getByRole('heading', { name: 'Update Priority' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Medium')).toBeInTheDocument();
  });

  it('handles priority update', async () => {
    render(<BatchOperationsToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Update Priority'));
    
    const select = screen.getByDisplayValue('Medium');
    fireEvent.change(select, { target: { value: 'high' } });
    
    fireEvent.click(screen.getByText('Update'));
    
    await waitFor(() => {
      expect(defaultProps.onItemsUpdated).toHaveBeenCalledWith(['1', '2', '3']);
    });
  });

  it('shows category update dialog', () => {
    render(<BatchOperationsToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Update Category'));
    
    expect(screen.getByRole('heading', { name: 'Update Category' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter category name')).toBeInTheDocument();
  });

  it('handles category update', async () => {
    render(<BatchOperationsToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Update Category'));
    
    const input = screen.getByPlaceholderText('Enter category name');
    fireEvent.change(input, { target: { value: 'Electronics' } });
    
    fireEvent.click(screen.getByText('Update'));
    
    await waitFor(() => {
      expect(defaultProps.onItemsUpdated).toHaveBeenCalledWith(['1', '2', '3']);
    });
  });

  it('cancels priority update dialog', () => {
    render(<BatchOperationsToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Update Priority'));
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(screen.queryByRole('heading', { name: 'Update Priority' })).not.toBeInTheDocument();
  });

  it('cancels category update dialog', () => {
    render(<BatchOperationsToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Update Category'));
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(screen.queryByRole('heading', { name: 'Update Category' })).not.toBeInTheDocument();
  });
}); 