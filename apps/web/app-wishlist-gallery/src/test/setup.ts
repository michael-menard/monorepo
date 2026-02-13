import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll, expect } from 'vitest'
import * as matchers from 'vitest-axe/matchers'
import { server } from './mocks/server'

// WISH-2012: Extend Vitest matchers with axe-core accessibility assertions
expect.extend(matchers)

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

// Mock PointerEvent for motion-dom library (JSDOM doesn't support it natively)
// WISH-2001: Required for keyboard activation tests with motion-dom gestures
if (typeof global.PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    readonly pointerId: number
    readonly width: number
    readonly height: number
    readonly pressure: number
    readonly tangentialPressure: number
    readonly tiltX: number
    readonly tiltY: number
    readonly twist: number
    readonly pointerType: string
    readonly isPrimary: boolean

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 0
      this.width = params.width ?? 1
      this.height = params.height ?? 1
      this.pressure = params.pressure ?? 0
      this.tangentialPressure = params.tangentialPressure ?? 0
      this.tiltX = params.tiltX ?? 0
      this.tiltY = params.tiltY ?? 0
      this.twist = params.twist ?? 0
      this.pointerType = params.pointerType ?? ''
      this.isPrimary = params.isPrimary ?? false
    }
  }
  global.PointerEvent = PointerEvent as unknown as typeof globalThis.PointerEvent
}

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock TanStack Router
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
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
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Mock Worker for heic2any and image compression libraries
global.Worker = class Worker {
  constructor(_stringUrl: string | URL, _options?: WorkerOptions) {}
  addEventListener(_type: string, _listener: EventListenerOrEventListenerObject): void {}
  removeEventListener(_type: string, _listener: EventListenerOrEventListenerObject): void {}
  postMessage(_message: any): void {}
  terminate(): void {}
  dispatchEvent(_event: Event): boolean {
    return false
  }
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null
  onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null = null
  onerror: ((this: Worker, ev: ErrorEvent) => any) | null = null
} as any

// Mock URL.createObjectURL and URL.revokeObjectURL for image processing
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// WISH-2045: Mock heic2any since it uses Web Workers which aren't available in Node
vi.mock('heic2any', () => ({
  default: vi.fn().mockResolvedValue(new Blob(['mock-jpeg'], { type: 'image/jpeg' })),
}))

// Global test utilities
declare global {
  var vi: typeof import('vitest').vi
}

globalThis.vi = vi

// WISH-2012: Accessibility testing helpers
// These are available globally in all tests for convenience

/**
 * Global a11y test configuration flag
 * Set to false in specific tests to skip axe-core checks
 */
declare global {
  // eslint-disable-next-line no-var
  var skipA11yChecks: boolean
}

globalThis.skipA11yChecks = false
