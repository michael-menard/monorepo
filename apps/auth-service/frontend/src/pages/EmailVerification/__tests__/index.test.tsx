import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import EmailVerificationPage from '../index';
import { useAuthStore } from '../../../store/auth.store';

// Mock dependencies
vi.mock('react-hot-toast');
vi.mock('../../../store/auth.store');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockNavigate = vi.fn();
const mockVerifyEmail = vi.fn();
const mockUseAuthStore = {
  verifyEmail: mockVerifyEmail,
  error: null,
  isLoading: false,
};

describe('EmailVerificationPage', () => {
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
    it('renders the email verification form', () => {
      renderWithRouter(<EmailVerificationPage />);
      
      expect(screen.getByText('Verify Your Email')).toBeInTheDocument();
      expect(screen.getByText('Enter the 6-digit code sent to your email address.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Verify Email' })).toBeInTheDocument();
    });

    it('renders 6 input fields for verification code', () => {
      renderWithRouter(<EmailVerificationPage />);
      
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(6);
      
      inputs.forEach((input, index) => {
        expect(input).toHaveAttribute('maxLength', '6');
        expect(input).toHaveValue('');
      });
    });

    it('displays error message when error exists', () => {
      (useAuthStore as any).mockReturnValue({
        ...mockUseAuthStore,
        error: 'Invalid verification code',
      });

      renderWithRouter(<EmailVerificationPage />);
      
      expect(screen.getByText('Invalid verification code')).toBeInTheDocument();
    });

    it('shows loading state when isLoading is true', () => {
      (useAuthStore as any).mockReturnValue({
        ...mockUseAuthStore,
        isLoading: true,
      });

      renderWithRouter(<EmailVerificationPage />);
      
      expect(screen.getByRole('button', { name: 'Verifying...' })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Code Input Interactions', () => {
    it('updates individual input field value', () => {
      renderWithRouter(<EmailVerificationPage />);
      
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: '1' } });
      
      expect(inputs[0]).toHaveValue('1');
    });

    it('moves focus to next input when digit is entered', () => {
      renderWithRouter(<EmailVerificationPage />);
      
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: '1' } });
      
      expect(document.activeElement).toBe(inputs[1]);
    });

    it('handles backspace to move to previous input', () => {
      renderWithRouter(<EmailVerificationPage />);
      
      const inputs = screen.getAllByRole('textbox');
      
      // Fill first input and move to second
      fireEvent.change(inputs[0], { target: { value: '1' } });
      expect(document.activeElement).toBe(inputs[1]);
      
      // Press backspace on empty second input
      fireEvent.keyDown(inputs[1], { key: 'Backspace' });
      expect(document.activeElement).toBe(inputs[0]);
    });

    it('handles pasted verification code', () => {
      renderWithRouter(<EmailVerificationPage />);
      
      const inputs = screen.getAllByRole('textbox');
      const pastedCode = '123456';
      
      fireEvent.change(inputs[0], { target: { value: pastedCode } });
      
      // Check that all inputs are filled with the pasted code
      inputs.forEach((input, index) => {
        expect(input).toHaveValue(pastedCode[index]);
      });
    });

    it('handles partial pasted code', () => {
      renderWithRouter(<EmailVerificationPage />);
      
      const inputs = screen.getAllByRole('textbox');
      const partialCode = '123';
      
      fireEvent.change(inputs[0], { target: { value: partialCode } });
      
      // Check that only first 3 inputs are filled
      expect(inputs[0]).toHaveValue('1');
      expect(inputs[1]).toHaveValue('2');
      expect(inputs[2]).toHaveValue('3');
      expect(inputs[3]).toHaveValue('');
      expect(inputs[4]).toHaveValue('');
      expect(inputs[5]).toHaveValue('');
    });
  });

  describe('Auto-Submission', () => {
    it('auto-submits when all 6 digits are entered', async () => {
      mockVerifyEmail.mockResolvedValue(undefined);
      
      renderWithRouter(<EmailVerificationPage />);
      
      const inputs = screen.getAllByRole('textbox');
      
      // Fill all inputs
      for (let i = 0; i < 6; i++) {
        fireEvent.change(inputs[i], { target: { value: (i + 1).toString() } });
      }
      
      await waitFor(() => {
        expect(mockVerifyEmail).toHaveBeenCalledWith('123456');
      });
    });

    it('does not auto-submit when not all digits are filled', () => {
      renderWithRouter(<EmailVerificationPage />);
      
      const inputs = screen.getAllByRole('textbox');
      
      // Fill only 5 inputs
      for (let i = 0; i < 5; i++) {
        fireEvent.change(inputs[i], { target: { value: (i + 1).toString() } });
      }
      
      expect(mockVerifyEmail).not.toHaveBeenCalled();
    });
  });

  describe('Manual Submission', () => {
    it('submits form with complete verification code', async () => {
      mockVerifyEmail.mockResolvedValue(undefined);
      
      renderWithRouter(<EmailVerificationPage />);
      
      const inputs = screen.getAllByRole('textbox');
      const submitButton = screen.getByRole('button', { name: 'Verify Email' });
      
      // Fill all inputs
      for (let i = 0; i < 6; i++) {
        fireEvent.change(inputs[i], { target: { value: (i + 1).toString() } });
      }
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockVerifyEmail).toHaveBeenCalledWith('123456');
      });
    });

    it('prevents submission when code is incomplete', () => {
      renderWithRouter(<EmailVerificationPage />);
      
      const inputs = screen.getAllByRole('textbox');
      const submitButton = screen.getByRole('button', { name: 'Verify Email' });
      
      // Fill only 5 inputs
      for (let i = 0; i < 5; i++) {
        fireEvent.change(inputs[i], { target: { value: (i + 1).toString() } });
      }
      
      expect(submitButton).toBeDisabled();
    });
  });

  describe('API Integration', () => {
    it('navigates to home and shows success toast on successful verification', async () => {
      mockVerifyEmail.mockResolvedValue(undefined);
      
      renderWithRouter(<EmailVerificationPage />);
      
      const inputs = screen.getAllByRole('textbox');
      
      // Fill all inputs to trigger auto-submission
      for (let i = 0; i < 6; i++) {
        fireEvent.change(inputs[i], { target: { value: (i + 1).toString() } });
      }
      
      await waitFor(() => {
        expect(mockVerifyEmail).toHaveBeenCalledWith('123456');
        expect(mockNavigate).toHaveBeenCalledWith('/');
        expect(toast.success).toHaveBeenCalledWith('Email verified successfully');
      });
    });

    it('handles API errors gracefully', async () => {
      const errorMessage = 'Invalid verification code';
      mockVerifyEmail.mockRejectedValue(new Error(errorMessage));
      
      renderWithRouter(<EmailVerificationPage />);
      
      const inputs = screen.getAllByRole('textbox');
      
      // Fill all inputs to trigger auto-submission
      for (let i = 0; i < 6; i++) {
        fireEvent.change(inputs[i], { target: { value: (i + 1).toString() } });
      }
      
      await waitFor(() => {
        expect(mockVerifyEmail).toHaveBeenCalledWith('123456');
      });
      
      // Should not navigate or show success toast on error
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper form structure and labels', () => {
      renderWithRouter(<EmailVerificationPage />);
      
      expect(screen.getByRole('heading', { name: 'Verify Your Email' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Verify Email' })).toBeInTheDocument();
    });

    it('disables submit button when loading', () => {
      (useAuthStore as any).mockReturnValue({
        ...mockUseAuthStore,
        isLoading: true,
      });

      renderWithRouter(<EmailVerificationPage />);
      
      const submitButton = screen.getByRole('button', { name: 'Verifying...' });
      expect(submitButton).toBeDisabled();
    });

    it('disables submit button when code is incomplete', () => {
      renderWithRouter(<EmailVerificationPage />);
      
      const submitButton = screen.getByRole('button', { name: 'Verify Email' });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles non-numeric input gracefully', () => {
      renderWithRouter(<EmailVerificationPage />);
      
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'a' } });
      
      expect(inputs[0]).toHaveValue('a');
    });

    it('handles very long pasted content', () => {
      renderWithRouter(<EmailVerificationPage />);
      
      const inputs = screen.getAllByRole('textbox');
      const longCode = '12345678901234567890';
      
      fireEvent.change(inputs[0], { target: { value: longCode } });
      
      // Should only take first 6 characters
      inputs.forEach((input, index) => {
        expect(input).toHaveValue(longCode[index]);
      });
    });

    it('handles empty pasted content', () => {
      renderWithRouter(<EmailVerificationPage />);
      
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: '' } });
      
      inputs.forEach(input => {
        expect(input).toHaveValue('');
      });
    });

    it('handles focus management with partial pasted code', () => {
      renderWithRouter(<EmailVerificationPage />);
      
      const inputs = screen.getAllByRole('textbox');
      const partialCode = '123';
      
      fireEvent.change(inputs[0], { target: { value: partialCode } });
      
      // Should focus on the next empty input after the last filled one
      expect(document.activeElement).toBe(inputs[3]);
    });
  });
}); 