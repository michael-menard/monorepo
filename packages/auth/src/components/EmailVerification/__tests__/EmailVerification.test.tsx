import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import EmailVerification from '../index';
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
  Mail: ({ ...props }: any) => <div data-testid="mail-icon" {...props} />,
  Loader: ({ ...props }: any) => <div data-testid="loader-icon" {...props} />,
}));

// Mock useAuth hook
const mockVerifyEmail = vi.fn();
const mockUseAuth = {
  verifyEmail: mockVerifyEmail,
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

describe('EmailVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.isLoading = false;
    mockUseAuth.error = null;
  });

  it('renders the email verification form', () => {
    renderWithProviders(<EmailVerification />);

    expect(screen.getByRole('heading', { name: 'Verify Email' })).toBeInTheDocument();
    expect(screen.getByText('Please check your email for a verification code and enter it below.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Verification Code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify Email' })).toBeInTheDocument();
    expect(screen.getByText('Didn\'t receive the code?')).toBeInTheDocument();
    expect(screen.getByText('Back to Login')).toBeInTheDocument();
  });

  it('displays mail icon in input', () => {
    renderWithProviders(<EmailVerification />);

    expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
  });

  it('updates code state when input changes', () => {
    renderWithProviders(<EmailVerification />);

    const input = screen.getByPlaceholderText('Verification Code');
    fireEvent.change(input, { target: { value: '123456' } });

    expect(input).toHaveValue('123456');
  });

  it('calls verifyEmail and navigates to dashboard when form is submitted', async () => {
    mockVerifyEmail.mockResolvedValue(undefined);
    renderWithProviders(<EmailVerification />);

    const input = screen.getByPlaceholderText('Verification Code');
    const submitButton = screen.getByRole('button', { name: 'Verify Email' });

    fireEvent.change(input, { target: { value: '123456' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockVerifyEmail).toHaveBeenCalledWith('123456');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('prevents form submission when code is empty', async () => {
    renderWithProviders(<EmailVerification />);

    const submitButton = screen.getByRole('button', { name: 'Verify Email' });
    fireEvent.click(submitButton);

    expect(mockVerifyEmail).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows loading state when verifying email', () => {
    mockUseAuth.isLoading = true;
    renderWithProviders(<EmailVerification />);

    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '' })).toBeDisabled();
  });

  it('displays error message when verification fails', () => {
    mockUseAuth.error = 'Invalid verification code' as any;
    renderWithProviders(<EmailVerification />);

    expect(screen.getByText('Invalid verification code')).toBeInTheDocument();
  });

  it('navigates to login when cancel button is clicked', () => {
    renderWithProviders(<EmailVerification />);

    const cancelButton = screen.getByText('Back to Login');
    fireEvent.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('handles verification error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockVerifyEmail.mockRejectedValue(new Error('Network error'));
    
    renderWithProviders(<EmailVerification />);

    const input = screen.getByPlaceholderText('Verification Code');
    const submitButton = screen.getByRole('button', { name: 'Verify Email' });

    fireEvent.change(input, { target: { value: '123456' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(new Error('Network error'));
    });

    consoleSpy.mockRestore();
  });

  it('has proper accessibility attributes', () => {
    renderWithProviders(<EmailVerification />);

    const input = screen.getByPlaceholderText('Verification Code');
    const submitButton = screen.getByRole('button', { name: 'Verify Email' });

    expect(input).toHaveAttribute('type', 'text');
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('applies proper styling classes', () => {
    renderWithProviders(<EmailVerification />);

    const container = screen.getByRole('heading', { name: 'Verify Email' }).closest('div[class*="max-w-md"]');
    expect(container).toHaveClass('max-w-md', 'w-full', 'bg-gray-800', 'bg-opacity-50');
  });
}); 