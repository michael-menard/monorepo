import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import ProtectedRoute from '../ProtectedRoute';
import authReducer from '../../store/authSlice';

// Create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        isAuthenticated: false,
        error: null,
        isLoading: false,
        isCheckingAuth: false,
        message: null,
        ...initialState,
      },
    },
  });
};

// Wrapper component for testing with Redux and Router
const TestWrapper = ({ children, initialState = {} }: { children: React.ReactNode; initialState?: any }) => {
  return (
    <Provider store={createTestStore(initialState)}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  );
};

describe('ProtectedRoute', () => {
  it('renders children when user is authenticated and verified', () => {
    const initialState = {
      user: { id: '1', email: 'test@example.com', isVerified: true },
      isAuthenticated: true,
      isCheckingAuth: false,
    };

    render(
      <TestWrapper initialState={initialState}>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('shows loading spinner when checking auth', () => {
    const initialState = {
      user: null,
      isAuthenticated: false,
      isCheckingAuth: true,
    };

    render(
      <TestWrapper initialState={initialState}>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByTestId('motion-div')).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    const initialState = {
      user: null,
      isAuthenticated: false,
      isCheckingAuth: false,
    };

    render(
      <TestWrapper initialState={initialState}>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    // Should redirect to login (Navigate component)
    expect(screen.getByTestId('navigate')).toBeInTheDocument();
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
  });

  it('redirects to email verification when user is authenticated but not verified', () => {
    const initialState = {
      user: { id: '1', email: 'test@example.com', isVerified: false },
      isAuthenticated: true,
      isCheckingAuth: false,
    };

    render(
      <TestWrapper initialState={initialState}>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    // Should redirect to email verification
    expect(screen.getByTestId('navigate')).toBeInTheDocument();
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/verify-email');
  });

  it('redirects to custom path when provided', () => {
    const initialState = {
      user: null,
      isAuthenticated: false,
      isCheckingAuth: false,
    };

    render(
      <TestWrapper initialState={initialState}>
        <ProtectedRoute redirectTo="/custom-login">
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/custom-login');
  });

  it('renders children when user is authenticated and verified with custom redirect', () => {
    const initialState = {
      user: { id: '1', email: 'test@example.com', isVerified: true },
      isAuthenticated: true,
      isCheckingAuth: false,
    };

    render(
      <TestWrapper initialState={initialState}>
        <ProtectedRoute redirectTo="/custom-login">
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
}); 