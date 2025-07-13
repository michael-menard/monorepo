import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FloatingShape from '../FloatingShape';

describe('FloatingShape', () => {
  const defaultProps = {
    color: 'bg-blue-500',
    size: 'w-20 h-20',
    top: '10%',
    left: '20%',
    delay: 0
  };

  it('renders the floating shape', () => {
    render(<FloatingShape {...defaultProps} />);
    
    const shape = screen.getByTestId('motion-div');
    expect(shape).toBeInTheDocument();
  });

  it('renders with custom color', () => {
    render(<FloatingShape {...defaultProps} color="bg-red-500" />);
    
    const shape = screen.getByTestId('motion-div');
    expect(shape).toHaveClass('bg-red-500');
  });

  it('renders with custom size', () => {
    render(<FloatingShape {...defaultProps} size="w-32 h-32" />);
    
    const shape = screen.getByTestId('motion-div');
    expect(shape).toHaveClass('w-32', 'h-32');
  });

  it('renders with custom position', () => {
    render(<FloatingShape {...defaultProps} top="15%" left="25%" />);
    
    const shape = screen.getByTestId('motion-div');
    expect(shape).toHaveStyle('top: 15%');
    expect(shape).toHaveStyle('left: 25%');
  });

  it('renders with custom delay', () => {
    render(<FloatingShape {...defaultProps} delay={2} />);
    
    const shape = screen.getByTestId('motion-div');
    expect(shape).toHaveAttribute('data-delay', '2');
  });

  it('renders with animation props', () => {
    render(<FloatingShape {...defaultProps} />);
    
    const shape = screen.getByTestId('motion-div');
    expect(shape).toHaveAttribute('data-animate');
    expect(shape).toHaveAttribute('data-transition');
  });

  it('combines all props correctly', () => {
    render(
      <FloatingShape 
        color="bg-green-500" 
        size="w-24 h-24" 
        top="15%" 
        left="25%" 
        delay={3} 
      />
    );
    
    const shape = screen.getByTestId('motion-div');
    expect(shape).toHaveClass('bg-green-500', 'w-24', 'h-24');
    expect(shape).toHaveStyle('top: 15%');
    expect(shape).toHaveStyle('left: 25%');
  });

  it('renders with rounded shape by default', () => {
    render(<FloatingShape {...defaultProps} />);
    
    const shape = screen.getByTestId('motion-div');
    expect(shape).toHaveClass('rounded-full');
  });

  it('renders with custom speed', () => {
    render(<FloatingShape {...defaultProps} speed="fast" />);
    
    const shape = screen.getByTestId('motion-div');
    expect(shape).toHaveAttribute('data-speed', 'fast');
  });

  it('renders with data attributes', () => {
    render(<FloatingShape {...defaultProps} />);
    
    const shape = screen.getByTestId('motion-div');
    expect(shape).toHaveAttribute('data-color', 'bg-blue-500');
    expect(shape).toHaveAttribute('data-size', 'w-20 h-20');
    expect(shape).toHaveAttribute('data-top', '10%');
    expect(shape).toHaveAttribute('data-left', '20%');
  });
}); 