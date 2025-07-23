import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginForm } from './LoginForm';

// Mock the RTK Query useLoginMutation hook
vi.mock('@repo/auth/src/store/authApi', () => ({
  useLoginMutation: () => [vi.fn(async () => ({ success: true })), { isLoading: false, error: null, data: null }],
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields and button', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('shows required field errors', async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/required/i).length).toBeGreaterThan(0);
    });
  });

  it('shows email format error', async () => {
    render(<LoginForm />);
    fireEvent.input(screen.getByLabelText(/email/i), { target: { value: 'invalid-email' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('submits valid form and shows success', async () => {
    const mockLogin = vi.fn(async () => ({ success: true }));
    vi.mocked(require('@repo/auth/src/store/authApi')).useLoginMutation.mockReturnValue([mockLogin, { isLoading: false, error: null, data: { success: true } }]);
    render(<LoginForm />);
    fireEvent.input(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.input(screen.getByLabelText(/password/i), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      expect(screen.getByText(/login successful/i)).toBeInTheDocument();
    });
  });

  it('shows error on failed login', async () => {
    const mockLogin = vi.fn(async () => { throw { data: { message: 'Login failed' } }; });
    vi.mocked(require('@repo/auth/src/store/authApi')).useLoginMutation.mockReturnValue([mockLogin, { isLoading: false, error: { data: { message: 'Login failed' } }, data: null }]);
    render(<LoginForm />);
    fireEvent.input(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.input(screen.getByLabelText(/password/i), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument();
    });
  });
}); 