/**
 * Edit Error Display Component
 *
 * Story 3.1.40: Handle error states for edit page.
 * Displays appropriate error messages and actions for:
 * - Network errors (with retry button)
 * - 404 Not Found
 * - 403 Forbidden
 * - Generic errors
 */

import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { AlertTriangle, RefreshCw, ArrowLeft, Lock, FileQuestion } from 'lucide-react'
import { Button, Alert, AlertDescription, Card, CardContent } from '@repo/app-component-library'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { SerializedError } from '@reduxjs/toolkit'

/**
 * Props schema for EditErrorDisplay component
 * Note: error types from RTK Query are complex union types that can't be fully
 * represented as Zod schemas, so we use z.custom() for type safety
 */
export const EditErrorDisplayPropsSchema = z.object({
  error: z.custom<FetchBaseQueryError | SerializedError | undefined>(),
  onRetry: z.function().optional(),
  mocSlug: z.string().optional(),
})

export type EditErrorDisplayProps = z.infer<typeof EditErrorDisplayPropsSchema>

/**
 * Error type for classification
 */
type ErrorType = 'network' | 'not_found' | 'forbidden' | 'server' | 'unknown'

/**
 * Classify error based on status code or error type
 */
function classifyError(error: FetchBaseQueryError | SerializedError | undefined): {
  type: ErrorType
  status?: number
  message: string
} {
  if (!error) {
    return { type: 'unknown', message: 'An unknown error occurred' }
  }

  // Check if it's a FetchBaseQueryError with status
  if ('status' in error) {
    const status = typeof error.status === 'number' ? error.status : undefined

    if (status === 404) {
      return { type: 'not_found', status, message: 'MOC not found' }
    }
    if (status === 403) {
      return { type: 'forbidden', status, message: 'You do not have permission to edit this MOC' }
    }
    if (status === 401) {
      return {
        type: 'forbidden',
        status,
        message: 'Please sign in to edit this MOC',
      }
    }
    if (status && status >= 500) {
      return {
        type: 'server',
        status,
        message: 'Server error. Please try again later.',
      }
    }
    if (error.status === 'FETCH_ERROR' || error.status === 'PARSING_ERROR') {
      return {
        type: 'network',
        message: 'Network error. Please check your connection and try again.',
      }
    }
    if (error.status === 'TIMEOUT_ERROR') {
      return { type: 'network', message: 'Request timed out. Please try again.' }
    }

    // Try to extract message from error data
    const data = error.data as Record<string, unknown> | undefined
    const errorMessage =
      (data?.error as Record<string, string>)?.message ||
      (data?.message as string) ||
      'An error occurred while loading the MOC'

    return { type: 'unknown', status, message: errorMessage }
  }

  // SerializedError
  if ('message' in error && error.message) {
    return { type: 'unknown', message: error.message }
  }

  return { type: 'unknown', message: 'An unknown error occurred' }
}

/**
 * Network Error Component
 */
function NetworkError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="max-w-md mx-auto" data-testid="error-network">
      <CardContent className="pt-6 text-center">
        <div className="mb-4">
          <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Connection Error</h2>
        <p className="text-muted-foreground mb-4">{message}</p>
        {onRetry ? (
          <Button onClick={onRetry} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

/**
 * Not Found Error Component
 */
function NotFoundError({ onBack }: { onBack: () => void }) {
  return (
    <Card className="max-w-md mx-auto" data-testid="error-not-found">
      <CardContent className="pt-6 text-center">
        <div className="mb-4">
          <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">MOC Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The MOC you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button onClick={onBack} variant="default">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Forbidden Error Component
 */
function ForbiddenError({
  message,
  onBack,
  onLogin,
}: {
  message: string
  onBack: () => void
  onLogin: () => void
}) {
  const needsLogin = message.includes('sign in')

  return (
    <Card className="max-w-md mx-auto" data-testid="error-forbidden">
      <CardContent className="pt-6 text-center">
        <div className="mb-4">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">{message}</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          {needsLogin ? (
            <Button onClick={onLogin} variant="default">
              Sign In
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Generic Error Component
 */
function GenericError({
  message,
  onRetry,
  onBack,
}: {
  message: string
  onRetry?: () => void
  onBack: () => void
}) {
  return (
    <div className="max-w-md mx-auto" data-testid="error-generic">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <div className="flex gap-2 justify-center mt-4">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
        {onRetry ? (
          <Button onClick={onRetry} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Edit Error Display Component
 * Story 3.1.40: Handle error states for edit page.
 *
 * Renders appropriate error UI based on error type:
 * - Network: Show retry button
 * - 404: Show "MOC not found" with back button
 * - 403: Redirect to 403 page or show access denied
 * - Generic: Show error message with retry/back options
 */
export function EditErrorDisplay({ error, onRetry, mocSlug }: EditErrorDisplayProps) {
  const navigate = useNavigate()

  const handleBack = useCallback(() => {
    if (mocSlug) {
      navigate({ to: '/mocs/$slug', params: { slug: mocSlug } })
    } else {
      navigate({ to: '/dashboard' })
    }
  }, [navigate, mocSlug])

  const handleLogin = useCallback(() => {
    navigate({ to: '/login' })
  }, [navigate])

  const { type, message } = classifyError(error)

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {type === 'network' && <NetworkError message={message} onRetry={onRetry} />}
      {type === 'not_found' && <NotFoundError onBack={handleBack} />}
      {type === 'forbidden' && (
        <ForbiddenError message={message} onBack={handleBack} onLogin={handleLogin} />
      )}
      {(type === 'server' || type === 'unknown') && (
        <GenericError message={message} onRetry={onRetry} onBack={handleBack} />
      )}
    </div>
  )
}
