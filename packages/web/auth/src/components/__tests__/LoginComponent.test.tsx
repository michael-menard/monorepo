import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginComponent } from '../LoginComponent';

describe('LoginComponent', () => {
  it('renders the login form', () => {
    render(<LoginComponent />);
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your credentials/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders the forgot password link', () => {
    render(<LoginComponent />);
    const link = screen.getByRole('link', { name: /forgot your password/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/reset-password');
  });

  it('renders the sign up link', () => {
    render(<LoginComponent />);
    const link = screen.getByRole('link', { name: /sign up/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/signup');
  });

  it('renders with correct input types and placeholders', () => {
    render(<LoginComponent />);
    expect(screen.getByLabelText(/^email$/i)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(/^email$/i)).toHaveAttribute('placeholder', 'Enter your email');
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('placeholder', 'Enter your password');
  });
}); 