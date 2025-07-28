import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileUpload } from '../hooks/useFileUpload';
import { useMetadataFields } from '../hooks/useMetadataFields';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { useUploadProgress } from '../hooks/useUploadProgress';

// Mock file creation
const createMockFile = (name: string, size: number, type: string): File => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('FileUpload Hooks', () => {
  describe('useFileUpload', () => {
    const mockOnUpload = vi.fn();
    const mockOnError = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('initializes with empty state', () => {
      const { result } = renderHook(() =>
        useFileUpload({ accept: 'image/*', maxSizeMB: 10 }, mockOnUpload)
      );

      expect(result.current.state.files).toEqual([]);
      expect(result.current.state.isUploading).toBe(false);
      expect(result.current.state.errors).toEqual([]);
    });

    it('adds files successfully', () => {
      const { result } = renderHook(() =>
        useFileUpload({ accept: 'image/*', maxSizeMB: 10 }, mockOnUpload)
      );

      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');

      act(() => {
        result.current.actions.addFiles([file]);
      });

      expect(result.current.state.files).toHaveLength(1);
      expect(result.current.state.files[0]).toBe(file);
      expect(result.current.state.errors).toEqual([]);
    });

    it('validates file size and rejects oversized files', () => {
      const { result } = renderHook(() =>
        useFileUpload({ accept: 'image/*', maxSizeMB: 1 }, mockOnUpload)
      );

      const largeFile = createMockFile('large.jpg', 2 * 1024 * 1024, 'image/jpeg');

      act(() => {
        result.current.actions.addFiles([largeFile]);
      });

      expect(result.current.state.files).toHaveLength(0);
      expect(result.current.state.errors).toHaveLength(1);
      expect(result.current.state.errors[0]).toContain('too large');
    });

    it('validates file type and rejects invalid types', () => {
      const { result } = renderHook(() =>
        useFileUpload({ accept: 'image/*', maxSizeMB: 10 }, mockOnUpload)
      );

      const textFile = createMockFile('test.txt', 1024, 'text/plain');

      act(() => {
        result.current.actions.addFiles([textFile]);
      });

      expect(result.current.state.files).toHaveLength(0);
      expect(result.current.state.errors).toHaveLength(1);
      expect(result.current.state.errors[0]).toContain('not an accepted file type');
    });

    it('removes files correctly', () => {
      const { result } = renderHook(() =>
        useFileUpload({ accept: 'image/*', maxSizeMB: 10 }, mockOnUpload)
      );

      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');

      act(() => {
        result.current.actions.addFiles([file]);
      });

      expect(result.current.state.files).toHaveLength(1);

      act(() => {
        result.current.actions.removeFile(file);
      });

      expect(result.current.state.files).toHaveLength(0);
    });

    it('handles single file mode correctly', () => {
      const { result } = renderHook(() =>
        useFileUpload({ accept: 'image/*', maxSizeMB: 10, multiple: false }, mockOnUpload)
      );

      const file1 = createMockFile('test1.jpg', 1024 * 1024, 'image/jpeg');
      const file2 = createMockFile('test2.jpg', 1024 * 1024, 'image/jpeg');

      act(() => {
        result.current.actions.addFiles([file1, file2]);
      });

      expect(result.current.state.files).toHaveLength(1);
      expect(result.current.state.files[0]).toBe(file1);
    });

    it('calls onUpload with correct parameters', async () => {
      const { result } = renderHook(() =>
        useFileUpload({ accept: 'image/*', maxSizeMB: 10 }, mockOnUpload)
      );

      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');

      act(() => {
        result.current.actions.addFiles([file]);
      });

      await act(async () => {
        await result.current.actions.upload({ title: 'Test' });
      });

      expect(mockOnUpload).toHaveBeenCalledWith(file, { title: 'Test' });
    });

    it('handles upload errors', async () => {
      const errorUpload = vi.fn().mockRejectedValue(new Error('Upload failed'));
      const { result } = renderHook(() =>
        useFileUpload({ accept: 'image/*', maxSizeMB: 10, onError: mockOnError }, errorUpload)
      );

      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');

      act(() => {
        result.current.actions.addFiles([file]);
      });

      await act(async () => {
        await result.current.actions.upload();
      });

      expect(result.current.state.errors).toHaveLength(1);
      expect(result.current.state.errors[0]).toBe('Upload failed');
      expect(mockOnError).toHaveBeenCalledWith('Upload failed');
    });
  });

  describe('useMetadataFields', () => {
    const metadataFields = [
      { name: 'title', label: 'Title', type: 'text' as const, required: true },
      { name: 'category', label: 'Category', type: 'select' as const, options: ['Art', 'Nature'] },
    ];

    it('initializes with empty state', () => {
      const { result } = renderHook(() => useMetadataFields(metadataFields));

      expect(result.current.state.values).toEqual({});
      expect(result.current.state.errors).toEqual({});
      expect(result.current.state.isValid).toBe(true);
    });

    it('updates field values', () => {
      const { result } = renderHook(() => useMetadataFields(metadataFields));

      act(() => {
        result.current.actions.updateField('title', 'Test Title');
      });

      expect(result.current.state.values.title).toBe('Test Title');
      // The field should be valid since it has a value
      expect(result.current.state.errors.title).toBeUndefined();
    });

    it('validates required fields', () => {
      const { result } = renderHook(() => useMetadataFields(metadataFields));

      act(() => {
        result.current.actions.updateField('title', '');
      });

      expect(result.current.state.errors.title).toBe('Title is required');
      expect(result.current.state.isValid).toBe(false);
    });

    it('validates number fields', () => {
      const { result } = renderHook(() => useMetadataFields([
        { name: 'count', label: 'Count', type: 'number' as const }
      ]));

      act(() => {
        result.current.actions.updateField('count', 'invalid');
      });

      // The validation should happen immediately when the field is updated
      expect(result.current.state.errors.count).toBe('Count must be a valid number');
    });

    it('validates all fields', () => {
      const { result } = renderHook(() => useMetadataFields(metadataFields));

      act(() => {
        result.current.actions.validateAll();
      });

      expect(result.current.state.errors.title).toBe('Title is required');
      expect(result.current.state.isValid).toBe(false);
    });

    it('resets state', () => {
      const { result } = renderHook(() => useMetadataFields(metadataFields));

      act(() => {
        result.current.actions.updateField('title', 'Test');
      });

      expect(result.current.state.values.title).toBe('Test');

      act(() => {
        result.current.actions.reset();
      });

      expect(result.current.state.values).toEqual({});
      expect(result.current.state.errors).toEqual({});
      expect(result.current.state.isValid).toBe(true);
    });
  });

  describe('useDragAndDrop', () => {
    it('initializes with correct state', () => {
      const { result } = renderHook(() => useDragAndDrop());

      expect(result.current.state.isDragOver).toBe(false);
      expect(result.current.state.isDragging).toBe(false);
    });

    it('handles drag enter events', () => {
      const { result } = renderHook(() => useDragAndDrop());

      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          items: [{ type: 'file' }],
        },
      } as any;

      act(() => {
        result.current.actions.handleDragEnter(mockEvent);
      });

      expect(result.current.state.isDragOver).toBe(true);
      expect(result.current.state.isDragging).toBe(true);
    });

    it('handles drag leave events', () => {
      const { result } = renderHook(() => useDragAndDrop());

      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          items: [{ type: 'file' }],
        },
      } as any;

      // First enter drag
      act(() => {
        result.current.actions.handleDragEnter(mockEvent);
      });

      expect(result.current.state.isDragOver).toBe(true);

      // Then leave drag
      act(() => {
        result.current.actions.handleDragLeave(mockEvent);
      });

      expect(result.current.state.isDragOver).toBe(false);
      expect(result.current.state.isDragging).toBe(false);
    });

    it('handles drop events', () => {
      const { result } = renderHook(() => useDragAndDrop());

      const mockFiles = [createMockFile('test.jpg', 1024 * 1024, 'image/jpeg')];
      const mockOnFilesDrop = vi.fn();

      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          files: mockFiles,
        },
      } as any;

      act(() => {
        result.current.actions.handleDrop(mockEvent, mockOnFilesDrop);
      });

      expect(mockOnFilesDrop).toHaveBeenCalledWith(mockFiles);
      expect(result.current.state.isDragOver).toBe(false);
      expect(result.current.state.isDragging).toBe(false);
    });
  });

  describe('useUploadProgress', () => {
    it('initializes with correct state', () => {
      const { result } = renderHook(() => useUploadProgress());

      expect(result.current.state.progress.size).toBe(0);
      expect(result.current.state.overallProgress).toBe(0);
      expect(result.current.state.isUploading).toBe(false);
      expect(result.current.state.completedFiles).toBe(0);
      expect(result.current.state.totalFiles).toBe(0);
    });

    it('starts upload correctly', () => {
      const { result } = renderHook(() => useUploadProgress());

      const files = [
        createMockFile('test1.jpg', 1024 * 1024, 'image/jpeg'),
        createMockFile('test2.jpg', 1024 * 1024, 'image/jpeg'),
      ];

      act(() => {
        result.current.actions.startUpload(files);
      });

      expect(result.current.state.progress.size).toBe(2);
      expect(result.current.state.isUploading).toBe(true);
      expect(result.current.state.totalFiles).toBe(2);
      expect(result.current.state.completedFiles).toBe(0);
    });

    it('updates progress correctly', () => {
      const { result } = renderHook(() => useUploadProgress());

      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');

      act(() => {
        result.current.actions.startUpload([file]);
      });

      act(() => {
        result.current.actions.updateProgress(file, 50);
      });

      const fileProgress = result.current.actions.getFileProgress(file);
      expect(fileProgress?.progress).toBe(50);
      expect(fileProgress?.status).toBe('uploading');
      expect(result.current.state.overallProgress).toBe(50);
    });

    it('completes upload correctly', () => {
      const { result } = renderHook(() => useUploadProgress());

      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');

      act(() => {
        result.current.actions.startUpload([file]);
      });

      act(() => {
        result.current.actions.completeUpload(file);
      });

      const fileProgress = result.current.actions.getFileProgress(file);
      expect(fileProgress?.progress).toBe(100);
      expect(fileProgress?.status).toBe('completed');
      expect(result.current.state.completedFiles).toBe(1);
      expect(result.current.state.isUploading).toBe(false);
    });

    it('handles upload failures', () => {
      const { result } = renderHook(() => useUploadProgress());

      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');

      act(() => {
        result.current.actions.startUpload([file]);
      });

      act(() => {
        result.current.actions.failUpload(file, 'Network error');
      });

      const fileProgress = result.current.actions.getFileProgress(file);
      expect(fileProgress?.status).toBe('error');
      expect(fileProgress?.error).toBe('Network error');
    });

    it('resets progress correctly', () => {
      const { result } = renderHook(() => useUploadProgress());

      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');

      act(() => {
        result.current.actions.startUpload([file]);
      });

      expect(result.current.state.isUploading).toBe(true);

      act(() => {
        result.current.actions.resetProgress();
      });

      expect(result.current.state.progress.size).toBe(0);
      expect(result.current.state.isUploading).toBe(false);
      expect(result.current.state.completedFiles).toBe(0);
      expect(result.current.state.totalFiles).toBe(0);
    });
  });
}); 