import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import authReducer from '../store/authSlice.js';
import { authApi } from '../store/authApi.js';
import { useAuth } from '../hooks/useAuth.js';
import Login from '../components/Login/index.js';
import { SignupForm } from '../components/SignupForm/index.js';

// Mock the auth hook
vi.mock('../hooks/useAuth.js', () => ({
  useAuth: vi.fn(),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Mail: () => <span data-testid="mail-icon">Mail</span>,
  Lock: () => <span data-testid="lock-icon">Lock</span>,
  User: () => <span data-testid="user-icon">User</span>,
}));

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      [authApi.reducerPath]: authApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(authApi.middleware),
  });
};

const renderWithProviders = (component: React.ReactElement) => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('Auth Package', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Component', () => {
    it('renders login form correctly', () => {
      const mockUseAuth = useAuth as any;
      mockUseAuth.mockReturnValue({
        login: vi.fn(),
        isLoading: false,
        error: null,
      });

      renderWithProviders(<Login />);

      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
    });

    it('handles form submission', async () => {
      const mockLogin = vi.fn();
      const mockUseAuth = useAuth as any;
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<Login />);

      const emailInput = screen.getByPlaceholderText('Email Address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('shows loading state', () => {
      const mockUseAuth = useAuth as any;
      mockUseAuth.mockReturnValue({
        login: vi.fn(),
        isLoading: true,
        error: null,
      });

      renderWithProviders(<Login />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('displays error message', () => {
      const mockUseAuth = useAuth as any;
      mockUseAuth.mockReturnValue({
        login: vi.fn(),
        isLoading: false,
        error: 'Invalid credentials',
      });

      renderWithProviders(<Login />);

      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  describe('Signup Component', () => {
    it('renders signup form correctly', () => {
      const mockUseAuth = useAuth as any;
      mockUseAuth.mockReturnValue({
        signup: vi.fn(),
        isLoading: false,
        error: null,
      });

      renderWithProviders(<SignupForm />);

      expect(screen.getByText('Create Account')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your first name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your last name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument();
    });
  });

  describe('Auth Store', () => {
    it('has correct initial state', () => {
      const store = createTestStore();
      const state = store.getState();

      expect(state.auth).toEqual({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        isCheckingAuth: true,
        error: null,
        message: null,
      });
    });
  });

  describe('Auth API', () => {
    it('has all required endpoints', () => {
      const endpoints = Object.keys(authApi.endpoints);
      
      expect(endpoints).toContain('login');
      expect(endpoints).toContain('signup');
      expect(endpoints).toContain('logout');
      expect(endpoints).toContain('refresh');
      expect(endpoints).toContain('resetPassword');
      expect(endpoints).toContain('confirmReset');
      expect(endpoints).toContain('checkAuth');
      expect(endpoints).toContain('verifyEmail');
      expect(endpoints).toContain('socialLogin');
    });
  });
}); 