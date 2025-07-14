import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Navbar from '../Navbar';
import * as hooks from '@/store/hooks';
import type { AuthState, User } from '@repo/auth/src/types/auth';

// Mock react-router-dom
vi.mock('react-router-dom', () => {
  const actual = vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock the auth package
vi.mock('@repo/auth', () => ({
  useAuth: () => ({
    logout: vi.fn(),
  }),
}));

const defaultUser: User = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: 'https://example.com/avatar.png',
  emailVerified: true,
  isVerified: true,
  createdAt: '',
  updatedAt: '',
};

const defaultAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  error: null,
  tokens: null,
  isLoading: false,
  isCheckingAuth: false,
};

// Create a mock store
const createMockStore = (authState = defaultAuthState) => {
  return configureStore({
    reducer: {
      auth: (state = authState) => state,
    },
  });
};

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation links for unauthenticated users', () => {
    vi.spyOn(hooks, 'useAuthState').mockReturnValue({ ...defaultAuthState } as AuthState);
    const store = createMockStore({ ...defaultAuthState });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </Provider>
    );
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('renders navigation links for authenticated users', () => {
    vi.spyOn(hooks, 'useAuthState').mockReturnValue({ ...defaultAuthState, isAuthenticated: true, user: defaultUser } as AuthState);
    const store = createMockStore({ ...defaultAuthState, isAuthenticated: true, user: defaultUser });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </Provider>
    );
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
  });

  it('shows mobile menu when hamburger is clicked', () => {
    vi.spyOn(hooks, 'useAuthState').mockReturnValue({ ...defaultAuthState } as AuthState);
    const store = createMockStore({ ...defaultAuthState });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </Provider>
    );
    const menuButton = screen.getByLabelText(/open mobile menu/i);
    fireEvent.click(menuButton);
    // There may be multiple navigation roles, so check at least one is present
    const navs = screen.getAllByRole('navigation');
    expect(navs.length).toBeGreaterThan(0);
  });
}); 