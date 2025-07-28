import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConfirmResetPasswordForm from '../index';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams({ token: 'test-token' })],
  };
});

const mockConfirmReset = vi.fn();
const mockUseAuth = vi.fn(() => ({
  confirmReset: mockConfirmReset,
  isLoading: false,
  error: null,
  message: null,
}));

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ConfirmResetPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      confirmReset: mockConfirmReset,
      isLoading: false,
      error: null,
      message: null,
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <ConfirmResetPasswordForm />
      </MemoryRouter>
    );

  it('renders the form correctly', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: 'Set New Password' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('New Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set New Password' })).toBeInTheDocument();
  });

  it('validates password requirements', async () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText('New Password');
    const form = screen.getByRole('form');

    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('validates password confirmation match', async () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText('New Password');
    const confirmInput = screen.getByPlaceholderText('Confirm Password');
    const form = screen.getByRole('form');

    fireEvent.change(passwordInput, { target: { value: 'StrongP@ss1' } });
    fireEvent.change(confirmInput, { target: { value: 'DifferentP@ss1' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('submits the form with valid data', async () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText('New Password');
    const confirmInput = screen.getByPlaceholderText('Confirm Password');
    const form = screen.getByRole('form');

    fireEvent.change(passwordInput, { target: { value: 'StrongP@ss1' } });
    fireEvent.change(confirmInput, { target: { value: 'StrongP@ss1' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockConfirmReset).toHaveBeenCalledWith({
        token: 'test-token',
        newPassword: 'StrongP@ss1',
      });
    });
  });

  it('navigates back to login when clicking back button', () => {
    renderComponent();
    const backButton = screen.getByRole('button', { name: 'Back to Login' });
    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('shows loading state during submission', () => {
    mockUseAuth.mockReturnValue({
      confirmReset: mockConfirmReset,
      isLoading: true,
      error: null,
      message: null,
    });

    renderComponent();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays error message from server', () => {
    const errorMessage = 'Invalid reset token';
    mockUseAuth.mockReturnValue({
      confirmReset: mockConfirmReset,
      isLoading: false,
      error: errorMessage,
      message: null,
    });

    renderComponent();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('displays success message', () => {
    const successMessage = 'Password reset successful';
    mockUseAuth.mockReturnValue({
      confirmReset: mockConfirmReset,
      isLoading: false,
      error: null,
      message: successMessage,
    });

    renderComponent();
    expect(screen.getByText(successMessage)).toBeInTheDocument();
  });
}); 