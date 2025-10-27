import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Clean up after each test
afterEach(() => {
  cleanup()

  // Clean up DOM between tests to prevent accumulation
  document.body.innerHTML = ''
  document.head.innerHTML = ''

  // Clear any remaining timers
  vi.clearAllTimers()

  // Reset any global state
  if (typeof window !== 'undefined') {
    // Clear localStorage and sessionStorage
    window.localStorage.clear()
    window.sessionStorage.clear()

    // Reset location if it was modified
    if (window.location.href !== 'http://localhost:3000/') {
      window.history.replaceState({}, '', '/')
    }
  }
})
