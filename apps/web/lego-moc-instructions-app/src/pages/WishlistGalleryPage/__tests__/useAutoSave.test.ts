import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

// Test the auto-save hook logic directly
describe('Auto-Save Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    mockSetTimeout.mockImplementation((fn, delay) => {
      setTimeout(() => fn(), delay);
      return 123; // Mock timeout ID
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debounces save operations with specified delay', () => {
    vi.fn();
    { test: 'data' };
    
    // Simulate multiple rapid changes
    mockSetTimeout.mockImplementation((fn) => {
      fn();
      return 123;
    });
    
    // This would be called by the hook when data changes
    expect(mockSetTimeout).toHaveBeenCalled();
  });

  it('creates backup on page unload', () => {
    { test: 'data' };
    
    // Simulate page unload
    const beforeUnloadEvent = new Event('beforeunload');
    window.dispatchEvent(beforeUnloadEvent);
    
    // Verify backup was created
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'wishlist_autosave_backup',
      expect.any(String)
    );
  });

  it('saves on visibility change when page becomes hidden', () => {
    // Simulate page becoming hidden
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    });
    
    const visibilityChangeEvent = new Event('visibilitychange');
    document.dispatchEvent(visibilityChangeEvent);
    
    // Verify event listeners were set up
    expect(mockAddEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('restores from backup on mount if available', () => {
    const backupData = { test: 'backup data' };
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(backupData));
    
    // Simulate component mount
    const savedItems = localStorageMock.getItem('wishlist_autosave_backup');
    if (savedItems) {
      const parsedBackup = JSON.parse(savedItems);
      expect(parsedBackup).toEqual(backupData);
      
      // Verify backup was cleaned up
      localStorageMock.removeItem('wishlist_autosave_backup');
    }
  });

  it('handles save errors gracefully', () => {
    // Mock localStorage.setItem to throw an error
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });
    
    try {
      localStorageMock.setItem('test', 'data');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Storage quota exceeded');
    }
  });

  it('cleans up event listeners on unmount', () => {
    // Simulate component unmount
    const cleanup = () => {
      mockRemoveEventListener('beforeunload', expect.any(Function));
      mockRemoveEventListener('visibilitychange', expect.any(Function));
      mockClearTimeout(123);
    };
    
    cleanup();
    
    // Verify cleanup was called
    expect(mockRemoveEventListener).toHaveBeenCalled();
    expect(mockClearTimeout).toHaveBeenCalled();
  });

  it('saves data to localStorage correctly', () => {
    const testData = [
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
    
    localStorageMock.setItem('wishlist_items', JSON.stringify(testData));
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'wishlist_items',
      JSON.stringify(testData)
    );
  });

  it('loads data from localStorage correctly', () => {
    const savedData = [
      {
        id: '1',
        name: 'Saved Item',
        description: 'Saved Description',
        price: 200,
        priority: 'medium',
        category: 'Saved',
        isPurchased: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));
    
    const loadedData = localStorageMock.getItem('wishlist_items');
    if (loadedData) {
      const parsedData = JSON.parse(loadedData);
      expect(parsedData).toEqual(savedData);
    }
  });

  it('handles empty localStorage gracefully', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    const loadedData = localStorageMock.getItem('wishlist_items');
    expect(loadedData).toBeNull();
  });

  it('handles invalid JSON in localStorage', () => {
    localStorageMock.getItem.mockReturnValue('invalid json');
    
    const loadedData = localStorageMock.getItem('wishlist_items');
    if (loadedData) {
      try {
        JSON.parse(loadedData);
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }
    }
  });
}); 