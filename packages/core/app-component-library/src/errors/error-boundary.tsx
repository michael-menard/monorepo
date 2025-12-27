import React, { Component, ReactNode } from 'react'
import { z } from 'zod'
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react'
import { logger } from '@repo/logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../_primitives/card'
import { Button } from '../_primitives/button'

// Zod schema for error information
export const ErrorInfoSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  componentStack: z.string().optional(),
  timestamp: z.date(),
  errorId: z.string().uuid(),
  userAgent: z.string().optional(),
  url: z.string().url().optional(),
})

export type ErrorInfo = z.infer<typeof ErrorInfoSchema>

// Props for the error boundary
export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo) => ReactNode)
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: any[]
  errorId?: string
}

// State for the error boundary
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

// Default error display component
const DefaultErrorFallback: React.FC<{
  error: Error
  errorInfo: ErrorInfo
  onReset: () => void
}> = ({ error, errorInfo, onReset }) => {
  const handleReportError = () => {
    // In a real application, this would send the error to an error reporting service

    // Example: Send to error reporting service
    // reportErrorToService(errorInfo);

    alert('Error has been reported. Thank you for helping us improve!')
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-gray-600">
            We're sorry, but something unexpected happened. Please try again or contact support if
            the problem persists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {typeof process !== 'undefined' && process.env.NODE_ENV === 'development' && (
            <details className="rounded-md bg-gray-50 p-3">
              <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                Error Details (Development)
              </summary>
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  <strong>Message:</strong> {error.message}
                </p>
                {errorInfo.stack ? (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                      {errorInfo.stack}
                    </pre>
                  </div>
                ) : null}
                <p>
                  <strong>Error ID:</strong> {errorInfo.errorId}
                </p>
                <p>
                  <strong>Timestamp:</strong> {errorInfo.timestamp.toISOString()}
                </p>
              </div>
            </details>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={onReset} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>

            <Button onClick={handleReportError} variant="outline" className="w-full">
              <Bug className="mr-2 h-4 w-4" />
              Report Error
            </Button>

            <Button onClick={handleGoHome} variant="ghost" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main error boundary component
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorData: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      timestamp: new Date(),
      errorId: this.props.errorId || crypto.randomUUID(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }

    this.setState({ errorInfo: errorData })

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorData)
    }

    // Log error for debugging
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state if resetKeys have changed
    if (this.state.hasError && prevProps.resetKeys !== this.props.resetKeys) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.state.errorInfo)
      }

      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      )
    }

    return this.props.children
  }
}

// Hook for functional components to trigger error boundaries
export const useErrorHandler = () => {
  return (error: Error) => {
    // This will trigger the nearest error boundary
    throw error
  }
}

// Utility function to generate error reports
export const generateErrorReport = (
  error: Error,
  additionalInfo?: Record<string, any>,
): ErrorInfo => {
  return {
    message: error.message,
    stack: error.stack,
    timestamp: new Date(),
    errorId: crypto.randomUUID(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...additionalInfo,
  }
}

// Utility function to send error reports (placeholder for actual implementation)
export const sendErrorReport = async (errorInfo: ErrorInfo): Promise<void> => {
  try {
    // In a real application, this would send to your error reporting service
    // Example: Sentry, LogRocket, Bugsnag, etc.
    logger.info('Sending error report:', errorInfo)
    // Placeholder for actual error reporting service call
    // await fetch('/api/error-reporting', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorInfo),
    // });
  } catch {
    // Error reporting failed silently
  }
}
