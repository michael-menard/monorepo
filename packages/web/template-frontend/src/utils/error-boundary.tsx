import React from 'react';
import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from 'react-error-boundary';

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        
        <div className="mt-4 text-center">
          <h3 className="text-lg font-medium text-gray-900">Something went wrong</h3>
          <p className="mt-2 text-sm text-gray-500">
            We're sorry, but something unexpected happened. Please try again.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                Error Details
              </summary>
              <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                {error.message}
                {error.stack}
              </pre>
            </details>
          )}
          
          <div className="mt-6 flex space-x-3">
            <button
              onClick={resetErrorBoundary}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Error boundary with logging
const ErrorBoundaryWithLogging = ({ children }: { children: React.ReactNode }) => {
  const handleError = (error: Error, info: any) => {
    // Log error to your logging service
    console.error('Error caught by boundary:', error, info);
    
    // You can send to your logging service here
    // logError(error, 'ErrorBoundary');
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback as any}
      onError={handleError}
      onReset={() => {
        // Reset the state of your app here
        window.location.reload();
      }}
    >
      {children as any}
    </ReactErrorBoundary>
  );
};

// Export the error boundary
export { ErrorBoundaryWithLogging as ErrorBoundary };

// Export the fallback component for custom usage
export { ErrorFallback };

// Utility to wrap components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<FallbackProps>
) => {
  const WrappedComponent = (props: P) => (
    <ReactErrorBoundary
      FallbackComponent={(fallback || ErrorFallback) as any}
      onError={(error, errorInfo) => {
        console.error('Component error:', error, errorInfo);
      }}
    >
      <Component {...props} />
    </ReactErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}; 