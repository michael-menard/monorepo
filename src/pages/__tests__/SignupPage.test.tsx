import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignupPage from '../SignupPage';
import React from 'react';

describe('SignupPage', () => {
  const mockSignup = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // If SignupPage uses context or props for signup, mock as needed
  });

  it('renders signup form with all required fields', () => {
    render(<SignupPage />);
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByText('Enter your information to create your account')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password', { exact: true })).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('calls signup function when form is submitted with valid data', async () => {
    render(<SignupPage onSignup={mockSignup} />);
    const nameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password', { exact: true });
    const confirmPasswordInput = screen.getByLabelText('Confirm Password', { exact: true });
    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });
    });
  });

  // Add other validation and error tests as needed, using robust selectors
}); 