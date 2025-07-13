import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../ui/button';

describe('Button', () => {
  it('renders the button with children', () => {
    render(<Button data-testid="button">Click me</Button>);
    expect(screen.getByTestId('button')).toBeInTheDocument();
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('forwards className to Button', () => {
    render(<Button data-testid="button" className="custom-btn">Btn</Button>);
    expect(screen.getByTestId('button')).toHaveClass('custom-btn');
  });

  it('can be disabled', () => {
    render(<Button data-testid="button" disabled>Disabled</Button>);
    expect(screen.getByTestId('button')).toBeDisabled();
  });

  it('renders with different variants', () => {
    render(<Button data-testid="button" variant="destructive">Destructive</Button>);
    expect(screen.getByTestId('button')).toHaveClass('bg-destructive');
  });

  it('renders with different sizes', () => {
    render(<Button data-testid="button" size="lg">Large</Button>);
    expect(screen.getByTestId('button')).toHaveClass('h-11', 'px-8');
  });

  it('renders as a child element when asChild is true', () => {
    render(
      <Button asChild data-testid="button">
        <a href="#" data-testid="child-link">Link</a>
      </Button>
    );
    expect(screen.getByTestId('child-link')).toBeInTheDocument();
  });
}); 