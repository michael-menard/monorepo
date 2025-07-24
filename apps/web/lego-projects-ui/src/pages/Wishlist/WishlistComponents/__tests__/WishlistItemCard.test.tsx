import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WishlistItemCard } from '../WishlistItemCard';
import type { WishlistItem } from '../WishlistItemCard';

const mockItem: WishlistItem = {
  id: 'item1',
  title: 'LEGO Millennium Falcon',
  description: 'Ultimate Collector Series',
  productLink: 'https://lego.com/millennium-falcon',
  imageUrl: 'https://example.com/falcon.jpg',
  category: 'Star Wars',
  sortOrder: 0,
};

describe('WishlistItemCard', () => {
  it('renders all item details', () => {
    render(<WishlistItemCard item={mockItem} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('LEGO Millennium Falcon')).toBeInTheDocument();
    expect(screen.getByText('Ultimate Collector Series')).toBeInTheDocument();
    expect(screen.getByText('Star Wars')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', mockItem.imageUrl);
    expect(screen.getByRole('link')).toHaveAttribute('href', mockItem.productLink);
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<WishlistItemCard item={mockItem} onEdit={onEdit} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Edit item'));
    expect(onEdit).toHaveBeenCalledWith('item1');
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<WishlistItemCard item={mockItem} onEdit={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Delete item'));
    expect(onDelete).toHaveBeenCalledWith('item1');
  });

  it('calls onDragStart and onDragEnd when dragged', () => {
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();
    render(
      <WishlistItemCard item={mockItem} onEdit={vi.fn()} onDelete={vi.fn()} onDragStart={onDragStart} onDragEnd={onDragEnd} />
    );
    const card = screen.getByRole('button', { name: /LEGO Millennium Falcon/i });
    // Mock dataTransfer for jsdom
    const dataTransfer = { setData: vi.fn(), getData: vi.fn() };
    fireEvent.dragStart(card, { dataTransfer });
    expect(onDragStart).toHaveBeenCalledWith('item1');
    fireEvent.dragEnd(card);
    expect(onDragEnd).toHaveBeenCalled();
  });

  it('is accessible by keyboard and has correct aria-label', () => {
    render(<WishlistItemCard item={mockItem} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const card = screen.getByRole('button', { name: /LEGO Millennium Falcon/i });
    card.focus();
    expect(card).toHaveFocus();
    expect(card).toHaveAttribute('aria-label', 'LEGO Millennium Falcon');
  });

  it('renders without image or product link if not provided', () => {
    const item = { ...mockItem, imageUrl: undefined, productLink: undefined };
    render(<WishlistItemCard item={item} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders with minimal required fields', () => {
    const item = { id: 'item2', title: 'Simple Set', category: 'Misc', sortOrder: 1 };
    render(<WishlistItemCard item={item as any} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Simple Set')).toBeInTheDocument();
    expect(screen.getByText('Misc')).toBeInTheDocument();
  });
}); 