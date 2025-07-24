import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RouteGuard } from '../RouteGuard.js';
import { MemoryRouter, useLocation } from 'react-router-dom';

// Mock useAppSelector
vi.mock('../../../store/index.js', () => ({
  useAppSelector: vi.fn(),
}));

import { useAppSelector as _useAppSelector } from '@/store';
const mockUseAppSelector = _useAppSelector as any;

function TestComponent() {
  const location = useLocation();
  return <div data-testid="test-component">Location: {location.pathname}</div>;
}

describe('RouteGuard', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when not initialized', () => {
    mockUseAppSelector.mockReturnValue({ isAuthenticated: false, isInitialized: false });
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <RouteGuard requireAuth>
          <TestComponent />
        </RouteGuard>
      </MemoryRouter>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('redirects to login if not authenticated and requireAuth is true', () => {
    mockUseAppSelector.mockReturnValue({ isAuthenticated: false, isInitialized: true });
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <RouteGuard requireAuth>
          <TestComponent />
        </RouteGuard>
      </MemoryRouter>
    );
    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
  });

  it('redirects to dashboard if authenticated and accessing /auth', () => {
    mockUseAppSelector.mockReturnValue({ isAuthenticated: true, isInitialized: true });
    render(
      <MemoryRouter initialEntries={["/auth/login"]}>
        <RouteGuard requireAuth>
          <TestComponent />
        </RouteGuard>
      </MemoryRouter>
    );
    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
  });

  it('renders children if authenticated and not accessing /auth', () => {
    mockUseAppSelector.mockReturnValue({ isAuthenticated: true, isInitialized: true });
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <RouteGuard requireAuth>
          <TestComponent />
        </RouteGuard>
      </MemoryRouter>
    );
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
  });
}); 