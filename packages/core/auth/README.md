# @repo/auth

A shared authentication package for React applications using Redux Toolkit for state management.

## Features

- 🔐 **Complete Auth Flow**: Signup, login, logout, email verification
- 🔒 **Password Reset**: Forgot password and reset functionality
- 🎯 **Redux Toolkit**: Modern state management with async thunks
- 📱 **React Hooks**: Easy-to-use hooks for components
- 🎨 **UI Components**: Reusable auth components (LoadingSpinner, Input, etc.)
- 🔧 **TypeScript**: Full type safety and IntelliSense support

## Installation

This package is part of the monorepo and should be installed as a dependency in your app:

```bash
pnpm add @repo/auth
```

## Quick Start

### 1. Setup Redux Provider

Wrap your app with the Redux Provider:

```tsx
import { Provider } from 'react-redux';
import { store } from '@repo/auth';

function App() {
  return (
    <Provider store={store}>
      <YourApp />
    </Provider>
  );
}
```

### 2. Use the Auth Hook

```tsx
import { useAuth } from '@repo/auth';

function LoginForm() {
  const { login, isLoading, error, user } = useAuth();

  const handleSubmit = async (email: string, password: string) => {
    try {
      await login(email, password);
      // User is now logged in
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {isLoading && <div>Loading...</div>}
      {/* Your form fields */}
    </form>
  );
}
```

## API Reference

### useAuth Hook

The main hook that provides access to auth state and actions.

```tsx
const {
  // State
  user,
  isAuthenticated,
  isLoading,
  isCheckingAuth,
  error,
  message,
  
  // Actions
  signup,
  login,
  logout,
  verifyEmail,
  checkAuth,
  forgotPassword,
  resetPassword,
  clearError,
  clearMessage,
} = useAuth();
```

#### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `user` | `User \| null` | Current user object |
| `isAuthenticated` | `boolean` | Whether user is logged in |
| `isLoading` | `boolean` | Loading state for auth operations |
| `isCheckingAuth` | `boolean` | Loading state for initial auth check |
| `error` | `string \| null` | Current error message |
| `message` | `string \| null` | Success/info message |

#### Action Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `signup` | `(email, password, name)` | Register new user |
| `login` | `(email, password)` | Log in user |
| `logout` | `()` | Log out user |
| `verifyEmail` | `(code)` | Verify email with code |
| `checkAuth` | `()` | Check current auth status |
| `forgotPassword` | `(email)` | Send password reset email |
| `resetPassword` | `(token, password)` | Reset password with token |
| `clearError` | `()` | Clear current error |
| `clearMessage` | `()` | Clear current message |

### User Type

```tsx
interface User {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## Usage Examples

### Authentication Flow

```tsx
import { useAuth } from '@repo/auth';

function AuthApp() {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuth();

  useEffect(() => {
    // Check auth status on app load
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return isAuthenticated ? <Dashboard /> : <LoginForm />;
}
```

### Login Form

```tsx
import { useAuth } from '@repo/auth';

function LoginForm() {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    try {
      await login(email, password);
      // Redirect or show success
    } catch (error) {
      // Error is handled by the store
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### Signup Form

```tsx
import { useAuth } from '@repo/auth';

function SignupForm() {
  const { signup, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await signup(formData.email, formData.password, formData.name);
      // Show verification message
    } catch (error) {
      // Error is handled by the store
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Name"
        required
      />
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={formData.password}
        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  );
}
```

### Password Reset

```tsx
import { useAuth } from '@repo/auth';

function ForgotPasswordForm() {
  const { forgotPassword, isLoading, message, error } = useAuth();
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await forgotPassword(email);
      // Show success message
    } catch (error) {
      // Error is handled by the store
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Reset Email'}
      </button>
    </form>
  );
}
```

### Protected Route Component

```tsx
import { useAuth } from '@repo/auth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isCheckingAuth } = useAuth();

  if (isCheckingAuth) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}
```

## UI Components

The package includes reusable UI components:

```tsx
import { 
  LoadingSpinner, 
  Input, 
  PasswordStrength, 
  FloatingShape,
  ProtectedRoute,
  RedirectAuthenticatedUser,
  AuthLayout,
  AuthApp
} from '@repo/auth';

function MyComponent() {
  return (
    <div>
      <LoadingSpinner />
      <Input type="email" placeholder="Email" />
      <PasswordStrength password="myPassword" />
      <FloatingShape color="bg-blue-500" size="w-20 h-20" />
    </div>
  );
}
```

## Complete Auth App

For a complete authentication app, use the `AuthApp` component:

```tsx
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store, AuthApp } from '@repo/auth';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthApp />
      </BrowserRouter>
    </Provider>
  );
}
```

## Individual Components

Use individual components for custom implementations:

```tsx
import { 
  ProtectedRoute, 
  RedirectAuthenticatedUser,
  AuthLayout 
} from '@repo/auth';

function CustomAuthApp() {
  return (
    <AuthLayout>
      <Routes>
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/login" 
          element={
            <RedirectAuthenticatedUser>
              <Login />
            </RedirectAuthenticatedUser>
          } 
        />
      </Routes>
    </AuthLayout>
  );
}
```

## Redux DevTools

The store is configured with Redux DevTools for debugging:

1. Install the [Redux DevTools Extension](https://github.com/zalmoxisus/redux-devtools-extension)
2. Open your browser's DevTools
3. Go to the "Redux" tab
4. You can inspect state changes, actions, and time-travel debug

## Error Handling

The store automatically handles API errors and provides them through the `error` state:

```tsx
const { error, clearError } = useAuth();

// Clear errors when needed
useEffect(() => {
  clearError();
}, [clearError]);

// Display errors
{error && <div className="error">{error}</div>}
```

## Configuration

The auth store uses environment variables for API configuration:

- `NODE_ENV`: Determines API URL (development vs production)
- Development: `http://localhost:5000/api/auth`
- Production: `/api/auth`

## Testing

The package includes comprehensive tests for all auth functionality. To run tests:

```bash
pnpm test
```

## Migration from Zustand

If you're migrating from a Zustand-based auth store:

1. **Replace Zustand store** with this Redux Toolkit implementation
2. **Update imports** from local store to `@repo/auth`
3. **Wrap your app** with the Redux Provider
4. **Use the `useAuth` hook** instead of Zustand's `useAuthStore`

The API is designed to be similar to Zustand for easy migration.

## Contributing

When adding new features:

1. Add new async thunks to `authSlice.ts`
2. Update the `useAuth` hook to export new actions
3. Add corresponding tests
4. Update this README with new API documentation

## License

This package is part of the monorepo and follows the same license as the main project. 