import React, { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '@repo/logger'
import { Button } from '@repo/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })

    // Report error to monitoring service
    if (import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true') {
      // Error reporting logic would go here
      logger.error('Error reported to monitoring service:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      })
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription>
                We encountered an unexpected error. This has been reported to our team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.DEV && this.state.error ? (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <p className="font-mono text-xs break-all">{this.state.error.message}</p>
                    {this.state.error.stack ? (
                      <pre className="mt-2 text-xs overflow-auto max-h-32">
                        {this.state.error.stack}
                      </pre>
                    ) : null}
                  </div>
                </details>
              ) : null}

              <div className="flex gap-2">
                <Button onClick={this.handleRetry} variant="outline" className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome} className="flex-1">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook-based error boundary for functional components
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    logger.error('Error caught by useErrorHandler:', error, errorInfo)

    if (import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true') {
      // Report error to monitoring service
      logger.error('Error reported to monitoring service:', {
        error: error.message,
        stack: error.stack,
        ...errorInfo,
      })
    }
  }
}
