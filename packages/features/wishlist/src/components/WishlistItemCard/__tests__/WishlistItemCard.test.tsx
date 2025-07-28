import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WishlistItemCard from '../index.js';
import type { WishlistItem } from '../../../schemas';

const mockItem: WishlistItem = {
  id: '1',
  name: 'Test Item',
  description: 'Test description',
  price: 99.99,
  priority: 'high',
  category: 'Electronics',
  isPurchased: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('WishlistItemCard', () => {
  const defaultProps = {
    item: mockItem,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onTogglePurchased: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders item information correctly', () => {
    render(<WishlistItemCard {...defaultProps} />);

    expect(screen.getByText('Test Item')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });

  it('shows checkbox when showCheckbox is true', () => {
    render(<WishlistItemCard {...defaultProps} showCheckbox={true} onSelect={vi.fn()} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('does not show checkbox when showCheckbox is false', () => {
    render(<WishlistItemCard {...defaultProps} showCheckbox={false} />);

    const checkbox = screen.queryByRole('checkbox');
    expect(checkbox).not.toBeInTheDocument();
  });

  it('shows selected state when selected is true', () => {
    render(
      <WishlistItemCard 
        {...defaultProps} 
        showCheckbox={true} 
        selected={true} 
        onSelect={vi.fn()} 
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('calls onSelect when checkbox is clicked', () => {
    const onSelect = vi.fn();
    render(
      <WishlistItemCard 
        {...defaultProps} 
        showCheckbox={true} 
        onSelect={onSelect} 
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(onSelect).toHaveBeenCalledWith(true);
  });

  it('calls onSelect with false when unchecking', () => {
    const onSelect = vi.fn();
    render(
      <WishlistItemCard 
        {...defaultProps} 
        showCheckbox={true} 
        selected={true} 
        onSelect={onSelect} 
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(onSelect).toHaveBeenCalledWith(false);
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<WishlistItemCard {...defaultProps} />);

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockItem);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<WishlistItemCard {...defaultProps} />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(defaultProps.onDelete).toHaveBeenCalledWith('1');
  });

  it('calls onTogglePurchased when purchased button is clicked', () => {
    render(<WishlistItemCard {...defaultProps} />);

    const toggleButton = screen.getByTitle('Mark as purchased');
    fireEvent.click(toggleButton);

    expect(defaultProps.onTogglePurchased).toHaveBeenCalledWith('1');
  });

  it('shows purchased overlay when item is purchased', () => {
    const purchasedItem = { ...mockItem, isPurchased: true };
    render(<WishlistItemCard {...defaultProps} item={purchasedItem} />);

    expect(screen.getByText('Purchased')).toBeInTheDocument();
  });

  it('prevents event propagation when checkbox is clicked', () => {
    const onSelect = vi.fn();
    const stopPropagation = vi.fn();
    
    render(
      <WishlistItemCard 
        {...defaultProps} 
        showCheckbox={true} 
        onSelect={onSelect} 
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox, { stopPropagation });

    expect(onSelect).toHaveBeenCalledWith(true);
  });
}); 