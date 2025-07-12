import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../ui/input';

describe('Input', () => {
  it('renders the input', () => {
    render(<Input data-testid="input" />);
    expect(screen.getByTestId('input')).toBeInTheDocument();
  });

  it('forwards className to Input', () => {
    render(<Input data-testid="input" className="custom-input" />);
    expect(screen.getByTestId('input')).toHaveClass('custom-input');
  });

  it('sets the input type', () => {
    render(<Input data-testid="input" type="email" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');
  });

  it('can be disabled', () => {
    render(<Input data-testid="input" disabled />);
    expect(screen.getByTestId('input')).toBeDisabled();
  });
}); 