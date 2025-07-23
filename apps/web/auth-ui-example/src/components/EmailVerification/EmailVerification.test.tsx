import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailVerification } from './EmailVerification';

// Mock the RTK Query useVerifyEmailMutation hook
vi.mock('@repo/auth/src/store/authApi', () => ({
  useVerifyEmailMutation: () => [vi.fn(async () => ({ success: true })), { isLoading: false, error: null, data: null }],
}));

describe('EmailVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the code input and button', () => {
    render(<EmailVerification />);
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify email/i })).toBeInTheDocument();
  });

  it('shows required field error', async () => {
    render(<EmailVerification />);
    fireEvent.click(screen.getByRole('button', { name: /verify email/i }));
    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  it('shows code length error', async () => {
    render(<EmailVerification />);
    fireEvent.input(screen.getByLabelText(/verification code/i), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /verify email/i }));
    await waitFor(() => {
      expect(screen.getByText(/must be at least 6/i)).toBeInTheDocument();
    });
  });

  it('submits valid code and shows success', async () => {
    const mockVerify = vi.fn(async () => ({ success: true }));
    vi.mocked(require('@repo/auth/src/store/authApi')).useVerifyEmailMutation.mockReturnValue([mockVerify, { isLoading: false, error: null, data: { success: true } }]);
    render(<EmailVerification />);
    fireEvent.input(screen.getByLabelText(/verification code/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /verify email/i }));
    await waitFor(() => {
      expect(mockVerify).toHaveBeenCalled();
      expect(screen.getByText(/email verified successfully/i)).toBeInTheDocument();
    });
  });

  it('shows error on failed verification', async () => {
    const mockVerify = vi.fn(async () => { throw { data: { message: 'Verification failed' } }; });
    vi.mocked(require('@repo/auth/src/store/authApi')).useVerifyEmailMutation.mockReturnValue([mockVerify, { isLoading: false, error: { data: { message: 'Verification failed' } }, data: null }]);
    render(<EmailVerification />);
    fireEvent.input(screen.getByLabelText(/verification code/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /verify email/i }));
    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
    });
  });
}); 