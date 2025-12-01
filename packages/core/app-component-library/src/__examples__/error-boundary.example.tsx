import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../base/layout/card'
import { Button } from '../base/primitives/button'
import { Badge } from '../base/data-display/badge'
import {
  ErrorBoundary,
  useErrorHandler,
  generateErrorReport,
  sendErrorReport,
} from '../errors/error-boundary'
import {
  ApiErrorBoundary,
  FormErrorBoundary,
  DataErrorBoundary,
  ComponentErrorBoundary,
  withErrorBoundary,
  useAsyncError,
} from '../errors/error-boundary-specialized'

// Example component that might throw an error
const RiskyComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('This is a simulated error in RiskyComponent')
  }

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
      <p className="text-green-800">RiskyComponent rendered successfully!</p>
    </div>
  )
}

// Example API component that might fail
const ApiComponent: React.FC<{ shouldFail?: boolean }> = ({ shouldFail = false }) => {
  if (shouldFail) {
    throw new Error('API request failed: Network timeout')
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
      <p className="text-blue-800">API data loaded successfully!</p>
    </div>
  )
}

// Example form component that might have validation errors
const FormComponent: React.FC<{ hasError?: boolean }> = ({ hasError = false }) => {
  if (hasError) {
    throw new Error('Form validation failed: Invalid email format')
  }

  return (
    <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
      <p className="text-purple-800">Form submitted successfully!</p>
    </div>
  )
}

// Example data component that might fail to load
const DataComponent: React.FC<{ dataError?: boolean }> = ({ dataError = false }) => {
  if (dataError) {
    throw new Error('Failed to load data: Database connection error')
  }

  return (
    <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
      <p className="text-orange-800">Data loaded successfully!</p>
    </div>
  )
}

// Component wrapped with HOC
const WrappedComponent = withErrorBoundary(RiskyComponent)

// Component using async error handling
const AsyncComponent: React.FC = () => {
  const throwAsyncError = useAsyncError()
  const [count, setCount] = useState(0)

  const handleAsyncError = () => {
    setTimeout(() => {
      throwAsyncError(new Error('Async operation failed'))
    }, 100)
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
      <p className="text-yellow-800">Async Component (Count: {count})</p>
      <div className="mt-2 space-x-2">
        <Button onClick={() => setCount(count + 1)} size="sm">
          Increment
        </Button>
        <Button onClick={handleAsyncError} variant="destructive" size="sm">
          Trigger Async Error
        </Button>
      </div>
    </div>
  )
}

// Main example component
export const ErrorBoundaryExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState('basic')
  const [shouldThrow, setShouldThrow] = useState(false)
  const [shouldFail, setShouldFail] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [dataError, setDataError] = useState(false)

  const handleError = (error: Error, errorInfo: any) => {
    // Generate and send error report
    const report = generateErrorReport(error, {
      component: 'ErrorBoundaryExample',
      userAction: 'testing',
    })
    sendErrorReport(report)
  }

  const tabs = [
    { id: 'basic', label: 'Basic Error Boundary' },
    { id: 'api', label: 'API Error Boundary' },
    { id: 'form', label: 'Form Error Boundary' },
    { id: 'data', label: 'Data Error Boundary' },
    { id: 'component', label: 'Component Error Boundary' },
    { id: 'hoc', label: 'HOC Wrapper' },
    { id: 'async', label: 'Async Error Handling' },
  ]

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Error Boundary Examples</h1>
        <p className="text-gray-600">
          Demonstrating different types of error boundaries and error handling patterns
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Basic Error Boundary */}
      {activeTab === 'basic' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Basic Error Boundary
              <Badge variant="secondary">Default</Badge>
            </CardTitle>
            <CardDescription>Standard error boundary with default fallback UI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => setShouldThrow(!shouldThrow)}
                variant={shouldThrow ? 'destructive' : 'default'}
              >
                {shouldThrow ? 'Disable Error' : 'Enable Error'}
              </Button>
            </div>

            <ErrorBoundary onError={handleError}>
              <RiskyComponent shouldThrow={shouldThrow} />
            </ErrorBoundary>
          </CardContent>
        </Card>
      )}

      {/* API Error Boundary */}
      {activeTab === 'api' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              API Error Boundary
              <Badge variant="secondary">Network</Badge>
            </CardTitle>
            <CardDescription>Specialized error boundary for API/network errors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => setShouldFail(!shouldFail)}
                variant={shouldFail ? 'destructive' : 'default'}
              >
                {shouldFail ? 'Disable API Error' : 'Enable API Error'}
              </Button>
            </div>

            <ApiErrorBoundary onRetry={() => setShouldFail(false)}>
              <ApiComponent shouldFail={shouldFail} />
            </ApiErrorBoundary>
          </CardContent>
        </Card>
      )}

      {/* Form Error Boundary */}
      {activeTab === 'form' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Form Error Boundary
              <Badge variant="secondary">Validation</Badge>
            </CardTitle>
            <CardDescription>Specialized error boundary for form validation errors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => setHasError(!hasError)}
                variant={hasError ? 'destructive' : 'default'}
              >
                {hasError ? 'Disable Form Error' : 'Enable Form Error'}
              </Button>
            </div>

            <FormErrorBoundary onReset={() => setHasError(false)}>
              <FormComponent hasError={hasError} />
            </FormErrorBoundary>
          </CardContent>
        </Card>
      )}

      {/* Data Error Boundary */}
      {activeTab === 'data' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Data Error Boundary
              <Badge variant="secondary">Database</Badge>
            </CardTitle>
            <CardDescription>Specialized error boundary for data loading errors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => setDataError(!dataError)}
                variant={dataError ? 'destructive' : 'default'}
              >
                {dataError ? 'Disable Data Error' : 'Enable Data Error'}
              </Button>
            </div>

            <DataErrorBoundary onRetry={() => setDataError(false)}>
              <DataComponent dataError={dataError} />
            </DataErrorBoundary>
          </CardContent>
        </Card>
      )}

      {/* Component Error Boundary */}
      {activeTab === 'component' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Component Error Boundary
              <Badge variant="secondary">Specific</Badge>
            </CardTitle>
            <CardDescription>Error boundary with component-specific error handling</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => setShouldThrow(!shouldThrow)}
                variant={shouldThrow ? 'destructive' : 'default'}
              >
                {shouldThrow ? 'Disable Component Error' : 'Enable Component Error'}
              </Button>
            </div>

            <ComponentErrorBoundary componentName="RiskyComponent">
              <RiskyComponent shouldThrow={shouldThrow} />
            </ComponentErrorBoundary>
          </CardContent>
        </Card>
      )}

      {/* HOC Wrapper */}
      {activeTab === 'hoc' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              HOC Error Boundary
              <Badge variant="secondary">Wrapper</Badge>
            </CardTitle>
            <CardDescription>
              Component wrapped with error boundary using higher-order component
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => setShouldThrow(!shouldThrow)}
                variant={shouldThrow ? 'destructive' : 'default'}
              >
                {shouldThrow ? 'Disable HOC Error' : 'Enable HOC Error'}
              </Button>
            </div>

            <WrappedComponent shouldThrow={shouldThrow} />
          </CardContent>
        </Card>
      )}

      {/* Async Error Handling */}
      {activeTab === 'async' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Async Error Handling
              <Badge variant="secondary">Hook</Badge>
            </CardTitle>
            <CardDescription>
              Handling asynchronous errors using the useAsyncError hook
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ErrorBoundary>
              <AsyncComponent />
            </ErrorBoundary>
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
          <CardDescription>How to implement error boundaries in your application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Basic Implementation</h4>
              <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                {`import { ErrorBoundary } from '@repo/app-component-library';

<ErrorBoundary onError={handleError}>
  <YourComponent />
</ErrorBoundary>`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Specialized Boundaries</h4>
              <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                {`import { 
  ApiErrorBoundary,
  FormErrorBoundary,
  DataErrorBoundary 
} from '@repo/app-component-library';

<ApiErrorBoundary onRetry={retryApiCall}>
  <ApiComponent />
</ApiErrorBoundary>`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">HOC Pattern</h4>
              <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                {`import { withErrorBoundary } from '@repo/app-component-library';

const SafeComponent = withErrorBoundary(RiskyComponent);
<SafeComponent />`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Async Error Handling</h4>
              <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                {`import { useAsyncError } from '@repo/app-component-library';

const Component = () => {
  const throwAsyncError = useAsyncError();
  
  const handleAsyncError = () => {
    setTimeout(() => {
      throwAsyncError(new Error('Async error'));
    }, 100);
  };
};`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
