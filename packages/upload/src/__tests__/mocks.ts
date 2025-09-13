import { vi } from 'vitest';
import type { UploadConfig, UploadProgress, UploadFile } from '../types/index.js';

// Mock XMLHttpRequest globally
export const mockXMLHttpRequest = () => {
  const mockXHR = {
    open: vi.fn(),
    send: vi.fn(),
    setRequestHeader: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    abort: vi.fn(),
    upload: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    readyState: 4,
    status: 200,
    response: '{"url": "https://example.com/uploaded.jpg"}',
    responseText: '{"url": "https://example.com/uploaded.jpg"}',
  };

  // @ts-ignore
  global.XMLHttpRequest = vi.fn(() => mockXHR);
  return mockXHR;
};

// Mock fetch for upload endpoints
export const mockFetch = (
  response: any = { url: 'https://example.com/uploaded.jpg' },
  status: number = 200,
  delay: number = 100
) => {
  global.fetch = vi.fn().mockImplementation(() =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ok: status >= 200 && status < 300,
          status,
          json: () => Promise.resolve(response),
          text: () => Promise.resolve(JSON.stringify(response)),
        });
      }, delay);
    })
  );
};

// Mock upload progress simulation
export const simulateUploadProgress = (
  xhr: any,
  totalSize: number = 1024 * 1024,
  steps: number = 5,
  interval: number = 100
) => {
  let loaded = 0;
  const stepSize = totalSize / steps;

  const progressInterval = setInterval(() => {
    loaded += stepSize;
    if (loaded >= totalSize) {
      loaded = totalSize;
      clearInterval(progressInterval);
    }

    const progressEvent = {
      type: 'progress',
      lengthComputable: true,
      loaded,
      total: totalSize,
    } as ProgressEvent;

    // Trigger progress handlers
    xhr.upload.addEventListener.mock.calls
      .filter(([event]: [string]) => event === 'progress')
      .forEach(([, handler]: [string, Function]) => handler(progressEvent));

    if (loaded >= totalSize) {
      // Trigger load event
      const loadEvent = new Event('load');
      xhr.addEventListener.mock.calls
        .filter(([event]: [string]) => event === 'load')
        .forEach(([, handler]: [string, Function]) => handler(loadEvent));
    }
  }, interval);

  return () => clearInterval(progressInterval);
};

// Mock upload error simulation
export const simulateUploadError = (
  xhr: any,
  error: string = 'Network error',
  delay: number = 100
) => {
  setTimeout(() => {
    xhr.status = 500;
    xhr.response = JSON.stringify({ error });
    xhr.responseText = JSON.stringify({ error });

    const errorEvent = {
      type: 'error',
    } as ProgressEvent;
    xhr.addEventListener.mock.calls
      .filter(([event]: [string]) => event === 'error')
      .forEach(([, handler]: [string, Function]) => handler(errorEvent));
  }, delay);
};

// Mock image processing
export const mockImageProcessing = () => {
  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 100,
        height: 100,
      })),
      putImageData: vi.fn(),
    })),
    toBlob: vi.fn((callback, type, quality) => {
      setTimeout(() => {
        callback(new Blob(['processed'], { type: type || 'image/jpeg' }));
      }, 50);
    }),
  };

  global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
  global.HTMLCanvasElement.prototype.toBlob = mockCanvas.toBlob;

  // Mock Image constructor
  const mockImage = vi.fn().mockImplementation(() => ({
    onload: null,
    onerror: null,
    src: '',
    naturalWidth: 800,
    naturalHeight: 600,
    width: 800,
    height: 600,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  global.Image = mockImage as any;

  return { mockCanvas, mockImage };
};

// Mock drag and drop API
export const mockDragAndDrop = () => {
  const mockDataTransfer = {
    files: [],
    items: [],
    types: [],
    dropEffect: 'none',
    effectAllowed: 'uninitialized',
    clearData: vi.fn(),
    getData: vi.fn(() => ''),
    setData: vi.fn(),
    setDragImage: vi.fn(),
  };

  global.DataTransfer = vi.fn(() => mockDataTransfer) as any;

  const createDragEvent = (type: string, files: File[] = []) => {
    const dataTransfer = { ...mockDataTransfer, files };
    return new DragEvent(type, { dataTransfer: dataTransfer as DataTransfer });
  };

  return { mockDataTransfer, createDragEvent };
};

// Mock file system access
export const mockFileSystemAccess = () => {
  const mockFileHandle = {
    getFile: vi.fn().mockResolvedValue(new File(['content'], 'test.txt')),
    createWritable: vi.fn(),
  };

  const mockDirectoryHandle = {
    getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
    getDirectoryHandle: vi.fn(),
    entries: vi.fn().mockReturnValue([]),
  };

  // @ts-ignore
  global.showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle]);
  // @ts-ignore
  global.showDirectoryPicker = vi.fn().mockResolvedValue(mockDirectoryHandle);

  return { mockFileHandle, mockDirectoryHandle };
};

// Mock validation scenarios
export const mockValidationScenarios = () => {
  const scenarios = {
    validImage: () => new File(['image'], 'valid.jpg', { type: 'image/jpeg' }),
    invalidType: () => new File(['exe'], 'virus.exe', { type: 'application/x-msdownload' }),
    tooLarge: () => {
      const file = new File(['large'], 'large.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 100 * 1024 * 1024 }); // 100MB
      return file;
    },
    emptyFile: () => new File([''], 'empty.jpg', { type: 'image/jpeg' }),
    corruptedImage: () => new File(['corrupted'], 'corrupt.jpg', { type: 'image/jpeg' }),
  };

  return scenarios;
};

// Mock upload presets
export const mockUploadPresets = () => {
  return {
    avatar: {
      name: 'Avatar',
      maxFileSize: 5 * 1024 * 1024,
      acceptedFileTypes: ['image/jpeg', 'image/png'],
      imageProcessing: {
        width: 200,
        height: 200,
        fit: 'cover' as const,
        quality: 90,
      },
    },
    gallery: {
      name: 'Gallery',
      maxFileSize: 10 * 1024 * 1024,
      acceptedFileTypes: ['image/*'],
      imageProcessing: {
        width: 800,
        height: 800,
        fit: 'inside' as const,
        quality: 85,
      },
    },
    document: {
      name: 'Document',
      maxFileSize: 50 * 1024 * 1024,
      acceptedFileTypes: ['application/pdf', 'application/msword'],
    },
  };
};

// Mock server responses
export const mockServerResponses = () => {
  return {
    success: {
      url: 'https://cdn.example.com/uploads/file-123.jpg',
      metadata: {
        width: 800,
        height: 600,
        format: 'jpeg',
        size: 1024 * 1024,
      },
    },
    error: {
      error: 'Upload failed',
      code: 'UPLOAD_ERROR',
      details: 'Server temporarily unavailable',
    },
    validation: {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: 'File type not allowed',
    },
    quota: {
      error: 'Quota exceeded',
      code: 'QUOTA_EXCEEDED',
      details: 'Storage limit reached',
    },
  };
};

// Mock performance timing
export const mockPerformanceTiming = () => {
  const originalNow = performance.now;
  let mockTime = 0;

  performance.now = vi.fn(() => mockTime);

  const advanceTime = (ms: number) => {
    mockTime += ms;
  };

  const resetTime = () => {
    mockTime = 0;
  };

  const restore = () => {
    performance.now = originalNow;
  };

  return { advanceTime, resetTime, restore };
};

// Mock intersection observer for lazy loading
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  });

  global.IntersectionObserver = mockIntersectionObserver;
  return mockIntersectionObserver;
};

// Mock resize observer for responsive components
export const mockResizeObserver = () => {
  const mockResizeObserver = vi.fn();
  mockResizeObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  });

  global.ResizeObserver = mockResizeObserver;
  return mockResizeObserver;
};

// Cleanup function for all mocks
export const cleanupMocks = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};
