import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock File API for testing
global.File = class MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;

  constructor(
    parts: (string | Blob | ArrayBuffer | ArrayBufferView)[],
    filename: string,
    options?: FilePropertyBag
  ) {
    this.name = filename;
    this.size = options?.size || 1024;
    this.type = options?.type || 'text/plain';
    this.lastModified = options?.lastModified || Date.now();
  }
} as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');

// Mock URL.revokeObjectURL
global.URL.revokeObjectURL = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})); 