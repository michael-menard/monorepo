import { vi } from 'vitest'
import React from 'react'

// Mock dependencies before any imports
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: vi.fn(),
  }),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => React.createElement('div', props, children),
  },
}))

vi.mock('@repo/ui', () => ({
  AppCard: ({ children, title, description, className }: any) => 
    React.createElement('div', { className, 'data-testid': 'app-card' }, 
      React.createElement('h1', null, title),
      React.createElement('p', null, description),
      children
    ),
  Button: ({ children, type, className, disabled, onClick }: any) => 
    React.createElement('button', { type, className, disabled, onClick }, children),
  Input: ({ id, type, placeholder, maxLength, className, ...props }: any) => 
    React.createElement('input', { id, type, placeholder, maxLength, className, ...props }),
  Label: ({ children, htmlFor }: any) => 
    React.createElement('label', { htmlFor }, children),
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock alert
global.alert = vi.fn() 