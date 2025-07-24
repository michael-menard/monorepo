import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PasswordStrength from '../PasswordStrength/index.js';

describe('PasswordStrength', () => {
  it('renders the password strength component', () => {
    render(<PasswordStrength password="test123" />);
    const strengthBar = screen.getByTestId('strength-bar');
    expect(strengthBar).toBeInTheDocument();
  });

  it('renders with empty password', () => {
    render(<PasswordStrength password="" />);
    const strengthBar = screen.getByTestId('strength-bar');
    expect(strengthBar).toBeInTheDocument();
  });

  it('renders with weak password', () => {
    render(<PasswordStrength password="123" />);
    const strengthBar = screen.getByTestId('strength-bar');
    expect(strengthBar).toBeInTheDocument();
  });

  it('renders with strong password', () => {
    render(<PasswordStrength password="StrongPassword123!" />);
    const strengthBar = screen.getByTestId('strength-bar');
    expect(strengthBar).toBeInTheDocument();
  });

  it('shows strength text for weak password', () => {
    render(<PasswordStrength password="123" />);
    const strengthText = screen.getByText('Very Weak');
    expect(strengthText).toBeInTheDocument();
  });

  it('shows strength text for fair password', () => {
    render(<PasswordStrength password="password123" />);
    const strengthText = screen.getByText('Fair');
    expect(strengthText).toBeInTheDocument();
  });

  it('shows strength text for strong password', () => {
    render(<PasswordStrength password="StrongPassword123!" />);
    const strengthText = screen.getByText('Strong');
    expect(strengthText).toBeInTheDocument();
  });

  it('applies correct color classes based on strength', () => {
    render(<PasswordStrength password="123" />);
    const strengthBar = screen.getByTestId('strength-bar');
    expect(strengthBar).toHaveClass('bg-red-500');
  });

  it('updates when password changes', () => {
    const { rerender } = render(<PasswordStrength password="123" />);
    // Initially shows very weak
    expect(screen.getByText('Very Weak')).toBeInTheDocument();
    // Change to strong password
    rerender(<PasswordStrength password="StrongPassword123!" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('renders with correct structure', () => {
    render(<PasswordStrength password="test123" />);
    const strengthBar = screen.getByTestId('strength-bar');
    expect(strengthBar).toBeInTheDocument();
    // Check that criteria are rendered
    const criteria = screen.getByText('At least 8 characters');
    expect(criteria).toBeInTheDocument();
  });

  it('shows feedback for very weak password', () => {
    render(<PasswordStrength password="a" />);
    const feedback = screen.getByText('Very Weak');
    expect(feedback).toBeInTheDocument();
  });

  it('shows feedback for very strong password', () => {
    render(<PasswordStrength password="VeryStrongPassword123!@#" />);
    const feedback = screen.getByText('Strong');
    expect(feedback).toBeInTheDocument();
  });
}); 