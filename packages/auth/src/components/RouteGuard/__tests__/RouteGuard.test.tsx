import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import RouteGuard from '../index.js';
import authReducer from '../../../store/authSlice.js';
import { authApi } from '../../../store/authApi.js';
import * as tokenUtils from '../../../utils/token.js';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock RTK Query hook
const mockUseCheckAuthQuery = vi.hoisted(() => vi.fn());
vi.mock('../../../store/authApi', async () => {
  const actual = await vi.importActual('../../../store/authApi');
  return {
    ...actual,
    useCheckAuthQuery: mockUseCheckAuthQuery,
  };
});

// Mock token utilities
vi.mock('../../../utils/token', () => ({
  refreshToken: vi.fn(),
  shouldRefreshToken: vi.fn(),
  getTokenExpiry: vi.fn(),
  isTokenExpired: vi.fn(),
}));

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
        isAuthenticated: false,
        isCheckingAuth: false,
        isLoading: false,
        error: null,
        tokens: null,
        ...initialState,
      },
    },
  });
};

const renderWithProviders = (component: React.ReactNode, initialState = {}) => {
  const store = createMockStore(initialState);
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

const TestComponent = () => <div data-testid="test-component">Protected Content</div>;

describe('RouteGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for useCheckAuthQuery
    mockUseCheckAuthQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
  });

  describe('Authentication Checks', () => {
    it('shows loading spinner when checking auth', () => {
      mockUseCheckAuthQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      renderWithProviders(
        <RouteGuard>
          <TestComponent />
        </RouteGuard>,
        { isCheckingAuth: true }
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });

    it('redirects to login when not authenticated', () => {
      mockUseCheckAuthQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: { status: 401 },
      });

      renderWithProviders(
        <RouteGuard>
          <TestComponent />
        </RouteGuard>,
        { isAuthenticated: false, isCheckingAuth: false }
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });

    it('renders children when authenticated', async () => {
      const mockRefreshToken = vi.mocked(tokenUtils.refreshToken);
      mockRefreshToken.mockResolvedValue('new-token');

      mockUseCheckAuthQuery.mockReturnValue({
        data: {
          data: {
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
          },
        },
        isLoading: false,
        error: null,
      });

      await act(async () => {
        renderWithProviders(
          <RouteGuard>
            <TestComponent />
          </RouteGuard>,
          { 
            isAuthenticated: true, 
            isCheckingAuth: false,
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            }
          }
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('test-component')).toBeInTheDocument();
      });
    });

    it('redirects to custom login path when specified', () => {
      mockUseCheckAuthQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: { status: 401 },
      });

      renderWithProviders(
        <RouteGuard redirectTo="/custom-login">
          <TestComponent />
        </RouteGuard>,
        { isAuthenticated: false, isCheckingAuth: false }
      );

      expect(mockNavigate).toHaveBeenCalledWith('/custom-login', { replace: true });
    });
  });

  describe('Role-Based Access Control', () => {
    it('allows access when user has required role', async () => {
      const mockRefreshToken = vi.mocked(tokenUtils.refreshToken);
      mockRefreshToken.mockResolvedValue('new-token');

      mockUseCheckAuthQuery.mockReturnValue({
        data: {
          data: {
            user: {
              id: '1',
              email: 'admin@example.com',
              name: 'Admin User',
              role: 'admin',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
          },
        },
        isLoading: false,
        error: null,
      });

      await act(async () => {
        renderWithProviders(
          <RouteGuard requiredRole="admin">
            <TestComponent />
          </RouteGuard>,
          { 
            isAuthenticated: true, 
            isCheckingAuth: false,
            user: {
              id: '1',
              email: 'admin@example.com',
              name: 'Admin User',
              role: 'admin',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            }
          }
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('test-component')).toBeInTheDocument();
      });
    });

    it('redirects to unauthorized page when user lacks required role', async () => {
      const mockRefreshToken = vi.mocked(tokenUtils.refreshToken);
      mockRefreshToken.mockResolvedValue('new-token');

      mockUseCheckAuthQuery.mockReturnValue({
        data: {
          data: {
            user: {
              id: '1',
              email: 'user@example.com',
              name: 'Regular User',
              role: 'user',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
          },
        },
        isLoading: false,
        error: null,
      });

      await act(async () => {
        renderWithProviders(
          <RouteGuard requiredRole="admin">
            <TestComponent />
          </RouteGuard>,
          { 
            isAuthenticated: true, 
            isCheckingAuth: false,
            user: {
              id: '1',
              email: 'user@example.com',
              name: 'Regular User',
              role: 'user',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            }
          }
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', { replace: true });
    });

    it('redirects to custom unauthorized path when specified', async () => {
      const mockRefreshToken = vi.mocked(tokenUtils.refreshToken);
      mockRefreshToken.mockResolvedValue('new-token');

      mockUseCheckAuthQuery.mockReturnValue({
        data: {
          data: {
            user: {
              id: '1',
              email: 'user@example.com',
              name: 'Regular User',
              role: 'user',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
          },
        },
        isLoading: false,
        error: null,
      });

      await act(async () => {
        renderWithProviders(
          <RouteGuard requiredRole="admin" unauthorizedTo="/custom-unauthorized">
            <TestComponent />
          </RouteGuard>,
          { 
            isAuthenticated: true, 
            isCheckingAuth: false,
            user: {
              id: '1',
              email: 'user@example.com',
              name: 'Regular User',
              role: 'user',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            }
          }
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith('/custom-unauthorized', { replace: true });
    });
  });

  describe('Email Verification', () => {
    it('allows access when email verification is not required', async () => {
      const mockRefreshToken = vi.mocked(tokenUtils.refreshToken);
      mockRefreshToken.mockResolvedValue('new-token');

      mockUseCheckAuthQuery.mockReturnValue({
        data: {
          data: {
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              emailVerified: false,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
          },
        },
        isLoading: false,
        error: null,
      });

      await act(async () => {
        renderWithProviders(
          <RouteGuard>
            <TestComponent />
          </RouteGuard>,
          { 
            isAuthenticated: true, 
            isCheckingAuth: false,
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              emailVerified: false,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            }
          }
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('test-component')).toBeInTheDocument();
      });
    });

    it('allows access when email verification is required and user is verified', async () => {
      const mockRefreshToken = vi.mocked(tokenUtils.refreshToken);
      mockRefreshToken.mockResolvedValue('new-token');

      mockUseCheckAuthQuery.mockReturnValue({
        data: {
          data: {
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
          },
        },
        isLoading: false,
        error: null,
      });

      await act(async () => {
        renderWithProviders(
          <RouteGuard requireVerified={true}>
            <TestComponent />
          </RouteGuard>,
          { 
            isAuthenticated: true, 
            isCheckingAuth: false,
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            }
          }
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('test-component')).toBeInTheDocument();
      });
    });

    it('redirects to email verification when required but user is not verified', async () => {
      const mockRefreshToken = vi.mocked(tokenUtils.refreshToken);
      mockRefreshToken.mockResolvedValue('new-token');

      mockUseCheckAuthQuery.mockReturnValue({
        data: {
          data: {
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              emailVerified: false,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
          },
        },
        isLoading: false,
        error: null,
      });

      await act(async () => {
        renderWithProviders(
          <RouteGuard requireVerified={true}>
            <TestComponent />
          </RouteGuard>,
          { 
            isAuthenticated: true, 
            isCheckingAuth: false,
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              emailVerified: false,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            }
          }
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith('/verify-email', { replace: true });
    });
  });

  describe('Token Refresh', () => {
    it('attempts token refresh when user is authenticated', async () => {
      const mockRefreshToken = vi.mocked(tokenUtils.refreshToken);
      mockRefreshToken.mockResolvedValue('new-token');

      mockUseCheckAuthQuery.mockReturnValue({
        data: {
          data: {
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
          },
        },
        isLoading: false,
        error: null,
      });

      await act(async () => {
        renderWithProviders(
          <RouteGuard>
            <TestComponent />
          </RouteGuard>,
          { 
            isAuthenticated: true, 
            isCheckingAuth: false,
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            }
          }
        );
      });

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalled();
      });
    });

    it('redirects to login when token refresh fails', async () => {
      const mockRefreshToken = vi.mocked(tokenUtils.refreshToken);
      mockRefreshToken.mockRejectedValue(new Error('Refresh failed'));

      mockUseCheckAuthQuery.mockReturnValue({
        data: {
          data: {
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
          },
        },
        isLoading: false,
        error: null,
      });

      await act(async () => {
        renderWithProviders(
          <RouteGuard>
            <TestComponent />
          </RouteGuard>,
          { 
            isAuthenticated: true, 
            isCheckingAuth: false,
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            }
          }
        );
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('does not attempt refresh when already refreshing', async () => {
      const mockRefreshToken = vi.mocked(tokenUtils.refreshToken);
      mockRefreshToken.mockResolvedValue('new-token');

      mockUseCheckAuthQuery.mockReturnValue({
        data: {
          data: {
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
          },
        },
        isLoading: false,
        error: null,
      });

      await act(async () => {
        renderWithProviders(
          <RouteGuard>
            <TestComponent />
          </RouteGuard>,
          { 
            isAuthenticated: true, 
            isCheckingAuth: false,
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            }
          }
        );
      });

      // The refresh should only be called once due to the isRefreshing state
      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles missing user object gracefully', () => {
      mockUseCheckAuthQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: { status: 401 },
      });

      renderWithProviders(
        <RouteGuard>
          <TestComponent />
        </RouteGuard>,
        { isAuthenticated: false, isCheckingAuth: false, user: null }
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });

    it('handles user without role property', async () => {
      const mockRefreshToken = vi.mocked(tokenUtils.refreshToken);
      mockRefreshToken.mockResolvedValue('new-token');

      mockUseCheckAuthQuery.mockReturnValue({
        data: {
          data: {
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
          },
        },
        isLoading: false,
        error: null,
      });

      await act(async () => {
        renderWithProviders(
          <RouteGuard requiredRole="admin">
            <TestComponent />
          </RouteGuard>,
          { 
            isAuthenticated: true, 
            isCheckingAuth: false,
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              emailVerified: true,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            } as any
          }
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', { replace: true });
    });

    it('handles user without isVerified property', async () => {
      const mockRefreshToken = vi.mocked(tokenUtils.refreshToken);
      mockRefreshToken.mockResolvedValue('new-token');

      mockUseCheckAuthQuery.mockReturnValue({
        data: {
          data: {
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
          },
        },
        isLoading: false,
        error: null,
      });

      await act(async () => {
        renderWithProviders(
          <RouteGuard requireVerified={true}>
            <TestComponent />
          </RouteGuard>,
          { 
            isAuthenticated: true, 
            isCheckingAuth: false,
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            } as any
          }
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith('/verify-email', { replace: true });
    });
  });
}); 