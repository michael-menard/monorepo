# RouteGuard Component

A React component for protecting routes with authentication and role-based access control.

## Features

- **Authentication Check**: Automatically redirects unauthenticated users to login
- **Role-Based Access**: Restricts access based on user roles
- **Email Verification**: Optional email verification requirement
- **Automatic Token Refresh**: Silently refreshes tokens when needed
- **Custom Redirects**: Configurable redirect paths for different scenarios
- **Loading States**: Shows loading spinner during authentication checks

## Usage

### Basic Authentication Protection

```tsx
import { RouteGuard } from '@repo/auth';

function ProtectedPage() {
  return (
    <RouteGuard>
      <div>This content is only visible to authenticated users</div>
    </RouteGuard>
  );
}
```

### Role-Based Access Control

```tsx
import { RouteGuard } from '@repo/auth';

function AdminPage() {
  return (
    <RouteGuard requiredRole="admin">
      <div>This content is only visible to admin users</div>
    </RouteGuard>
  );
}
```

### Email Verification Required

```tsx
import { RouteGuard } from '@repo/auth';

function VerifiedUserPage() {
  return (
    <RouteGuard requireVerified={true}>
      <div>This content requires email verification</div>
    </RouteGuard>
  );
}
```

### Custom Redirect Paths

```tsx
import { RouteGuard } from '@repo/auth';

function CustomProtectedPage() {
  return (
    <RouteGuard 
      redirectTo="/custom-login"
      unauthorizedTo="/access-denied"
    >
      <div>Protected content with custom redirects</div>
    </RouteGuard>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | The content to render if access is granted |
| `requiredRole` | `string` | - | Required user role for access |
| `redirectTo` | `string` | `'/login'` | Path to redirect unauthenticated users |
| `unauthorizedTo` | `string` | `'/unauthorized'` | Path to redirect unauthorized users |
| `requireVerified` | `boolean` | `false` | Whether email verification is required |

## Requirements

- Must be used within a Redux Provider with auth state
- Must be used within a React Router context
- Requires the auth package to be properly configured with RTK Query

## Integration with Apps

To use this component in other apps in the monorepo:

1. Install the auth package as a dependency
2. Set up Redux store with auth slice and API
3. Configure React Router
4. Import and use the RouteGuard component

Example app setup:

```tsx
// In your app's main component
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from '@repo/auth';
import { RouteGuard } from '@repo/auth';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <RouteGuard>
          <YourAppContent />
        </RouteGuard>
      </BrowserRouter>
    </Provider>
  );
}
``` 