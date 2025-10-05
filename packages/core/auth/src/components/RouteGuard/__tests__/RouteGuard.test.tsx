import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RouteGuard from '../index';
import authReducer from '../../../store/authSlice';
import { authApi } from '../../../store/authApi';

// Mock dependencies
vi.mock('../../../utils/token');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Import mocked modules
import * as tokenUtils from '../../../utils/token';

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      [authApi.reducerPath]: authApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(authApi.middleware),
    preloadedState: {
      auth: {
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        isCheckingAuth: false,
        error: null,
        message: null,
        lastActivity: null,
        sessionTimeout: 1800000,
        ...initialState,
      },
    },
  });
};

const renderWithProviders = (component: React.ReactElement, initialState = {}) => {
  const store = createMockStore(initialState);
  return render(
    <Provider store={store}>
      <MemoryRouter>
        {component}
      </MemoryRouter>
    </Provider>
  );
};

describe('RouteGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    
    // Default mock implementations
    vi.mocked(tokenUtils.refreshToken).mockResolvedValue('new-token');
  });

  it('renders children when user is authenticated and has required role', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      isVerified: true,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    };

    renderWithProviders(
      <RouteGuard requiredRole="admin">
        <div data-testid="protected-content">Protected Content</div>
      </RouteGuard>,
      {
        user: mockUser,
        isAuthenticated: true,
        isCheckingAuth: false,
      }
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows loading spinner while checking authentication', () => {
    renderWithProviders(
      <RouteGuard>
        <div>Protected Content</div>
      </RouteGuard>,
      {
        isCheckingAuth: true,
      }
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading authentication status')).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    renderWithProviders(
      <RouteGuard>
        <div>Protected Content</div>
      </RouteGuard>,
      {
        isAuthenticated: false,
        isCheckingAuth: false,
      }
    );

    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('redirects to custom login path when specified', () => {
    renderWithProviders(
      <RouteGuard redirectTo="/custom-login">
        <div>Protected Content</div>
      </RouteGuard>,
      {
        isAuthenticated: false,
        isCheckingAuth: false,
      }
    );

    expect(mockNavigate).toHaveBeenCalledWith('/custom-login', { replace: true });
  });

  it('redirects to unauthorized page when user lacks required role', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      isVerified: true,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    };

    renderWithProviders(
      <RouteGuard requiredRole="admin">
        <div>Protected Content</div>
      </RouteGuard>,
      {
        user: mockUser,
        isAuthenticated: true,
        isCheckingAuth: false,
      }
    );

    expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', { replace: true });
  });

  it('redirects to custom unauthorized path when specified', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      emailVerified: true,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    };

    renderWithProviders(
      <RouteGuard requiredRole="admin" unauthorizedTo="/custom-unauthorized">
        <div>Protected Content</div>
      </RouteGuard>,
      {
        user: mockUser,
        isAuthenticated: true,
        isCheckingAuth: false,
      }
    );

    expect(mockNavigate).toHaveBeenCalledWith('/custom-unauthorized', { replace: true });
  });

  it('redirects to email verification when requireVerified is true and email not verified', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      isVerified: false,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    };

    renderWithProviders(
      <RouteGuard requireVerified={true}>
        <div>Protected Content</div>
      </RouteGuard>,
      {
        user: mockUser,
        isAuthenticated: true,
        isCheckingAuth: false,
      }
    );

    expect(mockNavigate).toHaveBeenCalledWith('/verify-email', { replace: true });
  });

  it('allows access when requireVerified is true and email is verified', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      isVerified: true,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    };

    renderWithProviders(
      <RouteGuard requireVerified={true}>
        <div data-testid="protected-content">Protected Content</div>
      </RouteGuard>,
      {
        user: mockUser,
        isAuthenticated: true,
        isCheckingAuth: false,
      }
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('handles loading state', () => {
    renderWithProviders(
      <RouteGuard>
        <div>Protected Content</div>
      </RouteGuard>,
      {
        isAuthenticated: false,
        isCheckingAuth: true,
      }
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('attempts token refresh when user is authenticated', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      isVerified: true,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    };

    renderWithProviders(
      <RouteGuard>
        <div data-testid="protected-content">Protected Content</div>
      </RouteGuard>,
      {
        user: mockUser,
        isAuthenticated: true,
        isCheckingAuth: false,
      }
    );

    await waitFor(() => {
      expect(tokenUtils.refreshToken).toHaveBeenCalled();
    });
  });

  it('redirects to login when token refresh fails', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      emailVerified: true,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    };

    vi.mocked(tokenUtils.refreshToken).mockRejectedValue(new Error('Refresh failed'));

    renderWithProviders(
      <RouteGuard>
        <div>Protected Content</div>
      </RouteGuard>,
      {
        user: mockUser,
        isAuthenticated: true,
        isCheckingAuth: false,
      }
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });
}); 