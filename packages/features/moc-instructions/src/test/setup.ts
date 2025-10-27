import '@testing-library/jest-dom'
import { afterEach, beforeAll, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
})

// Polyfill URL.createObjectURL / revokeObjectURL for jsdom
if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    // @ts-ignore
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  }
  if (!window.URL.revokeObjectURL) {
    // @ts-ignore
    window.URL.revokeObjectURL = vi.fn()
  }
}

// Provide minimal XMLHttpRequest header helpers used by msw interceptors in tests

const XHRProto: any = (global as any).XMLHttpRequest?.prototype
if (XHRProto) {
  if (!XHRProto.getAllResponseHeaders) {
    XHRProto.getAllResponseHeaders = function () {
      return ''
    }
  }
  if (!XHRProto.getResponseHeader) {
    XHRProto.getResponseHeader = function (_name: string) {
      return null
    }
  }
}

// Provide a simple XMLHttpRequest mock to avoid real network and MSW noise
// Implements just enough for our download tests
class FakeXMLHttpRequest {
  method = 'GET'
  url = ''
  responseType = 'blob'
  timeout = 0
  status = 200
  statusText = 'OK'
  // @ts-ignore
  response: Blob | undefined
  _listeners: Record<string, Function[]> = {}
  upload = { addEventListener: (_type: string, _h: Function) => {} }
  open(method: string, url: string) {
    this.method = method
    this.url = url
  }
  setRequestHeader(_k: string, _v: string) {}
  addEventListener(type: string, handler: Function) {
    if (!this._listeners[type]) this._listeners[type] = []
    this._listeners[type].push(handler)
  }
  getAllResponseHeaders() {
    return ''
  }
  getResponseHeader(_name: string) {
    return null
  }
  send() {
    // Simulate async progress and completion
    setTimeout(() => {
      // progress event (optional)
      const progressHandlers = this._listeners['progress'] || []
      progressHandlers.forEach(h => h({ lengthComputable: true, loaded: 512, total: 1024 }))

      if (this.url.includes('missing')) {
        this.status = 404
        this.statusText = 'Not Found'
        const loadHandlers = this._listeners['load'] || []
        loadHandlers.forEach(h => h())
        return
      }
      this.status = 200
      this.statusText = 'OK'
      this.response = new Blob(['ok'], { type: 'application/pdf' })
      const loadHandlers = this._listeners['load'] || []
      loadHandlers.forEach(h => h())
    }, 0)
  }
}

// @ts-ignore override only in this package test env
global.XMLHttpRequest = FakeXMLHttpRequest as any

// Fail fast on unexpected network calls in unit tests
const originalFetch = global.fetch
// @ts-ignore
global.fetch = vi.fn((..._args: any[]) => {
  throw new Error('Unexpected fetch() call in unit test. Mock network.')
})

// Restore fetch for suites that mock it explicitly
beforeAll(() => {
  // noop
})

afterAll(() => {
  // @ts-ignore
  global.fetch = originalFetch
})

// Suppress noisy jsdom/MSW console lines while keeping other errors visible
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

console.error = (...args: any[]) => {
  const msg = String(args[0] ?? '')
  if (
    msg.includes('Unhandled request: GET https://example.com') ||
    msg.includes('Not implemented: navigation (except hash changes)')
  ) {
    return
  }
  originalConsoleError(...args)
}

console.warn = (...args: any[]) => {
  const msg = String(args[0] ?? '')
  if (msg.includes('Class GNotificationCenterDelegate is implemented')) {
    return
  }
  originalConsoleWarn(...args)
}

// Prevent anchor clicks from attempting jsdom navigation during tests (used by download link)
if (typeof (global as any).HTMLAnchorElement !== 'undefined') {
  const AnchorProto = (global as any).HTMLAnchorElement.prototype
  const originalAnchorClick = AnchorProto.click
  AnchorProto.click = function () {
    // Dispatch a click event without triggering navigation
    const evt = new (global as any).MouseEvent('click', { bubbles: true, cancelable: true })
    this.dispatchEvent(evt)
  }
}
