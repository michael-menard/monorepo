import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

// Arrow functions cannot be used as constructors (dnd-kit and floating-ui call `new ResizeObserver`)
// Use a regular function so it works with `new`.
global.ResizeObserver = vi.fn(function () {
  return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }
}) as unknown as typeof ResizeObserver

global.IntersectionObserver = vi.fn(function () {
  return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }
}) as unknown as typeof IntersectionObserver
