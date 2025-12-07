/**
 * Cookie-auth + RTK Query tests
 * Verifies cookie-based auth config (no Authorization header) and 401/403/404 semantics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
// Note: import base-query dynamically inside tests after setting up fetch/Headers

// Reduce noise in test output
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}))
// Short-circuit retry logic for unit tests
vi.mock('../retry/retry-logic', () => ({
  withRetry: vi.fn(async (op: any) => await op()),
  withPriorityRetry: vi.fn(async (op: any) => await op()),
}))

// Mock fetchBaseQuery to a simple implementation that calls globalThis.fetch
vi.mock('@reduxjs/toolkit/query/react', async () => {
  return {
    fetchBaseQuery: (init: any) => {
      return async (args: any, _api: any, _extra: any) => {
        const url = typeof args === 'string' ? args : args.url
        const method = typeof args === 'string' ? 'GET' : args.method || 'GET'
        const headers = new (globalThis as any).Headers()
        if (init?.prepareHeaders) init.prepareHeaders(headers, _api)
        const fetchOpts = {
          method,
          headers,
          credentials: init?.credentials,
        }
        const res = await (globalThis.fetch as any)(`${init.baseUrl}${url}`, fetchOpts)
        if (res.ok) return { data: {} }
        const text = typeof res.text === 'function' ? await res.text() : ''
        let data: any = text
        try {
          data = text ? JSON.parse(text) : {}
        } catch {}
        return { error: { status: res.status ?? 500, data } }
      }
    },
  }
})

vi.mock('../lib/performance', () => ({ performanceMonitor: { trackComponentRender: vi.fn() } }))

// Ensure fetch/Headers are available where fetchBaseQuery expects them
function resetFetchMock() {
  // Minimal Headers polyfill for test environment
  if (!(globalThis as any).Headers) {
    class SimpleHeaders {
      private map = new Map<string, string>()
      constructor(init?: any) {
        if (init) {
          if (typeof init.forEach === 'function') {
            init.forEach((v: any, k: string) => this.set(k, v))
          } else {
            Object.keys(init).forEach(k => this.set(k, (init as any)[k]))
          }
        }
      }
      set(name: string, value: string) { this.map.set(name.toLowerCase(), String(value)) }
      get(name: string) { return this.map.get(name.toLowerCase()) ?? null }
      append(name: string, value: string) { this.set(name, value) }
      has(name: string) { return this.map.has(name.toLowerCase()) }
      forEach(cb: (v: string, k: string) => void) { this.map.forEach((v, k) => cb(v, k)) }
    }
    ;(globalThis as any).Headers = SimpleHeaders as any
  }

  ;(globalThis as any).fetch = vi.fn()
  ;(global as any).fetch = (globalThis as any).fetch
}

// Helpers
function getHeader(headers: any, name: string): string | undefined {
  if (!headers) return undefined
  if (typeof headers.get === 'function') return headers.get(name) ?? headers.get(name.toLowerCase())
  return headers[name] ?? headers[name.toLowerCase()]
}

describe('RTK baseQuery cookie-auth configuration', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    resetFetchMock()
    vi.resetModules()
  })

  it('uses credentials: include and sets Accept header without Authorization', async () => {
    const { createServerlessBaseQuery } = await import('../rtk/base-query')
    ;(globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve('{}'),
    })

    const baseQuery = createServerlessBaseQuery()
    const result = await baseQuery('/api/probe', {} as any, {} as any)

    expect(result).toBeDefined()
    expect((globalThis.fetch as any).mock.calls.length).toBe(1)

    const [, opts] = (globalThis.fetch as any).mock.calls[0]
    expect(opts.credentials).toBe('include')

    const accept = getHeader(opts.headers, 'Accept')
    const auth = getHeader(opts.headers, 'Authorization')

    expect(accept).toBe('application/json')
    expect(auth).toBeFalsy()
  })
})

describe('401/403/404 error semantics', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    resetFetchMock()
    vi.resetModules()
  })

  const makeErrorResponse = (status: number, code: string, message: string) => ({
    ok: false,
    status,
    statusText: message,
    headers: { get: () => 'application/json' },
    text: () => Promise.resolve(JSON.stringify({ error: { code, message } })),
  })

  it('surfaces 401 Unauthorized distinctly', async () => {
    const { createServerlessBaseQuery } = await import('../rtk/base-query')
    ;(globalThis.fetch as any).mockResolvedValueOnce(
      makeErrorResponse(401, 'UNAUTHORIZED', 'Unauthorized'),
    )

    const baseQuery = createServerlessBaseQuery()
    const result = await baseQuery('/api/mocs/abc', {} as any, {} as any)

    expect(result).toHaveProperty('error')
    expect((result as any).error.status).toBe(401)
  })

  it('surfaces 403 Forbidden distinctly (non-owner)', async () => {
    const { createServerlessBaseQuery } = await import('../rtk/base-query')
    ;(globalThis.fetch as any).mockResolvedValueOnce(
      makeErrorResponse(403, 'FORBIDDEN', 'Forbidden'),
    )

    const baseQuery = createServerlessBaseQuery()
    const result = await baseQuery('/api/mocs/abc', {} as any, {} as any)

    expect(result).toHaveProperty('error')
    expect((result as any).error.status).toBe(403)
  })

  it('surfaces 404 Not Found distinctly', async () => {
    const { createServerlessBaseQuery } = await import('../rtk/base-query')
    ;(globalThis.fetch as any).mockResolvedValueOnce(
      makeErrorResponse(404, 'NOT_FOUND', 'Not Found'),
    )

    const baseQuery = createServerlessBaseQuery()
    const result = await baseQuery('/api/mocs/missing', {} as any, {} as any)

    expect(result).toHaveProperty('error')
    expect((result as any).error.status).toBe(404)
  })
})

