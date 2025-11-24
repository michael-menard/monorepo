/**
 * React Error Boundary Component
 * Story 3.4: Frontend Error Reporting to CloudWatch
 *
 * This component catches React errors in the component tree and reports them
 * to CloudWatch while showing a fallback UI to users.
 */

import React, { Component, type ReactNode, type ErrorInfo } from 'react'
import { reportError } from '../lib/tracking/error-reporting'

/**
 * Error Boundary Props
 */
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo) => ReactNode)
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  context?: Record<string, unknown>
}

/**
 * Error Boundary State
 */
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary Component
 *
 * Catches errors in child components and reports them to CloudWatch
 */
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error info
    this.setState({
      errorInfo,
    })

    // Report error to CloudWatch
    reportError('react-error-boundary', error, this.props.context, errorInfo.componentStack)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo)
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.state.errorInfo)
        }
        return this.props.fallback
      }

      // Default fallback UI
      return <DefaultErrorFallback error={this.state.error} errorInfo={this.state.errorInfo} />
    }

    return this.props.children
  }
}

/**
 * Default Error Fallback UI
 */
function DefaultErrorFallback({
  error,
  errorInfo,
}: {
  error: Error
  errorInfo: ErrorInfo
}): ReactNode {
  const [showDetails, setShowDetails] = React.useState(false)

  return (
    <div
      style={{
        padding: '2rem',
        maxWidth: '800px',
        margin: '2rem auto',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #ffc107',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#fff3cd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '1rem',
          }}
        >
          <span style={{ fontSize: '24px' }}>⚠️</span>
        </div>
        <div>
          <h2 style={{ margin: 0, color: '#856404', fontSize: '1.5rem' }}>Something went wrong</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#666' }}>
            We've been notified and are working on it.
          </p>
        </div>
      </div>

      <div
        style={{
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          marginBottom: '1rem',
        }}
      >
        <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem', color: '#dc3545' }}>
          {error.toString()}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 500,
          }}
        >
          Reload Page
        </button>

        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#fff',
            color: '#007bff',
            border: '1px solid #007bff',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 500,
          }}
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {showDetails && (
        <details
          open
          style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            maxHeight: '400px',
            overflow: 'auto',
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              color: '#495057',
            }}
          >
            Error Details
          </summary>
          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Stack Trace:</h4>
            <pre
              style={{
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                padding: '0.5rem',
                backgroundColor: '#fff',
                borderRadius: '4px',
                color: '#212529',
              }}
            >
              {error.stack}
            </pre>
          </div>
          {errorInfo.componentStack && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Component Stack:</h4>
              <pre
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  padding: '0.5rem',
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  color: '#212529',
                }}
              >
                {errorInfo.componentStack}
              </pre>
            </div>
          )}
        </details>
      )}

      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#d1ecf1',
            borderRadius: '4px',
            fontSize: '0.875rem',
            color: '#0c5460',
          }}
        >
          <strong>Development Mode:</strong> This error has been logged to the console. In
          production, it will be sent to CloudWatch for monitoring.
        </div>
      )}
    </div>
  )
}
