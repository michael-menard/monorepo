import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Login from '../index.js';
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
  Lock: ({ ...props }: any) => <div data-testid="lock-icon" {...props} />,
  Loader: ({ ...props }: any) => <div data-testid="loader-icon" {...props} />,
}));

// Mock useAuth hook
const mockLogin = vi.fn();
const mockUseAuth = {
  login: mockLogin,
  isLoading: false,
  error: null,
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

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.isLoading = false;
    mockUseAuth.error = null;
  });

  it('renders the login form', () => {
    renderWithProviders(<Login />);

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    expect(screen.getByText('Don\'t have an account?')).toBeInTheDocument();
    expect(screen.getByText('Sign up')).toBeInTheDocument();
  });

  it('displays mail and lock icons in inputs', () => {
    renderWithProviders(<Login />);

    expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
  });

  it('updates email and password state when inputs change', () => {
    renderWithProviders(<Login />);

    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Password');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('calls login when form is submitted', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderWithProviders(<Login />);

    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('prevents form submission when fields are empty', async () => {
    renderWithProviders(<Login />);

    const submitButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(submitButton);

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows loading state when logging in', () => {
    mockUseAuth.isLoading = true;
    renderWithProviders(<Login />);

    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '' })).toBeDisabled();
  });

  it('displays error message when login fails', () => {
    mockUseAuth.error = 'Invalid credentials' as any;
    renderWithProviders(<Login />);

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('navigates to forgot password when forgot password link is clicked', () => {
    renderWithProviders(<Login />);

    const forgotPasswordButton = screen.getByText('Forgot password?');
    fireEvent.click(forgotPasswordButton);

    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('navigates to signup when sign up link is clicked', () => {
    renderWithProviders(<Login />);

    const signUpButton = screen.getByText('Sign up');
    fireEvent.click(signUpButton);

    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  it('has proper accessibility attributes', () => {
    renderWithProviders(<Login />);

    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('applies proper styling classes', () => {
    renderWithProviders(<Login />);

    const container = screen.getByText('Welcome Back').closest('div[class*="max-w-md"]');
    expect(container).toHaveClass('max-w-md', 'w-full', 'bg-gray-800', 'bg-opacity-50');
  });

  it('handles form submission with valid credentials', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderWithProviders(<Login />);

    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'securePassword123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'securePassword123');
    });
  });

  it('prevents form submission when only email is provided', async () => {
    renderWithProviders(<Login />);

    const emailInput = screen.getByPlaceholderText('Email Address');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('prevents form submission when only password is provided', async () => {
    renderWithProviders(<Login />);

    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    expect(mockLogin).not.toHaveBeenCalled();
  });
}); 