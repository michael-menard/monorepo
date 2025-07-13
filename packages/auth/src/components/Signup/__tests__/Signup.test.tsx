import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Signup from '../index';
import authReducer from '../../../store/authSlice';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader: ({ ...props }: any) => <div data-testid="loader-icon" {...props} />,
  Lock: ({ ...props }: any) => <div data-testid="lock-icon" {...props} />,
  Mail: ({ ...props }: any) => <div data-testid="mail-icon" {...props} />,
  User: ({ ...props }: any) => <div data-testid="user-icon" {...props} />,
}));

// Mock PasswordStrength component
vi.mock('../PasswordStrength', () => ({
  default: ({ password }: any) => <div data-testid="password-strength">Password Strength: {password}</div>,
}));

// Mock useAuth hook
const mockSignup = vi.fn();
const mockUseAuth = {
  signup: mockSignup,
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

describe('Signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.isLoading = false;
    mockUseAuth.error = null;
  });

  it('renders the signup form', () => {
    renderWithProviders(<Signup />);

    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Full Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument();
    expect(screen.getByText('Already have an account?')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('displays icons in form inputs', () => {
    renderWithProviders(<Signup />);

    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
  });

  it('displays password strength component', () => {
    renderWithProviders(<Signup />);

    expect(screen.getByTestId('password-strength')).toBeInTheDocument();
  });

  it('updates form state when inputs change', () => {
    renderWithProviders(<Signup />);

    const nameInput = screen.getByPlaceholderText('Full Name');
    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Password');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(nameInput).toHaveValue('John Doe');
    expect(emailInput).toHaveValue('john@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('calls signup when form is submitted with valid data', async () => {
    mockSignup.mockResolvedValue(undefined);
    renderWithProviders(<Signup />);

    const nameInput = screen.getByPlaceholderText('Full Name');
    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('john@example.com', 'password123', 'John Doe');
      expect(mockNavigate).toHaveBeenCalledWith('/verify-email');
    });
  });

  it('prevents form submission when fields are empty', async () => {
    renderWithProviders(<Signup />);

    const submitButton = screen.getByRole('button', { name: 'Sign Up' });
    fireEvent.click(submitButton);

    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('prevents form submission when only name is provided', async () => {
    renderWithProviders(<Signup />);

    const nameInput = screen.getByPlaceholderText('Full Name');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.click(submitButton);

    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('prevents form submission when only email is provided', async () => {
    renderWithProviders(<Signup />);

    const emailInput = screen.getByPlaceholderText('Email Address');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });

    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.click(submitButton);

    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('prevents form submission when only password is provided', async () => {
    renderWithProviders(<Signup />);

    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });

    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('shows loading state when signing up', () => {
    mockUseAuth.isLoading = true;
    renderWithProviders(<Signup />);

    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '' })).toBeDisabled();
  });

  it('displays error message when signup fails', () => {
    mockUseAuth.error = 'Email already exists' as any;
    renderWithProviders(<Signup />);

    expect(screen.getByText('Email already exists')).toBeInTheDocument();
  });

  it('navigates to login when back to login button is clicked', () => {
    renderWithProviders(<Signup />);

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('handles signup errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockSignup.mockRejectedValue(new Error('Signup failed'));
    
    renderWithProviders(<Signup />);

    const nameInput = screen.getByPlaceholderText('Full Name');
    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('has proper accessibility attributes', () => {
    renderWithProviders(<Signup />);

    const nameInput = screen.getByPlaceholderText('Full Name');
    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });

    expect(nameInput).toHaveAttribute('type', 'text');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('applies proper styling classes', () => {
    renderWithProviders(<Signup />);

    const container = screen.getByText('Create Account').closest('div[class*="max-w-md"]');
    expect(container).toHaveClass('max-w-md', 'w-full', 'bg-gray-800', 'bg-opacity-50');
  });

  it('disables submit button when loading', () => {
    mockUseAuth.isLoading = true;
    renderWithProviders(<Signup />);

    const submitButton = screen.getByRole('button', { name: '' });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when not loading', () => {
    renderWithProviders(<Signup />);

    const submitButton = screen.getByRole('button', { name: 'Sign Up' });
    expect(submitButton).not.toBeDisabled();
  });

  it('submits form with correct field order', async () => {
    mockSignup.mockResolvedValue(undefined);
    renderWithProviders(<Signup />);

    const nameInput = screen.getByPlaceholderText('Full Name');
    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('john@example.com', 'password123', 'John Doe');
    });
  });

  it('handles empty string inputs correctly', async () => {
    renderWithProviders(<Signup />);

    const nameInput = screen.getByPlaceholderText('Full Name');
    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });

    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.change(passwordInput, { target: { value: '' } });
    fireEvent.click(submitButton);

    expect(mockSignup).not.toHaveBeenCalled();
  });
}); 