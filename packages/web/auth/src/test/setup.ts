import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    BrowserRouter: ({ children }: { children: React.ReactNode }) => {
      return React.createElement('div', { 'data-testid': 'browser-router' }, children);
    },
    Routes: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'routes' }, children),
    Route: ({ element }: { element: React.ReactNode }) => React.createElement('div', { 'data-testid': 'route' }, element),
    Navigate: ({ to }: { to: string }) => React.createElement('div', { 'data-testid': 'navigate', 'data-to': to }),
  }
})

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
  Toaster: () => React.createElement('div', { 'data-testid': 'toaster' }),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, animate, transition, ...props }: any) => React.createElement('div', {
      ...props,
      'data-testid': 'motion-div',
      'data-animate': JSON.stringify(animate),
      'data-transition': JSON.stringify(transition, (key, value) => 
        value === Infinity ? 'Infinity' : value
      ),
    }, children),
    button: ({ children, animate, transition, ...props }: any) => React.createElement('button', {
      ...props,
      'data-testid': 'motion-button',
      'data-animate': JSON.stringify(animate),
      'data-transition': JSON.stringify(transition, (key, value) => 
        value === Infinity ? 'Infinity' : value
      ),
    }, children),
  },
}))

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
}) 