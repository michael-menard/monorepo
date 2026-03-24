// Set env vars needed by transitive dependencies (@repo/api-client)
process.env.VITE_SERVERLESS_API_BASE_URL = 'http://localhost:3004'

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

global.ResizeObserver = vi.fn(function () {
  return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }
}) as unknown as typeof ResizeObserver

// Mock scrollIntoView for jsdom (not implemented)
Element.prototype.scrollIntoView = vi.fn()
