import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAlbumDragAndDrop } from '../useAlbumDragAndDrop.js';

describe('useAlbumDragAndDrop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with correct state', () => {
    const { result } = renderHook(() => useAlbumDragAndDrop());

    expect(result.current.state.isDragOver).toBe(false);
    expect(result.current.state.isDragging).toBe(false);
    expect(result.current.state.draggedImages).toEqual([]);
  });

  it('handles drag start correctly', () => {
    const { result } = renderHook(() => useAlbumDragAndDrop());

    const mockEvent = {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: '',
      },
    } as any;

    const imageIds = ['1', '2', '3'];

    act(() => {
      result.current.actions.handleDragStart(mockEvent, imageIds);
    });

    expect(mockEvent.dataTransfer.setData).toHaveBeenCalledWith(
      'application/json',
      JSON.stringify({
        type: 'gallery-image',
        imageIds,
        source: 'gallery',
      }),
    );
    expect(mockEvent.dataTransfer.effectAllowed).toBe('copy');
    expect(result.current.state.isDragging).toBe(true);
    expect(result.current.state.draggedImages).toEqual(imageIds);
  });

  it('handles drag over correctly', () => {
    const { result } = renderHook(() => useAlbumDragAndDrop());

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        dropEffect: '',
      },
    } as any;

    act(() => {
      result.current.actions.handleDragOver(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(mockEvent.dataTransfer.dropEffect).toBe('copy');
  });

  it('handles drag enter with gallery images', () => {
    const { result } = renderHook(() => useAlbumDragAndDrop());

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        types: ['application/json'],
      },
    } as any;

    act(() => {
      result.current.actions.handleDragEnter(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(result.current.state.isDragOver).toBe(true);
  });

  it('handles drag enter without gallery images', () => {
    const { result } = renderHook(() => useAlbumDragAndDrop());

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        types: ['text/plain'],
      },
    } as any;

    act(() => {
      result.current.actions.handleDragEnter(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(result.current.state.isDragOver).toBe(false);
  });

  it('handles drag leave correctly', () => {
    const { result } = renderHook(() => useAlbumDragAndDrop());

    // First enter drag
    const enterEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        types: ['application/json'],
      },
    } as any;

    act(() => {
      result.current.actions.handleDragEnter(enterEvent);
    });

    expect(result.current.state.isDragOver).toBe(true);

    // Then leave drag
    const leaveEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as any;

    act(() => {
      result.current.actions.handleDragLeave(leaveEvent);
    });

    expect(leaveEvent.preventDefault).toHaveBeenCalled();
    expect(leaveEvent.stopPropagation).toHaveBeenCalled();
    expect(result.current.state.isDragOver).toBe(false);
  });

  it('handles multiple drag enter/leave events correctly', () => {
    const { result } = renderHook(() => useAlbumDragAndDrop());

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        types: ['application/json'],
      },
    } as any;

    // First enter
    act(() => {
      result.current.actions.handleDragEnter(mockEvent);
    });
    expect(result.current.state.isDragOver).toBe(true);

    // Second enter (nested element)
    act(() => {
      result.current.actions.handleDragEnter(mockEvent);
    });
    expect(result.current.state.isDragOver).toBe(true);

    // First leave (nested element)
    act(() => {
      result.current.actions.handleDragLeave(mockEvent);
    });
    expect(result.current.state.isDragOver).toBe(true);

    // Second leave (outer element)
    act(() => {
      result.current.actions.handleDragLeave(mockEvent);
    });
    expect(result.current.state.isDragOver).toBe(false);
  });

  it('handles drop with valid gallery image data', () => {
    const { result } = renderHook(() => useAlbumDragAndDrop());

    const onImagesDropped = vi.fn();
    const imageIds = ['1', '2'];

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        getData: vi.fn().mockReturnValue(
          JSON.stringify({
            type: 'gallery-image',
            imageIds,
            source: 'gallery',
          }),
        ),
      },
    } as any;

    act(() => {
      result.current.actions.handleDrop(mockEvent, onImagesDropped);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(onImagesDropped).toHaveBeenCalledWith(imageIds);
    expect(result.current.state.isDragOver).toBe(false);
    expect(result.current.state.isDragging).toBe(false);
    expect(result.current.state.draggedImages).toEqual([]);
  });

  it('handles drop with invalid data gracefully', () => {
    const { result } = renderHook(() => useAlbumDragAndDrop());

    const onImagesDropped = vi.fn();
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        getData: vi.fn().mockReturnValue('invalid json'),
      },
    } as any;

    act(() => {
      result.current.actions.handleDrop(mockEvent, onImagesDropped);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(onImagesDropped).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid drag data format:', expect.any(Error));
    expect(result.current.state.isDragOver).toBe(false);

    consoleWarnSpy.mockRestore();
  });

  it('handles drop with empty image ids', () => {
    const { result } = renderHook(() => useAlbumDragAndDrop());

    const onImagesDropped = vi.fn();

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        getData: vi.fn().mockReturnValue(
          JSON.stringify({
            type: 'gallery-image',
            imageIds: [],
            source: 'gallery',
          }),
        ),
      },
    } as any;

    act(() => {
      result.current.actions.handleDrop(mockEvent, onImagesDropped);
    });

    expect(onImagesDropped).not.toHaveBeenCalled();
    expect(result.current.state.isDragOver).toBe(false);
  });

  it('handles drop with no data', () => {
    const { result } = renderHook(() => useAlbumDragAndDrop());

    const onImagesDropped = vi.fn();

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        getData: vi.fn().mockReturnValue(''),
      },
    } as any;

    act(() => {
      result.current.actions.handleDrop(mockEvent, onImagesDropped);
    });

    expect(onImagesDropped).not.toHaveBeenCalled();
    expect(result.current.state.isDragOver).toBe(false);
  });

  it('provides drag area props', () => {
    const { result } = renderHook(() => useAlbumDragAndDrop());

    expect(result.current.actions.dragAreaProps).toEqual({
      onDragOver: expect.any(Function),
      onDragEnter: expect.any(Function),
      onDragLeave: expect.any(Function),
      onDrop: expect.any(Function),
    });
  });

  it('validates drag data schema correctly', () => {
    const { result } = renderHook(() => useAlbumDragAndDrop());

    const onImagesDropped = vi.fn();
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Test with invalid schema (missing required fields)
    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        getData: vi.fn().mockReturnValue(
          JSON.stringify({
            type: 'gallery-image',
            // missing imageIds and source
          }),
        ),
      },
    } as any;

    act(() => {
      result.current.actions.handleDrop(mockEvent, onImagesDropped);
    });

    expect(onImagesDropped).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid drag data format:', expect.any(Error));

    consoleWarnSpy.mockRestore();
  });
}); 