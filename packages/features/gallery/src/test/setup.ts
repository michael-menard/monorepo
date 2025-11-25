import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  // Ensure timers don’t keep the process alive across tests
  try {
    vi.clearAllTimers()
    vi.useRealTimers()
  } catch {}
  // Ensure window is restored between tests if some test deletes it
  if (typeof (global as any).window === 'undefined') {
    const jsdomWindow = (global as any).document?.defaultView as any
    if (jsdomWindow) {
      ;(global as any).window = jsdomWindow
    } else {
      ;(global as any).window = globalThis as any
    }
  }
})

// Global DOM and Web API polyfills/mocks for jsdom environment
if (typeof window !== 'undefined') {
  // IntersectionObserver mock
  if (!(window as any).IntersectionObserver) {
    class MockIntersectionObserver {
      callback: IntersectionObserverCallback
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback
      }
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
      takeRecords = vi.fn(() => [] as IntersectionObserverEntry[])
    }
    ;(window as any).IntersectionObserver = MockIntersectionObserver as any
    ;(global as any).IntersectionObserver = (window as any).IntersectionObserver
  }

  // ResizeObserver mock
  if (!(window as any).ResizeObserver) {
    class MockResizeObserver {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    }
    ;(window as any).ResizeObserver = MockResizeObserver as any
    ;(global as any).ResizeObserver = (window as any).ResizeObserver
  }

  // matchMedia mock
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as any
  }

  // navigator.share mock
  if (!navigator.share) {
    ;(navigator as any).share = vi.fn().mockResolvedValue(undefined)
  }

  // clipboard mock
  if (!(navigator as any).clipboard) {
    ;(navigator as any).clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }
  }

  // scrollTo mock
  if (!window.scrollTo) {
    window.scrollTo = vi.fn()
  }

  // Ensure common portal/root containers exist
  const ensureDiv = (id: string) => {
    if (!document.getElementById(id)) {
      const el = document.createElement('div')
      el.id = id
      document.body.appendChild(el)
    }
  }
  ensureDiv('root')
  ensureDiv('modal-root')

  // Guard document.createElement overrides so framework rendering still works when tests stub it
  const originalCreateElement = Document.prototype.createElement
  const descriptor = Object.getOwnPropertyDescriptor(document, 'createElement')
  if (!descriptor || descriptor.configurable) {
    Object.defineProperty(document, 'createElement', {
      configurable: true,
      get() {
        return originalCreateElement.bind(document)
      },
      set(fn: any) {
        const mocked = fn
        const wrapper = ((tagName: any, options?: any) => {
          try {
            if (typeof tagName === 'string' && tagName.toLowerCase() === 'a') {
              return mocked(tagName, options)
            }
          } catch (_) {}
          return originalCreateElement.call(document, tagName as any, options as any)
        }) as any
        Object.defineProperty(document, 'createElement', {
          configurable: true,
          writable: true,
          value: wrapper,
        })
      },
    })
  }
}

// Patch react-dom/client to ensure a valid container even if tests stub document.createElement globally
vi.mock('react-dom/client', async () => {
  // @ts-ignore
  const actual = await vi.importActual<any>('react-dom/client')
  const originalCreateRoot = actual.createRoot
  return {
    ...actual,
    createRoot: (container: any, options?: any) => {
      const isElement = !!container && typeof container === 'object' && container.nodeType === 1
      if (!isElement) {
        const trueDiv = Document.prototype.createElement.call(document, 'div')
        document.body.appendChild(trueDiv)
        return originalCreateRoot(trueDiv, options)
      }
      return originalCreateRoot(container, options)
    },
  }
})

// Strict guards to surface root causes of hanging tests early
// 1) Fail fast on unexpected network calls
const originalFetch = (global as any).fetch
;(global as any).fetch = vi.fn((..._args: any[]) => {
  const msg = 'Unexpected fetch() call detected. Mock network requests in the test.'
  throw new Error(msg)
})
// Minimal XMLHttpRequest guard
class BlockedXMLHttpRequest {
  open() {
    /* noop */
  }
  setRequestHeader() {
    /* noop */
  }
  send() {
    throw new Error(
      'Unexpected XMLHttpRequest.send() call detected. Mock network requests in the test.',
    )
  }
  abort() {
    /* noop */
  }
}
;(global as any).XMLHttpRequest = BlockedXMLHttpRequest as any

// 2) Surface unhandled async errors instead of letting tests hang
process.on('unhandledRejection', (err: any) => {
  // Make the failure explicit and attributable to the offending test
  throw err instanceof Error ? err : new Error(String(err))
})
process.on('uncaughtException', (err: any) => {
  throw err instanceof Error ? err : new Error(String(err))
})
