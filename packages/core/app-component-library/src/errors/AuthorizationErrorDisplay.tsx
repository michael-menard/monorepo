import { cn } from '../_lib/utils'
import { Button } from '../_primitives/button'
import {
  parseAuthorizationError,
  getAuthorizationErrorTitle,
  getAuthorizationErrorDescription,
  getAuthorizationErrorAction,
  type ParsedAuthorizationError,
} from '@repo/api-client/utils/authorization-errors'

/**
 * AuthorizationErrorDisplay Component
 *
 * Displays contextual error messages for authorization failures.
 * Handles feature gating, quota exceeded, and account suspension errors.
 */

interface AuthorizationErrorDisplayProps {
  /** RTK Query error object */
  error: unknown
  /** Callback when user clicks upgrade action */
  onUpgrade?: () => void
  /** Callback when user clicks contact support action */
  onContactSupport?: () => void
  /** Optional CSS class name */
  className?: string
  /** Display variant */
  variant?: 'inline' | 'card' | 'banner'
}

export function AuthorizationErrorDisplay({
  error,
  onUpgrade,
  onContactSupport,
  className,
  variant = 'card',
}: AuthorizationErrorDisplayProps) {
  const parsedError = parseAuthorizationError(error)

  if (!parsedError) {
    return null
  }

  const title = getAuthorizationErrorTitle(parsedError)
  const description = getAuthorizationErrorDescription(parsedError)
  const action = getAuthorizationErrorAction(parsedError)

  const handleAction = () => {
    if (action.type === 'upgrade' && onUpgrade) {
      onUpgrade()
    } else if (action.type === 'contact' && onContactSupport) {
      onContactSupport()
    }
  }

  const getIcon = () => {
    switch (parsedError.type) {
      case 'FEATURE_NOT_AVAILABLE':
        return (
          <svg
            className="h-6 w-6 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
            />
          </svg>
        )
      case 'QUOTA_EXCEEDED':
        return (
          <svg
            className="h-6 w-6 text-orange-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
          </svg>
        )
      case 'ACCOUNT_SUSPENDED':
        return (
          <svg
            className="h-6 w-6 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        )
      default:
        return (
          <svg
            className="h-6 w-6 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        )
    }
  }

  const getBackgroundColor = () => {
    switch (parsedError.type) {
      case 'FEATURE_NOT_AVAILABLE':
        return 'bg-amber-50 border-amber-200'
      case 'QUOTA_EXCEEDED':
        return 'bg-orange-50 border-orange-200'
      case 'ACCOUNT_SUSPENDED':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        {getIcon()}
        <span className="text-gray-700">{title}</span>
        {action.type !== 'none' && (
          <button
            onClick={handleAction}
            className="text-sky-600 hover:text-sky-700 underline font-medium"
          >
            {action.text}
          </button>
        )}
      </div>
    )
  }

  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border rounded-lg',
          getBackgroundColor(),
          className,
        )}
      >
        <div className="flex items-center gap-3">
          {getIcon()}
          <div>
            <p className="font-medium text-gray-900">{title}</p>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
        {action.type !== 'none' && (
          <Button variant="outline" size="sm" onClick={handleAction}>
            {action.text}
          </Button>
        )}
      </div>
    )
  }

  // Card variant (default)
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 border rounded-lg text-center',
        getBackgroundColor(),
        className,
      )}
    >
      <div className="mb-4">{getIcon()}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md">{description}</p>
      {action.type !== 'none' && (
        <Button onClick={handleAction}>{action.text}</Button>
      )}
    </div>
  )
}

/**
 * Hook to extract authorization error details
 */
export function useAuthorizationError(error: unknown): ParsedAuthorizationError | null {
  return parseAuthorizationError(error)
}
