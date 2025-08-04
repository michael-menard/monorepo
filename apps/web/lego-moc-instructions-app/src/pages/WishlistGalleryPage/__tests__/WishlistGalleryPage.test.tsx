import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { WishlistGalleryPage } from '../index';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window events
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
});
Object.defineProperty(document, 'addEventListener', {
  value: mockAddEventListener,
});
Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
});
Object.defineProperty(document, 'removeEventListener', {
  value: mockRemoveEventListener,
});

// Mock setTimeout and clearTimeout
const mockSetTimeout = vi.fn();
const mockClearTimeout = vi.fn();
Object.defineProperty(global, 'setTimeout', {
  value: mockSetTimeout,
});
Object.defineProperty(global, 'clearTimeout', {
  value: mockClearTimeout,
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('WishlistGalleryPage Auto-Save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    mockSetTimeout.mockImplementation((fn, delay) => {
      // Don't call the real setTimeout to avoid infinite recursion
      // Just return a mock timeout ID
      return 123;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads saved data from localStorage on mount', () => {
    const savedItems = [
      {
        id: '1',
        name: 'Test Item',
        description: 'Test Description',
        price: 100,
        priority: 'high',
        category: 'Test',
        isPurchased: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedItems));
    
    renderWithRouter(<WishlistGalleryPage />);
    
    expect(localStorageMock.getItem).toHaveBeenCalledWith('wishlist_items');
    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  it('shows saving indicator when auto-save is triggered', async () => {
    renderWithRouter(<WishlistGalleryPage />);
    
    // Add a new item to trigger auto-save
    const addButton = screen.getByText('Add Item');
    fireEvent.click(addButton);
    
    // Fill in the form
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'New Test Item' } });
    
    // Submit the form
    const submitButton = screen.getByText('Save Item');
    fireEvent.click(submitButton);
    
    // Check that saving indicator appears
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  it('debounces save operations with 2 second delay', async () => {
    renderWithRouter(<WishlistGalleryPage />);
    
    // Add a new item
    const addButton = screen.getByText('Add Item');
    fireEvent.click(addButton);
    
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Item 1' } });
    
    // Change the name multiple times quickly
    fireEvent.change(nameInput, { target: { value: 'Test Item 2' } });
    fireEvent.change(nameInput, { target: { value: 'Test Item 3' } });
    
    // Submit the form
    const submitButton = screen.getByText('Save Item');
    fireEvent.click(submitButton);
    
    // Verify that setTimeout was called (debouncing)
    expect(mockSetTimeout).toHaveBeenCalled();
  });

  it('saves data to localStorage when items are modified', async () => {
    renderWithRouter(<WishlistGalleryPage />);
    
    // Add a new item
    const addButton = screen.getByText('Add Item');
    fireEvent.click(addButton);
    
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'New Test Item' } });
    
    const submitButton = screen.getByText('Save Item');
    fireEvent.click(submitButton);
    
    // Wait for auto-save to complete
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'wishlist_items',
        expect.stringContaining('New Test Item')
      );
    });
  });

  it('handles save errors gracefully', async () => {
    // Mock localStorage.setItem to throw an error
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });
    
    renderWithRouter(<WishlistGalleryPage />);
    
    // Add a new item
    const addButton = screen.getByText('Add Item');
    fireEvent.click(addButton);
    
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Item' } });
    
    const submitButton = screen.getByText('Save Item');
    fireEvent.click(submitButton);
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/Save failed/)).toBeInTheDocument();
    });
  });

  it('creates backup on page unload', () => {
    renderWithRouter(<WishlistGalleryPage />);
    
    // Simulate page unload
    const beforeUnloadEvent = new Event('beforeunload');
    window.dispatchEvent(beforeUnloadEvent);
    
    // Verify backup was created
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'wishlist_autosave_backup',
      expect.any(String)
    );
  });

  it('saves on visibility change when page becomes hidden', async () => {
    renderWithRouter(<WishlistGalleryPage />);
    
    // Add a new item
    const addButton = screen.getByText('Add Item');
    fireEvent.click(addButton);
    
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Item' } });
    
    const submitButton = screen.getByText('Save Item');
    fireEvent.click(submitButton);
    
    // Simulate page becoming hidden
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    });
    
    const visibilityChangeEvent = new Event('visibilitychange');
    document.dispatchEvent(visibilityChangeEvent);
    
    // Verify save was triggered
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  it('restores from backup on mount if available', () => {
    const backupData = [
      {
        id: '1',
        name: 'Backup Item',
        description: 'Backup Description',
        price: 100,
        priority: 'high',
        category: 'Backup',
        isPurchased: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    
    localStorageMock.getItem
      .mockReturnValueOnce(null) // First call for wishlist_items
      .mockReturnValueOnce(JSON.stringify(backupData)); // Second call for backup
    
    renderWithRouter(<WishlistGalleryPage />);
    
    // Verify backup was restored and cleaned up
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('wishlist_autosave_backup');
  });

  it('shows last save time after successful save', async () => {
    renderWithRouter(<WishlistGalleryPage />);
    
    // Add a new item
    const addButton = screen.getByText('Add Item');
    fireEvent.click(addButton);
    
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Item' } });
    
    const submitButton = screen.getByText('Save Item');
    fireEvent.click(submitButton);
    
    // Wait for save to complete and show success indicator
    await waitFor(() => {
      expect(screen.getByText(/Saved/)).toBeInTheDocument();
    });
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount } = renderWithRouter(<WishlistGalleryPage />);
    
    unmount();
    
    // Verify event listeners were removed
    expect(mockRemoveEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
}); 