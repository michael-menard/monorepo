import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from './lib/utils'

// Error types that can be returned from API calls for toast display
export interface ToastApiError {
  status?: number
  statusText?: string
  message?: string
  code?: string
  data?: {
    message?: string
    code?: string
  }
}

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info'

// Custom toast component with countdown and hover pause
interface CustomToastProps {
  type: ToastType
  title: string
  description?: string
  duration?: number
  onClose?: () => void
}

const CustomToast: React.FC<CustomToastProps> = ({
  type,
  title,
  description,
  duration = 5000,
  onClose,
}) => {
  const [progress, setProgress] = useState(100)
  const [isPaused, setIsPaused] = useState(false)
  const [timeLeft, setTimeLeft] = useState(duration)

  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 100
        setProgress((newTime / duration) * 100)

        if (newTime <= 0) {
          onClose?.()
          return 0
        }
        return newTime
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPaused, duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getColorClasses = () => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'info':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const getProgressColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'info':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div
      className={cn('relative w-full max-w-sm p-4 border rounded-lg shadow-lg', getColorClasses())}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="flex items-start space-x-3 pr-6">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          {description ? <p className="text-sm text-gray-600 mt-1">{description}</p> : null}
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
        <div
          className={cn('h-full transition-all duration-100 ease-linear', getProgressColor())}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

// Error message mapping utility
export const getErrorMessage = (error: unknown): string => {
  // Handle RTK Query errors
  if (error && typeof error === 'object' && 'status' in error) {
    const apiError = error as ToastApiError

    // Check for specific error codes
    if (apiError.data?.code) {
      switch (apiError.data.code) {
        case 'FILE_NOT_FOUND':
          return 'The file you are trying to delete no longer exists.'
        case 'PERMISSION_DENIED':
          return 'You do not have permission to delete this file.'
        case 'FILE_IN_USE':
          return 'This file cannot be deleted because it is currently in use.'
        default:
          break
      }
    }

    // Check for HTTP status codes
    if (apiError.status) {
      switch (apiError.status) {
        case 400:
          return 'Invalid request. Please check your input and try again.'
        case 401:
          return 'You are not authorized to perform this action. Please log in and try again.'
        case 403:
          return 'You do not have permission to delete this file.'
        case 404:
          return 'The file you are trying to delete was not found.'
        case 409:
          return 'This file cannot be deleted due to a conflict. It may be in use by another process.'
        case 500:
          return 'A server error occurred. Please try again later.'
        case 503:
          return 'The service is temporarily unavailable. Please try again later.'
        default:
          break
      }
    }

    // Use API error message if available
    if (apiError.data?.message) {
      return apiError.data.message
    }
    if (apiError.message) {
      return apiError.message
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error
  }

  // Default fallback
  return 'An unexpected error occurred. Please try again.'
}

// Toast utility functions
export const showSuccessToast = (title: string, description?: string, duration?: number) => {
  toast.custom(
    t => (
      <CustomToast
        type="success"
        title={title}
        description={description}
        duration={duration}
        onClose={() => toast.dismiss(t)}
      />
    ),
    { duration },
  )
}

export const showErrorToast = (error: unknown, title: string = 'Error', duration?: number) => {
  const message = getErrorMessage(error)
  toast.custom(
    t => (
      <CustomToast
        type="error"
        title={title}
        description={message}
        duration={duration}
        onClose={() => toast.dismiss(t)}
      />
    ),
    { duration },
  )
}

export const showWarningToast = (title: string, description?: string, duration?: number) => {
  toast.custom(
    t => (
      <CustomToast
        type="warning"
        title={title}
        description={description}
        duration={duration}
        onClose={() => toast.dismiss(t)}
      />
    ),
    { duration },
  )
}

export const showInfoToast = (title: string, description?: string, duration?: number) => {
  toast.custom(
    t => (
      <CustomToast
        type="info"
        title={title}
        description={description}
        duration={duration}
        onClose={() => toast.dismiss(t)}
      />
    ),
    { duration },
  )
}
