import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForgotPassword } from './ForgotPassword';

// Mock the RTK Query useResetPasswordMutation hook
vi.mock('@repo/auth/src/store/authApi', () => ({
  useResetPasswordMutation: () => [vi.fn(async () => ({ success: true })), { isLoading: false, error: null, data: null }],
}));

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the email input and button', () => {
    render(<ForgotPassword />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('shows required field error', async () => {
    render(<ForgotPassword />);
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  it('shows email format error', async () => {
    render(<ForgotPassword />);
    fireEvent.input(screen.getByLabelText(/email/i), { target: { value: 'invalid-email' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('submits valid email and shows success', async () => {
    const mockReset = vi.fn(async () => ({ success: true }));
    vi.mocked(require('@repo/auth/src/store/authApi')).useResetPasswordMutation.mockReturnValue([mockReset, { isLoading: false, error: null, data: { success: true } }]);
    render(<ForgotPassword />);
    fireEvent.input(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled();
      expect(screen.getByText(/reset link sent/i)).toBeInTheDocument();
    });
  });

  it('shows error on failed request', async () => {
    const mockReset = vi.fn(async () => { throw { data: { message: 'Request failed' } }; });
    vi.mocked(require('@repo/auth/src/store/authApi')).useResetPasswordMutation.mockReturnValue([mockReset, { isLoading: false, error: { data: { message: 'Request failed' } }, data: null }]);
    render(<ForgotPassword />);
    fireEvent.input(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    await waitFor(() => {
      expect(screen.getByText(/request failed/i)).toBeInTheDocument();
    });
  });
}); 