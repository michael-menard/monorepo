import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ForgotPassword from '../index.js';
import authReducer from '../../../store/authSlice.js';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Mail: ({ ...props }: any) => <div data-testid="mail-icon" {...props} />,
  Loader: ({ ...props }: any) => <div data-testid="loader-icon" {...props} />,
}));

// Mock useAuth hook
const mockForgotPassword = vi.fn();
const mockUseAuth = {
  forgotPassword: mockForgotPassword,
  isLoading: false,
  error: null,
  message: null,
};

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Create test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isCheckingAuth: false,
        message: null,
        ...initialState,
      },
    },
  });
};

const renderWithProviders = (component: React.ReactElement, initialState = {}) => {
  const store = createTestStore(initialState);
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.isLoading = false;
    mockUseAuth.error = null;
    mockUseAuth.message = null;
  });

  it('renders the forgot password form', () => {
    renderWithProviders(<ForgotPassword />);

    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Reset Email' })).toBeInTheDocument();
    expect(screen.getByText('Remember your password?')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('displays mail icon in input', () => {
    renderWithProviders(<ForgotPassword />);

    expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
  });

  it('updates email state when input changes', () => {
    renderWithProviders(<ForgotPassword />);

    const input = screen.getByPlaceholderText('Email Address');
    fireEvent.change(input, { target: { value: 'test@example.com' } });

    expect(input).toHaveValue('test@example.com');
  });

  it('calls forgotPassword when form is submitted', async () => {
    mockForgotPassword.mockResolvedValue(undefined);
    renderWithProviders(<ForgotPassword />);

    const input = screen.getByPlaceholderText('Email Address');
    const submitButton = screen.getByRole('button', { name: 'Send Reset Email' });

    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('prevents form submission when email is empty', async () => {
    renderWithProviders(<ForgotPassword />);

    const submitButton = screen.getByRole('button', { name: 'Send Reset Email' });
    fireEvent.click(submitButton);

    expect(mockForgotPassword).not.toHaveBeenCalled();
  });

  it('shows loading state when sending reset email', () => {
    mockUseAuth.isLoading = true;
    renderWithProviders(<ForgotPassword />);

    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '' })).toBeDisabled();
  });

  it('displays error message when request fails', () => {
    mockUseAuth.error = 'User not found' as any;
    renderWithProviders(<ForgotPassword />);

    expect(screen.getByText('User not found')).toBeInTheDocument();
  });

  it('displays success message when request succeeds', () => {
    mockUseAuth.message = 'Password reset link sent to your email' as any;
    renderWithProviders(<ForgotPassword />);

    expect(screen.getByText('Password reset link sent to your email')).toBeInTheDocument();
  });

  it('navigates to login when back to login button is clicked', () => {
    renderWithProviders(<ForgotPassword />);

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('has proper accessibility attributes', () => {
    renderWithProviders(<ForgotPassword />);

    const input = screen.getByPlaceholderText('Email Address');
    const submitButton = screen.getByRole('button', { name: 'Send Reset Email' });

    expect(input).toHaveAttribute('type', 'email');
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('applies proper styling classes', () => {
    renderWithProviders(<ForgotPassword />);

    const container = screen.getByText('Reset Password').closest('div[class*="max-w-md"]');
    expect(container).toHaveClass('max-w-md', 'w-full', 'bg-gray-800', 'bg-opacity-50');
  });

  it('handles form submission with valid email', async () => {
    mockForgotPassword.mockResolvedValue(undefined);
    renderWithProviders(<ForgotPassword />);

    const input = screen.getByPlaceholderText('Email Address');
    const submitButton = screen.getByRole('button', { name: 'Send Reset Email' });

    fireEvent.change(input, { target: { value: 'user@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com');
    });
  });

  it('shows both error and success messages when both are present', () => {
    mockUseAuth.error = 'Some error' as any;
    mockUseAuth.message = 'Some success message' as any;
    renderWithProviders(<ForgotPassword />);

    expect(screen.getByText('Some error')).toBeInTheDocument();
    expect(screen.getByText('Some success message')).toBeInTheDocument();
  });
}); 