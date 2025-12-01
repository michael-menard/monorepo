import { useCallback } from 'react'
import { toast } from 'sonner'
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
  getErrorMessage,
} from '../notifications/toast-utils'
import type { ToastType } from '../notifications/toast-utils'

/**
 * Toast options for the useToast hook
 */
export interface ToastOptions {
  /** Toast title - required */
  title: string
  /** Optional description/message */
  description?: string
  /** Toast variant type */
  variant?: ToastType | 'destructive'
  /** Duration in milliseconds before auto-dismiss (default: 5000) */
  duration?: number
}

/**
 * Return type for the useToast hook
 */
export interface UseToastReturn {
  /** Show a toast with the given options */
  toast: (options: ToastOptions) => void
  /** Show a success toast */
  success: (title: string, description?: string, duration?: number) => void
  /** Show an error toast (can accept an error object or string) */
  error: (error: unknown, title?: string, duration?: number) => void
  /** Show a warning toast */
  warning: (title: string, description?: string, duration?: number) => void
  /** Show an info toast */
  info: (title: string, description?: string, duration?: number) => void
  /** Dismiss a specific toast by id or dismiss all toasts */
  dismiss: (toastId?: string | number) => void
  /** Dismiss all toasts */
  dismissAll: () => void
}

/**
 * Hook for showing toast notifications
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { toast, success, error } = useToast()
 *
 *   const handleSave = async () => {
 *     try {
 *       await saveData()
 *       success('Success!', 'Your changes have been saved.')
 *     } catch (err) {
 *       error(err, 'Save Failed')
 *     }
 *   }
 *
 *   // Or use the generic toast function
 *   const handleAction = () => {
 *     toast({
 *       title: 'Action Completed',
 *       description: 'The action was successful.',
 *       variant: 'success',
 *     })
 *   }
 * }
 * ```
 */
export function useToast(): UseToastReturn {
  const showToast = useCallback((options: ToastOptions) => {
    const { title, description, variant = 'info', duration } = options

    // Map 'destructive' to 'error' for compatibility with shadcn patterns
    const type: ToastType = variant === 'destructive' ? 'error' : variant

    switch (type) {
      case 'success':
        showSuccessToast(title, description, duration)
        break
      case 'error':
        showErrorToast(description ?? title, title, duration)
        break
      case 'warning':
        showWarningToast(title, description, duration)
        break
      case 'info':
      default:
        showInfoToast(title, description, duration)
        break
    }
  }, [])

  const success = useCallback((title: string, description?: string, duration?: number) => {
    showSuccessToast(title, description, duration)
  }, [])

  const error = useCallback((err: unknown, title?: string, duration?: number) => {
    showErrorToast(err, title, duration)
  }, [])

  const warning = useCallback((title: string, description?: string, duration?: number) => {
    showWarningToast(title, description, duration)
  }, [])

  const info = useCallback((title: string, description?: string, duration?: number) => {
    showInfoToast(title, description, duration)
  }, [])

  const dismiss = useCallback((toastId?: string | number) => {
    toast.dismiss(toastId)
  }, [])

  const dismissAll = useCallback(() => {
    toast.dismiss()
  }, [])

  return {
    toast: showToast,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  }
}
