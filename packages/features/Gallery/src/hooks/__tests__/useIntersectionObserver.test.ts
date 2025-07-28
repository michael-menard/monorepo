import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useIntersectionObserver } from '../useIntersectionObserver.js';

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
const mockDisconnect = vi.fn();
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  
  // Mock IntersectionObserver
  mockIntersectionObserver.mockReturnValue({
    disconnect: mockDisconnect,
    observe: mockObserve,
    unobserve: mockUnobserve,
  });

  // Mock window.IntersectionObserver
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: mockIntersectionObserver,
  });
});

describe('useIntersectionObserver', () => {
  it('creates an IntersectionObserver with default options', () => {
    const callback = vi.fn();
    
    renderHook(() => useIntersectionObserver(callback));

    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      {
        threshold: 0.1,
        rootMargin: '0px',
      },
    );
  });

  it('creates an IntersectionObserver with custom options', () => {
    const callback = vi.fn();
    const options = {
      threshold: 0.5,
      rootMargin: '50px',
    };

    renderHook(() => useIntersectionObserver(callback, options));

    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      options,
    );
  });

  it('observes the ref element', () => {
    const callback = vi.fn();
    
    const { result } = renderHook(() => useIntersectionObserver(callback));

    expect(mockObserve).toHaveBeenCalledWith(result.current.ref.current);
  });

  it('unobserves the element on cleanup', () => {
    const callback = vi.fn();
    
    const { result, unmount } = renderHook(() => useIntersectionObserver(callback));

    unmount();

    expect(mockUnobserve).toHaveBeenCalledWith(result.current.ref.current);
  });

  it('calls the callback when intersection occurs', () => {
    const callback = vi.fn();
    
    renderHook(() => useIntersectionObserver(callback));

    // Get the intersection callback
    const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];
    
    // Simulate intersection
    const mockEntry = { isIntersecting: true };
    intersectionCallback([mockEntry]);

    expect(callback).toHaveBeenCalledWith(true);
  });

  it('calls the callback when intersection ends', () => {
    const callback = vi.fn();
    
    renderHook(() => useIntersectionObserver(callback));

    // Get the intersection callback
    const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];
    
    // Simulate no intersection
    const mockEntry = { isIntersecting: false };
    intersectionCallback([mockEntry]);

    expect(callback).toHaveBeenCalledWith(false);
  });

  it('handles multiple entries', () => {
    const callback = vi.fn();
    
    renderHook(() => useIntersectionObserver(callback));

    // Get the intersection callback
    const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];
    
    // Simulate multiple entries
    const mockEntries = [
      { isIntersecting: true },
      { isIntersecting: false },
    ];
    intersectionCallback(mockEntries);

    expect(callback).toHaveBeenCalledWith(true);
    expect(callback).toHaveBeenCalledWith(false);
  });

  it('does not create observer when window is undefined', () => {
    const callback = vi.fn();
    
    // Mock window as undefined
    const originalWindow = global.window;
    delete (global as any).window;

    renderHook(() => useIntersectionObserver(callback));

    expect(mockIntersectionObserver).not.toHaveBeenCalled();

    // Restore window
    global.window = originalWindow;
  });

  it('returns a ref', () => {
    const callback = vi.fn();
    
    const { result } = renderHook(() => useIntersectionObserver(callback));

    expect(result.current.ref).toBeDefined();
    expect(result.current.ref.current).toBeNull();
  });
}); 