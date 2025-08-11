import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import LoginForm from '../index.js';
import authReducer from '../../../store/authSlice.js';
import { authApi } from '../../../store/authApi.js';

// Mock the auth hook
const mockLogin = vi.fn();
const mockClearError = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../../hooks/useAuth.js', () => ({
  useAuth: () => ({
    login: mockLogin,
    isLoading: false,
    error: null,
    clearMessage: mockClearError,
    user: null,
    isAuthenticated: false,
    isCheckingAuth: false,
    message: null,
    signup: vi.fn(),
    logout: vi.fn(),
    verifyEmail: vi.fn(),
    checkAuth: vi.fn(),
    resetPassword: vi.fn(),
    confirmReset: vi.fn(),
    socialLogin: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Create a test store
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

const renderLoginForm = () => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <LoginForm />
      </BrowserRouter>
    </Provider>
  );
};

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the login form with all required elements', () => {
      renderLoginForm();

      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
      expect(screen.getByText('Forgot password?')).toBeInTheDocument();
      expect(screen.getByText('Sign up')).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      renderLoginForm();

      const emailInput = screen.getByPlaceholderText('Email Address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for invalid email', async () => {
      renderLoginForm();

      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('should show validation error for short password', async () => {
      renderLoginForm();

      const emailInput = screen.getByPlaceholderText('Email Address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call login function with valid data', async () => {
      renderLoginForm();

      const emailInput = screen.getByPlaceholderText('Email Address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      
      // Debug: Check if inputs have values
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
      
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('should not call login function with invalid data', async () => {
      renderLoginForm();

      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).not.toHaveBeenCalled();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to forgot password page when forgot password link is clicked', () => {
      renderLoginForm();

      const forgotPasswordLink = screen.getByText('Forgot password?');
      fireEvent.click(forgotPasswordLink);

      expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
    });

    it('should navigate to signup page when sign up link is clicked', () => {
      renderLoginForm();

      const signUpLink = screen.getByText('Sign up');
      fireEvent.click(signUpLink);

      expect(mockNavigate).toHaveBeenCalledWith('/signup');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      renderLoginForm();

      const emailInput = screen.getByPlaceholderText('Email Address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      emailInput.focus();
      expect(emailInput).toHaveFocus();

      passwordInput.focus();
      expect(passwordInput).toHaveFocus();

      submitButton.focus();
      expect(submitButton).toHaveFocus();
    });
  });
}); 