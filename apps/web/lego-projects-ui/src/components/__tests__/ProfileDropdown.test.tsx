import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ProfileDropdown } from '../ProfileDropdown';

// Mock the auth hooks
vi.mock('@/store/hooks', () => ({
  useAuthState: () => ({ isAuthenticated: true, user: { name: 'Test User' } }),
}));

// Mock the auth package
vi.mock('@repo/auth', () => ({
  useAuth: () => ({
    logout: vi.fn(),
  }),
}));

// Create a mock store
const createMockStore = (authState = { isAuthenticated: true, user: { name: 'Test User' } }) => {
  return configureStore({
    reducer: {
      auth: (state = authState) => state,
    },
  });
};

describe('ProfileDropdown', () => {
  it('renders profile and settings links', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <ProfileDropdown />
      </Provider>
    );
    expect(screen.getByText(/profile/i)).toBeInTheDocument();
    expect(screen.getByText(/settings/i)).toBeInTheDocument();
  });
}); 