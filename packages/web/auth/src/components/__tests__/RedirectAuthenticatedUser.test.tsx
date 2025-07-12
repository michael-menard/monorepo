import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import RedirectAuthenticatedUser from '../RedirectAuthenticatedUser';
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

describe('RedirectAuthenticatedUser', () => {
  it('renders children when user is not authenticated', () => {
    const initialState = {
      user: null,
      isAuthenticated: false,
    };

    render(
      <TestWrapper initialState={initialState}>
        <RedirectAuthenticatedUser>
          <div data-testid="auth-content">Auth Content</div>
        </RedirectAuthenticatedUser>
      </TestWrapper>
    );

    expect(screen.getByTestId('auth-content')).toBeInTheDocument();
  });

  it('renders children when user is authenticated but not verified', () => {
    const initialState = {
      user: { id: '1', email: 'test@example.com', isVerified: false },
      isAuthenticated: true,
    };

    render(
      <TestWrapper initialState={initialState}>
        <RedirectAuthenticatedUser>
          <div data-testid="auth-content">Auth Content</div>
        </RedirectAuthenticatedUser>
      </TestWrapper>
    );

    expect(screen.getByTestId('auth-content')).toBeInTheDocument();
  });

  it('redirects when user is authenticated and verified', () => {
    const initialState = {
      user: { id: '1', email: 'test@example.com', isVerified: true },
      isAuthenticated: true,
    };

    render(
      <TestWrapper initialState={initialState}>
        <RedirectAuthenticatedUser>
          <div data-testid="auth-content">Auth Content</div>
        </RedirectAuthenticatedUser>
      </TestWrapper>
    );

    // Should redirect to dashboard
    expect(screen.getByTestId('navigate')).toBeInTheDocument();
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
  });

  it('redirects to custom path when provided', () => {
    const initialState = {
      user: { id: '1', email: 'test@example.com', isVerified: true },
      isAuthenticated: true,
    };

    render(
      <TestWrapper initialState={initialState}>
        <RedirectAuthenticatedUser redirectTo="/dashboard">
          <div data-testid="auth-content">Auth Content</div>
        </RedirectAuthenticatedUser>
      </TestWrapper>
    );

    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/dashboard');
  });
}); 