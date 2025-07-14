import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MobileDrawer } from '../MobileDrawer';

// Mock the auth hooks
vi.mock('@/store/hooks', () => ({
  useAuthState: () => ({ isAuthenticated: false, user: null }),
}));

// Mock the auth package
vi.mock('@repo/auth', () => ({
  useAuth: () => ({
    logout: vi.fn(),
  }),
}));

// Create a mock store
const createMockStore = (authState = { isAuthenticated: false }) => {
  return configureStore({
    reducer: {
      auth: (state = authState) => state,
    },
  });
};

describe('MobileDrawer', () => {
  it('renders when open and shows nav links', () => {
    const store = createMockStore({ isAuthenticated: false });
    render(
      <Provider store={store}>
        <MobileDrawer isOpen={true} onClose={() => {}} />
      </Provider>
    );
    // Use a function matcher for Home link
    const homeLink = screen.getAllByRole('link').find(link => link.getAttribute('href') === '/');
    expect(homeLink).toBeDefined();
    expect(screen.getByText(/projects/i)).toBeInTheDocument();
    expect(screen.getByText(/instructions/i)).toBeInTheDocument();
    expect(screen.getByText(/inspiration/i)).toBeInTheDocument();
    expect(screen.getByText(/wishlist/i)).toBeInTheDocument();
    expect(screen.getByText(/social/i)).toBeInTheDocument();
  });
}); 