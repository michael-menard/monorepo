import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi, expect } from 'vitest';
import type { UploadFile, UploadConfig, ValidationError } from '../types/index.js';

// Enhanced render function with common providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): ReturnType<typeof render> => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock file creation utilities
export const createMockFile = (
  name: string = 'test.jpg',
  size: number = 1024 * 1024, // 1MB
  type: string = 'image/jpeg',
  lastModified: number = Date.now()
): File => {
  const file = new File(['mock content'], name, { type, lastModified });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

export const createMockFiles = (count: number = 3): File[] => {
  return Array.from({ length: count }, (_, i) => 
    createMockFile(`test-${i + 1}.jpg`, 1024 * 1024 * (i + 1), 'image/jpeg')
  );
};

export const createMockUploadFile = (
  file: File,
  status: UploadFile['status'] = 'pending',
  progress: number = 0,
  error?: string,
  url?: string
): UploadFile => ({
  id: `mock-${file.name}-${Date.now()}`,
  file,
  status,
  progress,
  error,
  url,
  metadata: {
    width: 800,
    height: 600,
    format: file.type.split('/')[1],
    size: file.size,
  },
});

// Mock upload configuration
export const createMockUploadConfig = (overrides: Partial<UploadConfig> = {}): UploadConfig => ({
  maxFiles: 5,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  acceptedFileTypes: ['image/*'],
  multiple: true,
  autoUpload: false,
  endpoint: '/api/upload',
  headers: {},
  ...overrides,
});

// Mock validation error
export const createMockValidationError = (
  code: string = 'INVALID_FILE_TYPE',
  message: string = 'Invalid file type',
  file?: File
): ValidationError => ({
  code,
  message,
  file,
});

// Mock XMLHttpRequest for upload testing
export const createMockXHR = () => {
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
    response: JSON.stringify({ url: 'https://example.com/uploaded-file.jpg' }),
    responseText: JSON.stringify({ url: 'https://example.com/uploaded-file.jpg' }),
  };

  // Simulate successful upload
  mockXHR.send.mockImplementation(() => {
    setTimeout(() => {
      // Simulate progress events
      const progressEvent = new ProgressEvent('progress', {
        lengthComputable: true,
        loaded: 50,
        total: 100,
      });
      mockXHR.upload.addEventListener.mock.calls
        .filter(([event]) => event === 'progress')
        .forEach(([, handler]) => handler(progressEvent));

      // Simulate completion
      const loadEvent = new Event('load');
      mockXHR.addEventListener.mock.calls
        .filter(([event]) => event === 'load')
        .forEach(([, handler]) => handler(loadEvent));
    }, 100);
  });

  return mockXHR;
};

// Mock drag and drop events
export const createMockDragEvent = (
  type: string,
  files: File[] = [],
  dataTransfer?: Partial<DataTransfer>
): any => {
  const mockDataTransfer = {
    files: files as any,
    items: files.map(file => ({ kind: 'file', type: file.type, getAsFile: () => file })) as any,
    types: ['Files'],
    dropEffect: 'copy',
    effectAllowed: 'all',
    ...dataTransfer,
  };

  return {
    type,
    dataTransfer: mockDataTransfer as DataTransfer,
    bubbles: true,
    cancelable: true,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
};

// Mock file input change event
export const createMockFileInputEvent = (files: File[]): Event => {
  const input = document.createElement('input');
  input.type = 'file';
  Object.defineProperty(input, 'files', {
    value: files,
    writable: false,
  });

  return new Event('change', { bubbles: true });
};

// Async test utilities
export const waitForUpload = (timeout: number = 5000): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
};

export const waitForImageLoad = (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, 100); // Mock image load time
  });
};

// Mock Sharp for server-side testing
export const mockSharp = () => {
  const mockSharpInstance = {
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    avif: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed image')),
    metadata: vi.fn().mockResolvedValue({
      width: 800,
      height: 600,
      format: 'jpeg',
      size: 1024 * 1024,
    }),
  };

  vi.doMock('sharp', () => ({
    default: vi.fn(() => mockSharpInstance),
  }));

  return mockSharpInstance;
};

// Test data generators
export const generateLargeFile = (sizeInMB: number = 50): File => {
  return createMockFile('large-file.jpg', sizeInMB * 1024 * 1024, 'image/jpeg');
};

export const generateInvalidFile = (): File => {
  return createMockFile('document.exe', 1024, 'application/x-msdownload');
};

export const generateImageFiles = (count: number = 3): File[] => {
  const formats = ['image/jpeg', 'image/png', 'image/webp'];
  return Array.from({ length: count }, (_, i) => 
    createMockFile(
      `image-${i + 1}.${formats[i % formats.length].split('/')[1]}`,
      (i + 1) * 1024 * 1024,
      formats[i % formats.length]
    )
  );
};

// Assertion helpers
export const expectFileToBeValid = (file: File, config: UploadConfig) => {
  expect(file.size).toBeLessThanOrEqual(config.maxFileSize || 10 * 1024 * 1024);
  if (config.acceptedFileTypes && !config.acceptedFileTypes.includes('*/*')) {
    const isAccepted = config.acceptedFileTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.split('/')[0] + '/');
      }
      return file.type === type;
    });
    expect(isAccepted).toBe(true);
  }
};

export const expectUploadFileToHaveStatus = (
  uploadFile: UploadFile,
  status: UploadFile['status']
) => {
  expect(uploadFile.status).toBe(status);
  if (status === 'completed') {
    expect(uploadFile.progress).toBe(100);
    expect(uploadFile.url).toBeDefined();
  } else if (status === 'error') {
    expect(uploadFile.error).toBeDefined();
  }
};
