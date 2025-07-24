import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CategoryFilter from '../CategoryFilter.js';
import { LegoCategoryEnum } from '../../WishlistSchemas/index.js';

const categories = LegoCategoryEnum.options;

describe('CategoryFilter', () => {
  it('renders all predefined categories', () => {
    render(<CategoryFilter value={null} onChange={() => {}} />);
    categories.forEach((cat: string) => {
      expect(screen.getByRole('option', { name: cat })).toBeInTheDocument();
    });
  });

  it('calls onChange when a predefined category is selected', () => {
    const onChange = vi.fn();
    render(<CategoryFilter value={null} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: categories[0] } });
    expect(onChange).toHaveBeenCalledWith(categories[0]);
  });

  it('calls onChange with null when All is selected', () => {
    const onChange = vi.fn();
    render(<CategoryFilter value={categories[0]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows and updates custom category input', () => {
    const onChange = vi.fn();
    render(<CategoryFilter value={null} onChange={onChange} />);
    const input = screen.getByPlaceholderText(/custom category/i);
    fireEvent.change(input, { target: { value: 'My Custom' } });
    expect(onChange).toHaveBeenCalledWith('My Custom');
    expect(input).toHaveValue('My Custom');
  });

  it('shows clear button and clears filter', () => {
    const onChange = vi.fn();
    render(<CategoryFilter value={categories[0]} onChange={onChange} />);
    const clearBtn = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('is accessible: label and aria-labels', () => {
    render(<CategoryFilter value={null} onChange={() => {}} />);
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/custom category/i)).toHaveAttribute('aria-label', 'Custom category');
  });

  it('controlled value: shows correct selection', () => {
    render(<CategoryFilter value={categories[1]} onChange={() => {}} />);
    expect(screen.getByDisplayValue(categories[1])).toBeInTheDocument();
  });

  it('controlled value: shows custom input if not predefined', () => {
    render(<CategoryFilter value="My Custom" onChange={() => {}} />);
    expect(screen.getByDisplayValue('My Custom')).toBeInTheDocument();
  });

  it('does not render custom input if allowCustom is false', () => {
    render(<CategoryFilter value={null} onChange={() => {}} allowCustom={false} />);
    expect(screen.queryByPlaceholderText(/custom category/i)).not.toBeInTheDocument();
  });

  it('switches between predefined and custom category', () => {
    const onChange = vi.fn();
    render(<CategoryFilter value={null} onChange={onChange} />);
    // Select predefined
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: categories[2] } });
    expect(onChange).toHaveBeenCalledWith(categories[2]);
    // Switch to custom
    const input = screen.getByPlaceholderText(/custom category/i);
    fireEvent.change(input, { target: { value: 'Another Custom' } });
    expect(onChange).toHaveBeenCalledWith('Another Custom');
  });
}); 