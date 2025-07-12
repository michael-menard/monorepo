import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SignupComponent } from '../SignupComponent';

describe('SignupComponent', () => {
  it('renders the signup form', () => {
    render(<SignupComponent />);
    // There are two elements with 'Create account' (heading and button)
    const createAccountEls = screen.getAllByText(/create account/i);
    expect(createAccountEls.length).toBeGreaterThan(0);
    expect(screen.getByText(/enter your information/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders the sign in link', () => {
    render(<SignupComponent />);
    const link = screen.getByRole('link', { name: /sign in/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/login');
  });

  it('renders with correct input types and placeholders', () => {
    render(<SignupComponent />);
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText(/^email$/i)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('placeholder', 'Enter your full name');
    expect(screen.getByLabelText(/^email$/i)).toHaveAttribute('placeholder', 'Enter your email');
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('placeholder', 'Enter your password');
    expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('placeholder', 'Confirm your password');
  });
}); 