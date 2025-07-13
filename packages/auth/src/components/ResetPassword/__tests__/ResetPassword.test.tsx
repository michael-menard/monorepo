import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ResetPassword from '../index';
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
  Lock: ({ ...props }: any) => <div data-testid="lock-icon" {...props} />,
  Loader: ({ ...props }: any) => <div data-testid="loader-icon" {...props} />,
}));

// Mock PasswordStrength component
vi.mock('../PasswordStrength', () => ({
  default: ({ password }: any) => <div data-testid="password-strength">Password Strength: {password}</div>,
}));

// Mock useAuth hook
const mockResetPassword = vi.fn();
const mockUseAuth = {
  resetPassword: mockResetPassword,
  isLoading: false,
  error: null,
  message: null,
};

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
// Mock useParams
const mockUseParams = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
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

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.isLoading = false;
    mockUseAuth.error = null;
    mockUseAuth.message = null;
    mockUseParams.mockReturnValue({ token: 'test-token' });
  });

  it('renders the reset password form', () => {
    renderWithProviders(<ResetPassword />);

    expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('New Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument();
    expect(screen.getByText('Remember your password?')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('displays lock icons in password inputs', () => {
    renderWithProviders(<ResetPassword />);

    const lockIcons = screen.getAllByTestId('lock-icon');
    expect(lockIcons).toHaveLength(2);
  });

  it('displays password strength component', () => {
    renderWithProviders(<ResetPassword />);

    expect(screen.getByTestId('password-strength')).toBeInTheDocument();
  });

  it('updates password and confirm password state when inputs change', () => {
    renderWithProviders(<ResetPassword />);

    const passwordInput = screen.getByPlaceholderText('New Password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password');

    fireEvent.change(passwordInput, { target: { value: 'newPassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword123' } });

    expect(passwordInput).toHaveValue('newPassword123');
    expect(confirmPasswordInput).toHaveValue('newPassword123');
  });

  it('calls resetPassword when form is submitted with matching passwords', async () => {
    mockResetPassword.mockResolvedValue(undefined);
    renderWithProviders(<ResetPassword />);

    const passwordInput = screen.getByPlaceholderText('New Password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Reset Password' });

    fireEvent.change(passwordInput, { target: { value: 'newPassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('test-token', 'newPassword123');
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('prevents form submission when passwords do not match', async () => {
    renderWithProviders(<ResetPassword />);

    const passwordInput = screen.getByPlaceholderText('New Password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Reset Password' });

    fireEvent.change(passwordInput, { target: { value: 'newPassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentPassword123' } });
    fireEvent.click(submitButton);

    expect(mockResetPassword).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('prevents form submission when fields are empty', async () => {
    renderWithProviders(<ResetPassword />);

    const submitButton = screen.getByRole('button', { name: 'Reset Password' });
    fireEvent.click(submitButton);

    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('prevents form submission when only password is provided', async () => {
    renderWithProviders(<ResetPassword />);

    const passwordInput = screen.getByPlaceholderText('New Password');
    const submitButton = screen.getByRole('button', { name: 'Reset Password' });

    fireEvent.change(passwordInput, { target: { value: 'newPassword123' } });
    fireEvent.click(submitButton);

    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('prevents form submission when only confirm password is provided', async () => {
    renderWithProviders(<ResetPassword />);

    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Reset Password' });

    fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword123' } });
    fireEvent.click(submitButton);

    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('shows loading state when resetting password', () => {
    mockUseAuth.isLoading = true;
    renderWithProviders(<ResetPassword />);

    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '' })).toBeDisabled();
  });

  it('displays error message when reset fails', () => {
    mockUseAuth.error = 'Invalid or expired reset token' as any;
    renderWithProviders(<ResetPassword />);

    expect(screen.getByText('Invalid or expired reset token')).toBeInTheDocument();
  });

  it('displays success message when reset succeeds', () => {
    mockUseAuth.message = 'Password reset successful' as any;
    renderWithProviders(<ResetPassword />);

    expect(screen.getByText('Password reset successful')).toBeInTheDocument();
  });

  it('navigates to login when back to login button is clicked', () => {
    renderWithProviders(<ResetPassword />);

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('disables submit button when passwords do not match', () => {
    renderWithProviders(<ResetPassword />);

    const passwordInput = screen.getByPlaceholderText('New Password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Reset Password' });

    fireEvent.change(passwordInput, { target: { value: 'newPassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentPassword123' } });

    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when passwords match', () => {
    renderWithProviders(<ResetPassword />);

    const passwordInput = screen.getByPlaceholderText('New Password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Reset Password' });

    fireEvent.change(passwordInput, { target: { value: 'newPassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword123' } });

    expect(submitButton).not.toBeDisabled();
  });

  it('handles missing token gracefully', async () => {
    mockUseParams.mockReturnValue({ token: undefined });
    renderWithProviders(<ResetPassword />);

    const passwordInput = screen.getByPlaceholderText('New Password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Reset Password' });

    fireEvent.change(passwordInput, { target: { value: 'newPassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword123' } });
    fireEvent.click(submitButton);

    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    renderWithProviders(<ResetPassword />);

    const passwordInput = screen.getByPlaceholderText('New Password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Reset Password' });

    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('applies proper styling classes', () => {
    renderWithProviders(<ResetPassword />);

    const container = screen.getByRole('heading', { name: 'Reset Password' }).closest('div[class*="max-w-md"]');
    expect(container).toHaveClass('max-w-md', 'w-full', 'bg-gray-800', 'bg-opacity-50');
  });

  it('shows both error and success messages when both are present', () => {
    mockUseAuth.error = 'Some error' as any;
    mockUseAuth.message = 'Some success message' as any;
    renderWithProviders(<ResetPassword />);

    expect(screen.getByText('Some error')).toBeInTheDocument();
    expect(screen.getByText('Some success message')).toBeInTheDocument();
  });
}); 