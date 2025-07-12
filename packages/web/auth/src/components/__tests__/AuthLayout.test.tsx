import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthLayout from '../AuthLayout';

describe('AuthLayout', () => {
  it('renders the auth layout', () => {
    render(
      <AuthLayout>
        <div data-testid="auth-content">Auth Content</div>
      </AuthLayout>
    );
    
    const container = document.querySelector('.min-h-screen');
    expect(container).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <AuthLayout>
        <div data-testid="auth-content">Auth Content</div>
      </AuthLayout>
    );
    
    const content = screen.getByTestId('auth-content');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('Auth Content');
  });

  it('has the correct CSS classes', () => {
    render(
      <AuthLayout>
        <div data-testid="auth-content">Auth Content</div>
      </AuthLayout>
    );
    
    const container = document.querySelector('.min-h-screen');
    expect(container).toHaveClass('min-h-screen', 'bg-gradient-to-br', 'from-gray-900', 'via-green-900', 'to-emerald-900', 'flex', 'items-center', 'justify-center', 'relative', 'overflow-hidden');
  });

  it('renders floating shapes', () => {
    render(
      <AuthLayout>
        <div data-testid="auth-content">Auth Content</div>
      </AuthLayout>
    );
    
    // Check that floating shapes are rendered
    const shapes = document.querySelectorAll('[data-testid="motion-div"]');
    expect(shapes.length).toBeGreaterThan(0);
  });

  it('renders multiple floating shapes with different properties', () => {
    render(
      <AuthLayout>
        <div data-testid="auth-content">Auth Content</div>
      </AuthLayout>
    );
    
    const shapes = document.querySelectorAll('[data-testid="motion-div"]');
    expect(shapes.length).toBe(3); // Should have 3 floating shapes
    
    // Check that shapes have different colors
    const colors = Array.from(shapes).map(shape => shape.getAttribute('data-color'));
    expect(colors).toContain('bg-green-500');
    expect(colors).toContain('bg-emerald-500');
    expect(colors).toContain('bg-lime-500');
  });

  it('renders with complex children', () => {
    render(
      <AuthLayout>
        <div data-testid="form-container">
          <h1 data-testid="title">Login</h1>
          <form data-testid="login-form">
            <input data-testid="email-input" type="email" />
            <input data-testid="password-input" type="password" />
            <button data-testid="submit-button" type="submit">Login</button>
          </form>
        </div>
      </AuthLayout>
    );
    
    expect(screen.getByTestId('form-container')).toBeInTheDocument();
    expect(screen.getByTestId('title')).toBeInTheDocument();
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  });
}); 