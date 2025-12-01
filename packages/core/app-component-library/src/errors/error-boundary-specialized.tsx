import React, { Component, ReactNode } from 'react'
import { z } from 'zod'
import { AlertTriangle, RefreshCw, Wifi, FileText, Database } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../_primitives/card'
import { Button } from '../_primitives/button'
import { ErrorBoundary, ErrorInfo, ErrorBoundaryProps } from './error-boundary'

// Zod schema for API error information
export const ApiErrorSchema = z.object({
  status: z.number().optional(),
  statusText: z.string().optional(),
  url: z.string().url().optional(),
  method: z.string().optional(),
  response: z.any().optional(),
})

export type ApiError = z.infer<typeof ApiErrorSchema>

// Props for API error boundary
export interface ApiErrorBoundaryProps {
  children: ReactNode
  onRetry?: () => void
  fallback?: ReactNode
}

// API Error Fallback Component
const ApiErrorFallback: React.FC<{
  error: Error
  errorInfo: ErrorInfo
  onRetry?: () => void
}> = ({ error, errorInfo, onRetry }) => {
  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      window.location.reload()
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
          <Wifi className="h-6 w-6 text-orange-600" />
        </div>
        <CardTitle className="text-lg font-semibold text-gray-900">Connection Error</CardTitle>
        <CardDescription className="text-gray-600">
          Unable to connect to the server. Please check your internet connection and try again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>
            <strong>Error:</strong> {error.message}
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleRetry} className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// API Error Boundary Component
export class ApiErrorBoundary extends Component<ApiErrorBoundaryProps> {
  render() {
    return (
      <ErrorBoundary
        fallback={(error, errorInfo) => (
          <ApiErrorFallback error={error} errorInfo={errorInfo} onRetry={this.props.onRetry} />
        )}
        onError={(error, errorInfo) => {
          // Log API-specific errors
        }}
      >
        {this.props.children}
      </ErrorBoundary>
    )
  }
}

// Props for Form error boundary
export interface FormErrorBoundaryProps {
  children: ReactNode
  onReset?: () => void
  fallback?: ReactNode
}

// Form Error Fallback Component
const FormErrorFallback: React.FC<{
  error: Error
  errorInfo: ErrorInfo
  onReset?: () => void
}> = ({ error, errorInfo, onReset }) => {
  const handleReset = () => {
    if (onReset) {
      onReset()
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <FileText className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle className="text-lg font-semibold text-gray-900">Form Error</CardTitle>
        <CardDescription className="text-gray-600">
          There was an error processing your form. Please try again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>
            <strong>Error:</strong> {error.message}
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleReset} className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset Form
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Form Error Boundary Component
export class FormErrorBoundary extends Component<FormErrorBoundaryProps> {
  render() {
    return (
      <ErrorBoundary
        fallback={(error, errorInfo) => (
          <FormErrorFallback error={error} errorInfo={errorInfo} onReset={this.props.onReset} />
        )}
        onError={(error, errorInfo) => {
          // Log form-specific errors
        }}
      >
        {this.props.children}
      </ErrorBoundary>
    )
  }
}

// Props for Data error boundary
export interface DataErrorBoundaryProps {
  children: ReactNode
  onRetry?: () => void
  fallback?: ReactNode
}

// Data Error Fallback Component
const DataErrorFallback: React.FC<{
  error: Error
  errorInfo: ErrorInfo
  onRetry?: () => void
}> = ({ error, errorInfo, onRetry }) => {
  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      window.location.reload()
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
          <Database className="h-6 w-6 text-purple-600" />
        </div>
        <CardTitle className="text-lg font-semibold text-gray-900">Data Error</CardTitle>
        <CardDescription className="text-gray-600">
          Unable to load or process data. Please try again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>
            <strong>Error:</strong> {error.message}
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleRetry} className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Data Error Boundary Component
export class DataErrorBoundary extends Component<DataErrorBoundaryProps> {
  render() {
    return (
      <ErrorBoundary
        fallback={(error, errorInfo) => (
          <DataErrorFallback error={error} errorInfo={errorInfo} onRetry={this.props.onRetry} />
        )}
        onError={(error, errorInfo) => {
          // Log data-specific errors
        }}
      >
        {this.props.children}
      </ErrorBoundary>
    )
  }
}

// Props for Component error boundary
export interface ComponentErrorBoundaryProps {
  children: ReactNode
  componentName?: string
  fallback?: ReactNode
}

// Component Error Fallback Component
const ComponentErrorFallback: React.FC<{
  error: Error
  errorInfo: ErrorInfo
  componentName?: string
}> = ({ error, errorInfo, componentName }) => {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <AlertTriangle className="h-6 w-6 text-gray-600" />
        </div>
        <CardTitle className="text-lg font-semibold text-gray-900">Component Error</CardTitle>
        <CardDescription className="text-gray-600">
          {componentName
            ? `There was an error in the ${componentName} component.`
            : 'There was an error in this component.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>
            <strong>Error:</strong> {error.message}
          </p>
          {componentName ? (
            <p>
              <strong>Component:</strong> {componentName}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

// Component Error Boundary Component
export class ComponentErrorBoundary extends Component<ComponentErrorBoundaryProps> {
  render() {
    return (
      <ErrorBoundary
        fallback={(error, errorInfo) => (
          <ComponentErrorFallback
            error={error}
            errorInfo={errorInfo}
            componentName={this.props.componentName}
          />
        )}
        onError={(error, errorInfo) => {
          // Log component-specific errors (removed for production)
        }}
      >
        {this.props.children}
      </ErrorBoundary>
    )
  }
}

// Higher-order component for wrapping components with error boundaries
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>,
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Hook for handling async errors in functional components
export const useAsyncError = () => {
  const [, setError] = React.useState()
  return React.useCallback((error: Error) => {
    setError(() => {
      throw error
    })
  }, [])
}
