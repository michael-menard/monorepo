# Error Boundary Components

This package provides comprehensive error boundary components for React applications with user-friendly error displays and error reporting capabilities.

## Features

- **Multiple Error Boundary Types**: Basic, API, Form, Data, and Component-specific error boundaries
- **User-Friendly Error UI**: Beautiful, accessible error displays with actionable buttons
- **Error Reporting**: Built-in error reporting utilities with extensible architecture
- **Development Support**: Detailed error information in development mode
- **Recovery Mechanisms**: Reset and retry functionality for different error types
- **TypeScript Support**: Full TypeScript support with Zod schema validation
- **Testing Support**: Comprehensive test coverage with Vitest

## Components

### Basic Error Boundary

The main error boundary component that catches JavaScript errors anywhere in the child component tree.

```tsx
import { ErrorBoundary } from '@repo/ui'

;<ErrorBoundary onError={handleError}>
  <YourComponent />
</ErrorBoundary>
```

### Specialized Error Boundaries

#### API Error Boundary

For handling API/network-related errors with retry functionality.

```tsx
import { ApiErrorBoundary } from '@repo/ui'

;<ApiErrorBoundary onRetry={retryApiCall}>
  <ApiComponent />
</ApiErrorBoundary>
```

#### Form Error Boundary

For handling form validation and processing errors.

```tsx
import { FormErrorBoundary } from '@repo/ui'

;<FormErrorBoundary onReset={resetForm}>
  <FormComponent />
</FormErrorBoundary>
```

#### Data Error Boundary

For handling data loading and processing errors.

```tsx
import { DataErrorBoundary } from '@repo/ui'

;<DataErrorBoundary onRetry={reloadData}>
  <DataComponent />
</DataErrorBoundary>
```

#### Component Error Boundary

For component-specific error handling with component name display.

```tsx
import { ComponentErrorBoundary } from '@repo/ui'

;<ComponentErrorBoundary componentName="UserProfile">
  <UserProfileComponent />
</ComponentErrorBoundary>
```

## Hooks and Utilities

### useErrorHandler

Hook for functional components to trigger error boundaries.

```tsx
import { useErrorHandler } from '@repo/ui'

const Component = () => {
  const handleError = useErrorHandler()

  const handleAsyncOperation = async () => {
    try {
      await riskyOperation()
    } catch (error) {
      handleError(error)
    }
  }
}
```

### useAsyncError

Hook for handling asynchronous errors in functional components.

```tsx
import { useAsyncError } from '@repo/ui'

const Component = () => {
  const throwAsyncError = useAsyncError()

  const handleAsyncError = () => {
    setTimeout(() => {
      throwAsyncError(new Error('Async error'))
    }, 100)
  }
}
```

### Error Reporting Utilities

#### generateErrorReport

Generate structured error reports with additional context.

```tsx
import { generateErrorReport } from '@repo/ui'

const error = new Error('Something went wrong')
const report = generateErrorReport(error, {
  userId: '123',
  action: 'save_profile',
  component: 'ProfileForm',
})
```

#### sendErrorReport

Send error reports to external services (placeholder implementation).

```tsx
import { sendErrorReport } from '@repo/ui'

const handleError = async (error: Error) => {
  const report = generateErrorReport(error)
  await sendErrorReport(report)
}
```

## Higher-Order Component

### withErrorBoundary

Wrap components with error boundaries using HOC pattern.

```tsx
import { withErrorBoundary } from '@repo/ui'

const SafeComponent = withErrorBoundary(RiskyComponent, {
  onError: handleError,
  fallback: <CustomErrorUI />,
})

;<SafeComponent />
```

## Props

### ErrorBoundary Props

```tsx
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo) => ReactNode)
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: any[]
  errorId?: string
}
```

### ErrorInfo Schema

```tsx
interface ErrorInfo {
  message: string
  stack?: string
  componentStack?: string
  timestamp: Date
  errorId: string
  userAgent?: string
  url?: string
}
```

## Custom Fallbacks

You can provide custom fallback components or functions:

```tsx
// Custom component
<ErrorBoundary fallback={<CustomErrorUI />}>
  <Component />
</ErrorBoundary>

// Custom function
<ErrorBoundary
  fallback={(error, errorInfo) => (
    <div>
      <h1>Custom Error: {error.message}</h1>
      <p>Error ID: {errorInfo.errorId}</p>
    </div>
  )}
>
  <Component />
</ErrorBoundary>
```

## Error Recovery

### Reset Keys

Use reset keys to automatically reset error boundaries when dependencies change:

```tsx
<ErrorBoundary resetKeys={[userId, pageId]}>
  <Component />
</ErrorBoundary>
```

### Manual Reset

Error boundaries provide reset functionality through their UI or programmatically:

```tsx
const ErrorBoundaryRef = useRef<ErrorBoundary>(null)

// Programmatic reset
ErrorBoundaryRef.current?.handleReset()
```

## Development vs Production

In development mode, error boundaries show detailed error information including:

- Error message and stack trace
- Error ID and timestamp
- Component stack trace

In production mode, only user-friendly error messages are displayed.

## Testing

The error boundary components include comprehensive tests covering:

- Error catching and display
- Custom fallbacks
- Error recovery mechanisms
- Specialized boundary types
- Hooks and utilities

Run tests with:

```bash
pnpm test
```

## Integration Examples

### App-Level Error Boundary

```tsx
import { ErrorBoundary } from '@repo/ui'

function App() {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Log to external service
    console.error('App error:', error, errorInfo)
  }

  return (
    <ErrorBoundary onError={handleError}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}
```

### Feature-Level Error Boundaries

```tsx
import { ApiErrorBoundary, DataErrorBoundary } from '@repo/ui'

function UserProfile() {
  return (
    <div>
      <ApiErrorBoundary onRetry={fetchUserData}>
        <UserDataComponent />
      </ApiErrorBoundary>

      <DataErrorBoundary onRetry={loadUserPosts}>
        <UserPostsComponent />
      </DataErrorBoundary>
    </div>
  )
}
```

### Form Error Handling

```tsx
import { FormErrorBoundary } from '@repo/ui'

function ProfileForm() {
  const handleFormReset = () => {
    // Reset form state
    form.reset()
  }

  return (
    <FormErrorBoundary onReset={handleFormReset}>
      <form onSubmit={handleSubmit}>{/* Form fields */}</form>
    </FormErrorBoundary>
  )
}
```

## Best Practices

1. **Place error boundaries strategically**: Use them at different levels of your component tree
2. **Provide meaningful error messages**: Help users understand what went wrong
3. **Include recovery actions**: Give users ways to retry or reset
4. **Log errors appropriately**: Use the onError callback for error reporting
5. **Test error scenarios**: Ensure error boundaries work as expected
6. **Use specialized boundaries**: Choose the right boundary type for your use case

## Error Reporting Integration

To integrate with external error reporting services:

```tsx
// Example: Sentry integration
import * as Sentry from '@sentry/react'

const handleError = (error: Error, errorInfo: ErrorInfo) => {
  Sentry.captureException(error, {
    extra: errorInfo,
    tags: {
      component: 'UserProfile',
      errorId: errorInfo.errorId,
    },
  })
}

;<ErrorBoundary onError={handleError}>
  <UserProfile />
</ErrorBoundary>
```

## Accessibility

Error boundaries include proper accessibility features:

- Semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader friendly error messages
- High contrast error states

## Performance

Error boundaries are optimized for performance:

- Minimal re-renders
- Efficient error state management
- Lazy error reporting
- Memory leak prevention
