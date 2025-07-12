import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResetPasswordComponent } from '../ResetPasswordComponent';

describe('ResetPasswordComponent', () => {
  it('renders the reset password form', () => {
    render(<ResetPasswordComponent />);
    expect(screen.getByText(/reset password/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('renders the back to login link', () => {
    render(<ResetPasswordComponent />);
    const link = screen.getByRole('link', { name: /back to login/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/login');
  });

  it('renders with correct input types and placeholders', () => {
    render(<ResetPasswordComponent />);
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('placeholder', 'Enter your email');
  });
}); 