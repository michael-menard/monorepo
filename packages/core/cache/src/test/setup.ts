import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
}

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock caches API
const cacheMock = {
  match: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  keys: vi.fn(),
}

const cachesMock = {
  open: vi.fn().mockResolvedValue(cacheMock),
  delete: vi.fn(),
  keys: vi.fn(),
  match: vi.fn(),
}

// Make the mock accessible globally for tests
;(global as any).__cacheMock = cacheMock
;(global as any).__cachesMock = cachesMock

// Only define caches if it doesn't already exist
if (!('caches' in window)) {
  Object.defineProperty(window, 'caches', {
    value: cachesMock,
  })
} else {
  // Mock the existing caches property
  vi.spyOn(window, 'caches', 'get').mockReturnValue(cachesMock as any)
}

// Mock fetch
global.fetch = vi.fn()

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})
