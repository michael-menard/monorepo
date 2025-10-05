import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';

// Import packages to test integration
import { LoginForm } from '@repo/auth';
import { Button, Input } from '@repo/ui';
import { authSlice, loginUser } from '@repo/auth';

// Mock external API calls (integration test - only mock external I/O)
vi.mock('@repo/auth/api', () => ({
  authAPI: {
    login: vi.fn(),
    logout: vi.fn(),
    checkAuth: vi.fn(),
  }
}));

describe('Auth + UI Package Integration Tests', () => {
  let store: any;

  beforeEach(() => {
    // Create real Redux store with auth slice (no mocking internal state management)
    store = configureStore({
      reducer: {
        auth: authSlice.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }),
    });

    vi.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </Provider>
    );
  };

  describe('Login Form Integration', () => {
    it('should integrate auth package LoginForm with UI package components', async () => {
      const mockLoginResponse = {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        token: 'mock-jwt-token'
      };

      const { authAPI } = await import('@repo/auth/api');
      authAPI.login.mockResolvedValue(mockLoginResponse);

      renderWithProviders(<LoginForm />);

      // Verify UI components are rendered (from @repo/ui)
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

      // Test form submission with real auth logic
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(authAPI.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });

      // Verify auth state was updated (real Redux state management)
      await waitFor(() => {
        const authState = store.getState().auth;
        expect(authState.user).toEqual(mockLoginResponse.user);
        expect(authState.isAuthenticated).toBe(true);
      });
    });

    it('should handle login errors with UI feedback', async () => {
      const { authAPI } = await import('@repo/auth/api');
      authAPI.login.mockRejectedValue(new Error('Invalid credentials'));

      renderWithProviders(<LoginForm />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' }
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Verify error state in auth package
      await waitFor(() => {
        const authState = store.getState().auth;
        expect(authState.error).toBeTruthy();
        expect(authState.isLoading).toBe(false);
      });

      // Verify UI shows error message
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during authentication', async () => {
      const { authAPI } = await import('@repo/auth/api');
      
      // Create a promise that we can control
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      authAPI.login.mockReturnValue(loginPromise);

      renderWithProviders(<LoginForm />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Verify loading state
      await waitFor(() => {
        const authState = store.getState().auth;
        expect(authState.isLoading).toBe(true);
      });

      // Verify UI shows loading indicator
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();

      // Resolve the login
      resolveLogin!({
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        token: 'mock-jwt-token'
      });

      // Verify loading state is cleared
      await waitFor(() => {
        const authState = store.getState().auth;
        expect(authState.isLoading).toBe(false);
      });
    });
  });

  describe('Protected Route Integration', () => {
    it('should integrate auth state with route protection', async () => {
      // Mock a protected component
      const ProtectedComponent = () => {
        const authState = store.getState().auth;
        
        if (!authState.isAuthenticated) {
          return <div>Please log in to access this page</div>;
        }
        
        return <div>Protected content for {authState.user?.name}</div>;
      };

      // Test unauthenticated state
      renderWithProviders(<ProtectedComponent />);
      expect(screen.getByText(/please log in/i)).toBeInTheDocument();

      // Simulate successful authentication
      store.dispatch(authSlice.actions.loginSuccess({
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        token: 'mock-jwt-token'
      }));

      // Re-render with authenticated state
      renderWithProviders(<ProtectedComponent />);
      expect(screen.getByText(/protected content for test user/i)).toBeInTheDocument();
    });
  });

  describe('Authentication State Persistence', () => {
    it('should persist auth state across component re-renders', async () => {
      // Simulate login
      store.dispatch(authSlice.actions.loginSuccess({
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        token: 'mock-jwt-token'
      }));

      const AuthStatusComponent = () => {
        const authState = store.getState().auth;
        return (
          <div>
            <span data-testid="auth-status">
              {authState.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </span>
            <span data-testid="user-name">{authState.user?.name || 'No User'}</span>
          </div>
        );
      };

      const { rerender } = renderWithProviders(<AuthStatusComponent />);

      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');

      // Re-render component
      rerender(
        <Provider store={store}>
          <BrowserRouter>
            <AuthStatusComponent />
          </BrowserRouter>
        </Provider>
      );

      // State should persist
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
    });
  });

  describe('Logout Integration', () => {
    it('should clear auth state and update UI on logout', async () => {
      const { authAPI } = await import('@repo/auth/api');
      authAPI.logout.mockResolvedValue({ success: true });

      // Start with authenticated state
      store.dispatch(authSlice.actions.loginSuccess({
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        token: 'mock-jwt-token'
      }));

      const LogoutComponent = () => {
        const authState = store.getState().auth;
        
        const handleLogout = async () => {
          await store.dispatch(loginUser.logout());
        };

        return (
          <div>
            <span data-testid="user-status">
              {authState.isAuthenticated ? `Logged in as ${authState.user?.name}` : 'Not logged in'}
            </span>
            <Button onClick={handleLogout} disabled={!authState.isAuthenticated}>
              Logout
            </Button>
          </div>
        );
      };

      renderWithProviders(<LogoutComponent />);

      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as Test User');

      fireEvent.click(screen.getByRole('button', { name: /logout/i }));

      await waitFor(() => {
        expect(authAPI.logout).toHaveBeenCalled();
      });

      await waitFor(() => {
        const authState = store.getState().auth;
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.user).toBeNull();
      });

      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });
  });
});
