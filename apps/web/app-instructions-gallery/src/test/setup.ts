import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll } from 'vitest'
import { server } from './mocks/server'

// Fix 1: Mock Worker and URL.createObjectURL for HEIC library
// The HEIC library calls `new Worker(URL.createObjectURL(blob))` at module load time.
// Both must be available before any test file imports the upload package.
URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()
vi.stubGlobal(
  'Worker',
  class MockWorker {
    postMessage() {}
    addEventListener() {}
    removeEventListener() {}
    terminate() {}
  },
)

// Fix 2: Mock DragEvent to include dataTransfer (jsdom does not populate it)
const MockDataTransfer = class {
  effectAllowed: string = 'uninitialized'
  dropEffect: string = 'none'
  private _data: Record<string, string> = {}
  setData(format: string, data: string) {
    this._data[format] = data
  }
  getData(format: string) {
    return this._data[format] || ''
  }
  clearData(format?: string) {
    if (format) delete this._data[format]
    else this._data = {}
  }
  setDragImage() {}
  get items() {
    return []
  }
  get files() {
    return []
  }
  get types(): string[] {
    return Object.keys(this._data)
  }
}

class MockDragEvent extends MouseEvent {
  dataTransfer: InstanceType<typeof MockDataTransfer>
  constructor(type: string, init?: DragEventInit & { dataTransfer?: InstanceType<typeof MockDataTransfer> }) {
    super(type, init)
    this.dataTransfer = init?.dataTransfer ?? new MockDataTransfer()
  }
}
Object.defineProperty(window, 'DragEvent', {
  writable: true,
  value: MockDragEvent,
})
Object.defineProperty(window, 'DataTransfer', {
  writable: true,
  value: MockDataTransfer,
})

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => {
  server.resetHandlers()
})

// Clean up after the tests are finished
afterAll(() => {
  server.close()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock TanStack Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
    useParams: () => ({}),
    useSearch: () => ({}),
  }
})

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Global test utilities
declare global {
  var vi: typeof import('vitest').vi
}

globalThis.vi = vi
