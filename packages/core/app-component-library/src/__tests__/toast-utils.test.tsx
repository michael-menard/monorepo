import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import {
  getErrorMessage,
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
} from '../notifications/toast-utils'
import { useToast } from '../hooks/useToast'
import { Toaster } from '../notifications/sonner'

// Mock sonner's toast function
vi.mock('sonner', () => ({
  toast: {
    custom: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: vi.fn(({ children, ...props }) => (
    <div data-testid="toaster" aria-live="polite" {...props}>
      {children}
    </div>
  )),
}))

// Mock ThemeProvider
vi.mock('../providers/ThemeProvider', () => ({
  useTheme: vi.fn(() => ({ resolvedTheme: 'light' })),
}))

describe('Toast System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getErrorMessage', () => {
    it('returns message from Error object', () => {
      const error = new Error('Test error message')
      expect(getErrorMessage(error)).toBe('Test error message')
    })

    it('returns string error as-is', () => {
      expect(getErrorMessage('String error')).toBe('String error')
    })

    it('returns default message for unknown error types', () => {
      expect(getErrorMessage(null)).toBe('An unexpected error occurred. Please try again.')
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred. Please try again.')
      expect(getErrorMessage(42)).toBe('An unexpected error occurred. Please try again.')
    })

    it('handles API error with status 400', () => {
      const error = { status: 400 }
      expect(getErrorMessage(error)).toBe('Invalid request. Please check your input and try again.')
    })

    it('handles API error with status 401', () => {
      const error = { status: 401 }
      expect(getErrorMessage(error)).toBe(
        'You are not authorized to perform this action. Please log in and try again.',
      )
    })

    it('handles API error with status 403', () => {
      const error = { status: 403 }
      expect(getErrorMessage(error)).toBe('You do not have permission to delete this file.')
    })

    it('handles API error with status 404', () => {
      const error = { status: 404 }
      expect(getErrorMessage(error)).toBe('The file you are trying to delete was not found.')
    })

    it('handles API error with status 500', () => {
      const error = { status: 500 }
      expect(getErrorMessage(error)).toBe('A server error occurred. Please try again later.')
    })

    it('handles API error with custom data.message', () => {
      const error = { status: 422, data: { message: 'Custom validation error' } }
      expect(getErrorMessage(error)).toBe('Custom validation error')
    })

    it('handles API error with custom code FILE_NOT_FOUND', () => {
      const error = { status: 400, data: { code: 'FILE_NOT_FOUND' } }
      expect(getErrorMessage(error)).toBe('The file you are trying to delete no longer exists.')
    })

    it('handles PERMISSION_DENIED code', () => {
      const error = { status: 403, data: { code: 'PERMISSION_DENIED' } }
      expect(getErrorMessage(error)).toBe('You do not have permission to delete this file.')
    })

    it('handles FILE_IN_USE code', () => {
      const error = { status: 409, data: { code: 'FILE_IN_USE' } }
      expect(getErrorMessage(error)).toBe(
        'This file cannot be deleted because it is currently in use.',
      )
    })
  })

  describe('useToast Hook', () => {
    it('returns all expected toast functions', () => {
      const { result } = renderHook(() => useToast())

      expect(result.current.toast).toBeDefined()
      expect(typeof result.current.toast).toBe('function')
      expect(result.current.success).toBeDefined()
      expect(typeof result.current.success).toBe('function')
      expect(result.current.error).toBeDefined()
      expect(typeof result.current.error).toBe('function')
      expect(result.current.warning).toBeDefined()
      expect(typeof result.current.warning).toBe('function')
      expect(result.current.info).toBeDefined()
      expect(typeof result.current.info).toBe('function')
      expect(result.current.dismiss).toBeDefined()
      expect(typeof result.current.dismiss).toBe('function')
      expect(result.current.dismissAll).toBeDefined()
      expect(typeof result.current.dismissAll).toBe('function')
    })

    it('toast functions are stable across re-renders (memoized)', () => {
      const { result, rerender } = renderHook(() => useToast())

      const initialSuccess = result.current.success
      const initialError = result.current.error
      const initialWarning = result.current.warning
      const initialInfo = result.current.info

      rerender()

      expect(result.current.success).toBe(initialSuccess)
      expect(result.current.error).toBe(initialError)
      expect(result.current.warning).toBe(initialWarning)
      expect(result.current.info).toBe(initialInfo)
    })
  })

  describe('Toaster Component', () => {
    it('renders without crashing', () => {
      const { container } = render(<Toaster />)
      expect(container).toBeDefined()
    })

    it('renders with accessibility attributes', () => {
      render(<Toaster />)

      // Our mock renders with aria-live="polite" for accessibility
      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeTruthy()
    })
  })

  describe('Toast Utility Functions', () => {
    it('showSuccessToast is exported and callable', () => {
      expect(showSuccessToast).toBeDefined()
      expect(typeof showSuccessToast).toBe('function')
      // Function executes without throwing
      expect(() => showSuccessToast('Test', 'Description')).not.toThrow()
    })

    it('showErrorToast is exported and callable', () => {
      expect(showErrorToast).toBeDefined()
      expect(typeof showErrorToast).toBe('function')
      // Function executes without throwing
      expect(() => showErrorToast(new Error('Test'), 'Error')).not.toThrow()
    })

    it('showWarningToast is exported and callable', () => {
      expect(showWarningToast).toBeDefined()
      expect(typeof showWarningToast).toBe('function')
      // Function executes without throwing
      expect(() => showWarningToast('Warning', 'Description')).not.toThrow()
    })

    it('showInfoToast is exported and callable', () => {
      expect(showInfoToast).toBeDefined()
      expect(typeof showInfoToast).toBe('function')
      // Function executes without throwing
      expect(() => showInfoToast('Info', 'Description')).not.toThrow()
    })

    it('showErrorToast handles various error types', () => {
      // String error
      expect(() => showErrorToast('String error', 'Title')).not.toThrow()

      // Error object
      expect(() => showErrorToast(new Error('Test error'), 'Title')).not.toThrow()

      // API error object
      expect(() =>
        showErrorToast({ status: 404, data: { message: 'Not found' } }, 'Title'),
      ).not.toThrow()

      // Null/undefined
      expect(() => showErrorToast(null, 'Title')).not.toThrow()
      expect(() => showErrorToast(undefined, 'Title')).not.toThrow()
    })
  })

  describe('Toast Types Export', () => {
    it('exports all toast utility functions', () => {
      // All four types should be callable without type errors
      expect(showSuccessToast).toBeDefined()
      expect(showErrorToast).toBeDefined()
      expect(showWarningToast).toBeDefined()
      expect(showInfoToast).toBeDefined()
    })

    it('exports Toaster component', () => {
      expect(Toaster).toBeDefined()
    })

    it('exports useToast hook', () => {
      expect(useToast).toBeDefined()
    })

    it('useToast toast function accepts ToastOptions', () => {
      const { result } = renderHook(() => useToast())

      // The toast function accepts ToastOptions
      expect(() =>
        result.current.toast({
          title: 'Test',
          description: 'Test description',
          variant: 'success',
          duration: 3000,
        }),
      ).not.toThrow()
    })
  })
})
