import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import ResetPasswordPage from '../index';
import { useAuthStore } from '../../../store/auth.store';

// Mock dependencies
vi.mock('react-hot-toast');
vi.mock('../../../store/auth.store');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ token: 'test-reset-token' }),
    useNavigate: () => mockNavigate,
  };
});

const mockNavigate = vi.fn();
const mockResetPassword = vi.fn();
const mockUseAuthStore = {
  resetPassword: mockResetPassword,
  error: null,
  isLoading: false,
  message: null,
};

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as any).mockReturnValue(mockUseAuthStore);
    // Mock useNavigate is handled in the setup file
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <>{component}</>
      </BrowserRouter>
    );
  };

  describe('Rendering', () => {
    it('renders the reset password form', () => {
      renderWithRouter(<ResetPasswordPage />);
      
      expect(screen.getByText('Reset Password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('New Password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirm New Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Set New Password' })).toBeInTheDocument();
    });

    it('displays error message when error exists', () => {
      (useAuthStore as any).mockReturnValue({
        ...mockUseAuthStore,
        error: 'Invalid reset token',
      });

      renderWithRouter(<ResetPasswordPage />);
      
      expect(screen.getByText('Invalid reset token')).toBeInTheDocument();
    });

    it('displays success message when message exists', () => {
      (useAuthStore as any).mockReturnValue({
        ...mockUseAuthStore,
        message: 'Password reset successful',
      });

      renderWithRouter(<ResetPasswordPage />);
      
      expect(screen.getByText('Password reset successful')).toBeInTheDocument();
    });

    it('shows loading state when isLoading is true', () => {
      (useAuthStore as any).mockReturnValue({
        ...mockUseAuthStore,
        isLoading: true,
      });

      renderWithRouter(<ResetPasswordPage />);
      
      expect(screen.getByRole('button', { name: 'Resetting...' })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Form Interactions', () => {
    it('updates password field value', () => {
      renderWithRouter(<ResetPasswordPage />);
      
      const passwordInput = screen.getByPlaceholderText('New Password');
      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
      
      expect(passwordInput).toHaveValue('newpassword123');
    });

    it('updates confirm password field value', () => {
      renderWithRouter(<ResetPasswordPage />);
      
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
      fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
      
      expect(confirmPasswordInput).toHaveValue('newpassword123');
    });

    it('submits form with matching passwords', async () => {
      mockResetPassword.mockResolvedValue(undefined);
      
      renderWithRouter(<ResetPasswordPage />);
      
      const passwordInput = screen.getByPlaceholderText('New Password');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: 'Set New Password' });
      
      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('test-reset-token', 'newpassword123');
      });
    });
  });

  describe('Validation', () => {
    it('shows alert when passwords do not match', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      renderWithRouter(<ResetPasswordPage />);
      
      const passwordInput = screen.getByPlaceholderText('New Password');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: 'Set New Password' });
      
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
      fireEvent.click(submitButton);
      
      expect(alertSpy).toHaveBeenCalledWith('Passwords do not match');
      expect(mockResetPassword).not.toHaveBeenCalled();
      
      alertSpy.mockRestore();
    });

    it('prevents form submission when passwords do not match', async () => {
      renderWithRouter(<ResetPasswordPage />);
      
      const passwordInput = screen.getByPlaceholderText('New Password');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: 'Set New Password' });
      
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
      fireEvent.click(submitButton);
      
      expect(mockResetPassword).not.toHaveBeenCalled();
    });
  });

  describe('API Integration', () => {
    it('calls resetPassword with correct parameters on successful submission', async () => {
      mockResetPassword.mockResolvedValue(undefined);
      
      renderWithRouter(<ResetPasswordPage />);
      
      const passwordInput = screen.getByPlaceholderText('New Password');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: 'Set New Password' });
      
      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('test-reset-token', 'newpassword123');
      });
    });

    it('shows success toast and navigates on successful reset', async () => {
      mockResetPassword.mockResolvedValue(undefined);
      
      renderWithRouter(<ResetPasswordPage />);
      
      const passwordInput = screen.getByPlaceholderText('New Password');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: 'Set New Password' });
      
      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Password reset successfully, redirecting to login page...');
      });
      
      // Wait for navigation timeout
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      }, { timeout: 3000 });
    });

    it('handles API errors and shows error toast', async () => {
      const errorMessage = 'Reset token expired';
      mockResetPassword.mockRejectedValue(new Error(errorMessage));
      
      renderWithRouter(<ResetPasswordPage />);
      
      const passwordInput = screen.getByPlaceholderText('New Password');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: 'Set New Password' });
      
      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage);
      });
    });

    it('shows generic error message when error has no message property', async () => {
      mockResetPassword.mockRejectedValue(new Error());
      
      renderWithRouter(<ResetPasswordPage />);
      
      const passwordInput = screen.getByPlaceholderText('New Password');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: 'Set New Password' });
      
      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error resetting password');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      renderWithRouter(<ResetPasswordPage />);
      
      expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Set New Password' })).toBeInTheDocument();
    });

    it('has required attributes on password fields', () => {
      renderWithRouter(<ResetPasswordPage />);
      
      const passwordInput = screen.getByPlaceholderText('New Password');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
      
      expect(passwordInput).toHaveAttribute('required');
      expect(confirmPasswordInput).toHaveAttribute('required');
    });

    it('disables submit button when loading', () => {
      (useAuthStore as any).mockReturnValue({
        ...mockUseAuthStore,
        isLoading: true,
      });

      renderWithRouter(<ResetPasswordPage />);
      
      const submitButton = screen.getByRole('button', { name: 'Resetting...' });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty password fields', () => {
      renderWithRouter(<ResetPasswordPage />);
      
      const submitButton = screen.getByRole('button', { name: 'Set New Password' });
      fireEvent.click(submitButton);
      
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('handles special characters in password', async () => {
      mockResetPassword.mockResolvedValue(undefined);
      
      renderWithRouter(<ResetPasswordPage />);
      
      const passwordInput = screen.getByPlaceholderText('New Password');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: 'Set New Password' });
      
      const specialPassword = 'P@ssw0rd!@#$%^&*()';
      fireEvent.change(passwordInput, { target: { value: specialPassword } });
      fireEvent.change(confirmPasswordInput, { target: { value: specialPassword } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('test-reset-token', specialPassword);
      });
    });

    it('handles very long passwords', async () => {
      mockResetPassword.mockResolvedValue(undefined);
      
      renderWithRouter(<ResetPasswordPage />);
      
      const passwordInput = screen.getByPlaceholderText('New Password');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: 'Set New Password' });
      
      const longPassword = 'a'.repeat(100);
      fireEvent.change(passwordInput, { target: { value: longPassword } });
      fireEvent.change(confirmPasswordInput, { target: { value: longPassword } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('test-reset-token', longPassword);
      });
    });
  });
}); 