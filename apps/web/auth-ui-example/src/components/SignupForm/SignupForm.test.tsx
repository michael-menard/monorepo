import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignupForm } from './SignupForm';

// Mock the RTK Query useSignupMutation hook
vi.mock('@repo/auth/src/store/authApi', () => ({
  useSignupMutation: () => [vi.fn(async () => ({ success: true })), { isLoading: false, error: null, data: null }],
}));

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all fields', () => {
    render(<SignupForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('shows required field errors', async () => {
    render(<SignupForm />);
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/required/i).length).toBeGreaterThan(0);
    });
  });

  it('shows email format error', async () => {
    render(<SignupForm />);
    fireEvent.input(screen.getByLabelText(/email/i), { target: { value: 'invalid-email' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('shows password mismatch error', async () => {
    render(<SignupForm />);
    fireEvent.input(screen.getByLabelText(/^password$/i), { target: { value: 'Password123' } });
    fireEvent.input(screen.getByLabelText(/confirm password/i), { target: { value: 'Different123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('shows password strength indicator', () => {
    render(<SignupForm />);
    const passwordInput = screen.getByLabelText(/^password$/i);
    fireEvent.input(passwordInput, { target: { value: 'a' } });
    expect(screen.getByText(/password strength: weak/i)).toBeInTheDocument();
    fireEvent.input(passwordInput, { target: { value: 'Password1' } });
    expect(screen.getByText(/password strength: strong/i)).toBeInTheDocument();
  });

  it('submits valid form and shows success', async () => {
    const mockSignup = vi.fn(async () => ({ success: true }));
    vi.mocked(require('@repo/auth/src/store/authApi')).useSignupMutation.mockReturnValue([mockSignup, { isLoading: false, error: null, data: { success: true } }]);
    render(<SignupForm />);
    fireEvent.input(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.input(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
    fireEvent.input(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
    fireEvent.input(screen.getByLabelText(/^password$/i), { target: { value: 'Password123' } });
    fireEvent.input(screen.getByLabelText(/confirm password/i), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalled();
      expect(screen.getByText(/signup successful/i)).toBeInTheDocument();
    });
  });

  it('shows error on failed signup', async () => {
    const mockSignup = vi.fn(async () => { throw { data: { message: 'Signup failed' } }; });
    vi.mocked(require('@repo/auth/src/store/authApi')).useSignupMutation.mockReturnValue([mockSignup, { isLoading: false, error: { data: { message: 'Signup failed' } }, data: null }]);
    render(<SignupForm />);
    fireEvent.input(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.input(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
    fireEvent.input(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
    fireEvent.input(screen.getByLabelText(/^password$/i), { target: { value: 'Password123' } });
    fireEvent.input(screen.getByLabelText(/confirm password/i), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(screen.getByText(/signup failed/i)).toBeInTheDocument();
    });
  });
}); 