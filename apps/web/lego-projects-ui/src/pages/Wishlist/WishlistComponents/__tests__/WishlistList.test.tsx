import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WishlistList, { reorder } from '../WishlistList.js';
import type { WishlistItem } from '../WishlistItemCard.js';
import { act } from 'react-dom/test-utils';
// @ts-expect-error
import * as wishlistApi from '../../../store/wishlistApi';

// Mock the RTK Query mutation from the main app
vi.mock('apps/web/lego-projects-ui/src/store/wishlistApi', () => ({
  useUpdateWishlistMutation: () => [vi.fn().mockResolvedValue({ success: true }), { isLoading: false, isError: false, isSuccess: true }],
}));

const mockItems: WishlistItem[] = [
  {
    id: '1',
    title: 'Falcon',
    description: 'Star Wars',
    productLink: 'https://lego.com/falcon',
    imageUrl: 'https://example.com/falcon.jpg',
    category: 'Star Wars',
    sortOrder: 0,
  },
  {
    id: '2',
    title: 'Castle',
    description: 'Medieval',
    productLink: 'https://lego.com/castle',
    imageUrl: 'https://example.com/castle.jpg',
    category: 'Castle',
    sortOrder: 1,
  },
  {
    id: '3',
    title: 'City',
    description: 'Modern',
    productLink: 'https://lego.com/city',
    imageUrl: 'https://example.com/city.jpg',
    category: 'City',
    sortOrder: 2,
  },
];

const persistKey = 'test-wishlist-items';

describe('WishlistList', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('reorder utility moves items and updates sortOrder', () => {
    const reordered = reorder(mockItems, 0, 2);
    expect(reordered[2].id).toBe('1'); // Falcon moved to last
    expect(reordered[0].id).toBe('2');
    expect(reordered[1].id).toBe('3');
    expect(reordered.map(i => i.sortOrder)).toEqual([0, 1, 2]);
  });

  it('renders all wishlist items (titles only)', () => {
    render(
      <WishlistList items={mockItems} persistKey={persistKey} />
    );
    const falconTitles = screen.getAllByText('Falcon').filter(el => el.tagName === 'H3');
    const castleTitles = screen.getAllByText('Castle').filter(el => el.tagName === 'H3');
    const cityTitles = screen.getAllByText('City').filter(el => el.tagName === 'H3');
    expect(falconTitles.length).toBe(1);
    expect(castleTitles.length).toBe(1);
    expect(cityTitles.length).toBe(1);
    expect(falconTitles[0]).toBeInTheDocument();
    expect(castleTitles[0]).toBeInTheDocument();
    expect(cityTitles[0]).toBeInTheDocument();
  });

  it('calls onEdit and onDelete when buttons are clicked', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <WishlistList items={mockItems} onEdit={onEdit} onDelete={onDelete} persistKey={persistKey} />
    );
    fireEvent.click(screen.getAllByLabelText('Edit item')[0]);
    expect(onEdit).toHaveBeenCalledWith('1');
    fireEvent.click(screen.getAllByLabelText('Delete item')[1]);
    expect(onDelete).toHaveBeenCalledWith('2');
  });

  it('reorder logic can be used to simulate optimistic UI update', () => {
    // Simulate moving last item to first
    const reordered = reorder(mockItems, 2, 0);
    expect(reordered[0].id).toBe('3');
    expect(reordered[1].id).toBe('1');
    expect(reordered[2].id).toBe('2');
  });

  it('debounces auto-save and calls backend only once for rapid changes', async () => {
    const updateWishlist = vi.fn().mockResolvedValue({ success: true });
    vi.mocked(wishlistApi.useUpdateWishlistMutation).mockReturnValue([updateWishlist, { isLoading: false, isError: false, isSuccess: true }]);
    render(<WishlistList items={mockItems} persistKey={persistKey} />);
    // Simulate reorder
    act(() => {
      fireEvent.click(screen.getAllByLabelText('Edit item')[0]);
    });
    // Simulate rapid changes
    act(() => {
      fireEvent.click(screen.getAllByLabelText('Edit item')[1]);
    });
    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(updateWishlist).toHaveBeenCalledTimes(1);
  });

  it('updates localStorage after successful backend save', async () => {
    const updateWishlist = vi.fn().mockResolvedValue({ success: true });
    vi.mocked(wishlistApi.useUpdateWishlistMutation).mockReturnValue([updateWishlist, { isLoading: false, isError: false, isSuccess: true }]);
    render(<WishlistList items={mockItems} persistKey={persistKey} />);
    act(() => {
      fireEvent.click(screen.getAllByLabelText('Edit item')[0]);
      vi.advanceTimersByTime(2000);
    });
    expect(localStorage.getItem(persistKey)).not.toBeNull();
  });

  it('loads from localStorage on mount if present', () => {
    localStorage.setItem(persistKey, JSON.stringify(mockItems));
    render(<WishlistList items={mockItems} persistKey={persistKey} />);
    expect(screen.getByText('Falcon')).toBeInTheDocument();
  });

  it('flushes unsaved changes on page unload', () => {
    const updateWishlist = vi.fn().mockResolvedValue({ success: true });
    vi.mocked(wishlistApi.useUpdateWishlistMutation).mockReturnValue([updateWishlist, { isLoading: false, isError: false, isSuccess: true }]);
    render(<WishlistList items={mockItems} persistKey={persistKey} />);
    // Simulate change
    act(() => {
      fireEvent.click(screen.getAllByLabelText('Edit item')[0]);
    });
    // Simulate beforeunload
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    expect(updateWishlist).toHaveBeenCalled();
  });

  it('handles empty list gracefully', () => {
    render(<WishlistList items={[]} persistKey={persistKey} />);
    expect(screen.queryAllByRole('button').length).toBe(0);
  });

  it('handles single-item list', () => {
    render(<WishlistList items={[mockItems[0]]} persistKey={persistKey} />);
    expect(screen.getByText('Falcon')).toBeInTheDocument();
  });

  it('does not call backend if no changes', () => {
    const updateWishlist = vi.fn();
    vi.mocked(wishlistApi.useUpdateWishlistMutation).mockReturnValue([updateWishlist, { isLoading: false, isError: false, isSuccess: true }]);
    render(<WishlistList items={mockItems} persistKey={persistKey} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(updateWishlist).not.toHaveBeenCalled();
  });

  it('handles backend error gracefully', async () => {
    const updateWishlist = vi.fn().mockRejectedValue(new Error('fail'));
    vi.mocked(wishlistApi.useUpdateWishlistMutation).mockReturnValue([updateWishlist, { isLoading: false, isError: true, isSuccess: false, error: new Error('fail') }]);
    render(<WishlistList items={mockItems} persistKey={persistKey} />);
    act(() => {
      fireEvent.click(screen.getAllByLabelText('Edit item')[0]);
      vi.advanceTimersByTime(2000);
    });
    // Should not throw, and localStorage should still be updated
    expect(localStorage.getItem(persistKey)).not.toBeNull();
  });
}); 