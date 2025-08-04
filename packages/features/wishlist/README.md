# @repo/features/wishlist

A comprehensive wishlist management package for LEGO sets and parts, featuring multi-select functionality, categorization, and sharing capabilities.

## Features

- 📝 **Wishlist Management**: Create and manage wishlists for LEGO sets and parts
- 🎯 **Multi-Select**: Advanced multi-select functionality with bulk operations
- 🏷️ **Categorization**: Organize items by categories and tags
- 👥 **Sharing**: Share wishlists with friends and family
- 📱 **Responsive Design**: Mobile-first responsive layout
- 🎨 **Customizable UI**: Flexible styling with Tailwind CSS
- 🔧 **TypeScript**: Full type safety and IntelliSense support
- 🧪 **Testing**: Comprehensive test coverage with Vitest

## Installation

This package is part of the monorepo and should be installed as a dependency in your app:

```bash
pnpm add @repo/features/wishlist
```

## Quick Start

### 1. Basic Wishlist Component

```tsx
import { Wishlist } from '@repo/features/wishlist';

function MyWishlist() {
  const wishlistItems = [
    {
      id: '1',
      name: 'LEGO Star Wars Millennium Falcon',
      setNumber: '75192',
      price: 159.99,
      category: 'Star Wars',
      priority: 'high',
      notes: 'Ultimate Collector Series'
    },
    // ... more items
  ];

  const handleAddItem = async (item: WishlistItem) => {
    try {
      await addToWishlist(item);
      console.log('Item added to wishlist');
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeFromWishlist(itemId);
      console.log('Item removed from wishlist');
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  return (
    <Wishlist
      items={wishlistItems}
      onAddItem={handleAddItem}
      onRemoveItem={handleRemoveItem}
      onUpdateItem={handleUpdateItem}
    />
  );
}
```

### 2. With Multi-Select Functionality

```tsx
import { Wishlist, useWishlistSelection } from '@repo/features/wishlist';

function WishlistWithMultiSelect() {
  const { 
    selectedItems, 
    toggleItem, 
    selectAll, 
    clearSelection,
    isAllSelected 
  } = useWishlistSelection(wishlistItems);

  const handleBulkRemove = async () => {
    try {
      await removeMultipleItems(selectedItems);
      clearSelection();
      console.log('Items removed successfully');
    } catch (error) {
      console.error('Failed to remove items:', error);
    }
  };

  return (
    <div>
      <div className="bulk-actions">
        <button onClick={selectAll}>Select All</button>
        <button onClick={clearSelection}>Clear Selection</button>
        {selectedItems.length > 0 && (
          <button onClick={handleBulkRemove}>
            Remove Selected ({selectedItems.length})
          </button>
        )}
      </div>
      
      <Wishlist
        items={wishlistItems}
        selectedItems={selectedItems}
        onItemToggle={toggleItem}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        showMultiSelect={true}
      />
    </div>
  );
}
```

### 3. With Categories and Filtering

```tsx
import { Wishlist, WishlistFilters } from '@repo/features/wishlist';

function CategorizedWishlist() {
  const [filters, setFilters] = useState({
    category: '',
    priority: '',
    priceRange: { min: 0, max: 1000 }
  });

  const filteredItems = useMemo(() => {
    return wishlistItems.filter(item => {
      if (filters.category && item.category !== filters.category) return false;
      if (filters.priority && item.priority !== filters.priority) return false;
      if (item.price < filters.priceRange.min || item.price > filters.priceRange.max) return false;
      return true;
    });
  }, [wishlistItems, filters]);

  return (
    <div>
      <WishlistFilters
        filters={filters}
        onFiltersChange={setFilters}
        categories={['Star Wars', 'City', 'Technic', 'Architecture']}
        priorities={['low', 'medium', 'high']}
      />
      
      <Wishlist
        items={filteredItems}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        showCategories={true}
      />
    </div>
  );
}
```

## API Reference

### Wishlist Component

The main wishlist component for displaying and managing wishlist items.

```tsx
interface WishlistProps {
  items: WishlistItem[];
  selectedItems?: string[];
  onAddItem?: (item: WishlistItem) => Promise<void> | void;
  onRemoveItem?: (itemId: string) => Promise<void> | void;
  onUpdateItem?: (item: WishlistItem) => Promise<void> | void;
  onItemToggle?: (itemId: string) => void;
  showMultiSelect?: boolean;
  showCategories?: boolean;
  className?: string;
}
```

#### Props

| Property | Type | Description |
|----------|------|-------------|
| `items` | `WishlistItem[]` | Array of wishlist items |
| `selectedItems` | `string[]` | Array of selected item IDs |
| `onAddItem` | `(item: WishlistItem) => Promise<void> \| void` | Add item handler |
| `onRemoveItem` | `(itemId: string) => Promise<void> \| void` | Remove item handler |
| `onUpdateItem` | `(item: WishlistItem) => Promise<void> \| void` | Update item handler |
| `onItemToggle` | `(itemId: string) => void` | Item selection toggle |
| `showMultiSelect` | `boolean` | Show multi-select functionality |
| `showCategories` | `boolean` | Show category grouping |
| `className` | `string` | Additional CSS classes |

### WishlistFilters Component

Component for filtering wishlist items.

```tsx
interface WishlistFiltersProps {
  filters: WishlistFilters;
  onFiltersChange: (filters: WishlistFilters) => void;
  categories: string[];
  priorities: string[];
  className?: string;
}
```

#### Props

| Property | Type | Description |
|----------|------|-------------|
| `filters` | `WishlistFilters` | Current filter state |
| `onFiltersChange` | `(filters: WishlistFilters) => void` | Filter change handler |
| `categories` | `string[]` | Available categories |
| `priorities` | `string[]` | Available priorities |
| `className` | `string` | Additional CSS classes |

### useWishlistSelection Hook

Hook for managing wishlist item selection.

```tsx
const {
  selectedItems,
  toggleItem,
  selectItem,
  deselectItem,
  selectAll,
  clearSelection,
  isSelected,
  isAllSelected,
  selectedCount
} = useWishlistSelection(items);
```

#### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `selectedItems` | `string[]` | Array of selected item IDs |
| `toggleItem` | `(itemId: string) => void` | Toggle item selection |
| `selectItem` | `(itemId: string) => void` | Select specific item |
| `deselectItem` | `(itemId: string) => void` | Deselect specific item |
| `selectAll` | `() => void` | Select all items |
| `clearSelection` | `() => void` | Clear all selections |
| `isSelected` | `(itemId: string) => boolean` | Check if item is selected |
| `isAllSelected` | `boolean` | Check if all items are selected |
| `selectedCount` | `number` | Number of selected items |

## Types

### WishlistItem

```tsx
interface WishlistItem {
  id: string;
  name: string;
  setNumber?: string;
  price: number;
  currency?: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  imageUrl?: string;
  availability?: 'in-stock' | 'out-of-stock' | 'discontinued';
  releaseDate?: Date;
  addedAt: Date;
  updatedAt: Date;
}
```

### WishlistFilters

```tsx
interface WishlistFilters {
  category: string;
  priority: string;
  priceRange: {
    min: number;
    max: number;
  };
  availability?: string;
  searchTerm?: string;
  sortBy?: 'name' | 'price' | 'priority' | 'addedAt';
  sortOrder?: 'asc' | 'desc';
}
```

### WishlistStats

```tsx
interface WishlistStats {
  totalItems: number;
  totalValue: number;
  averagePrice: number;
  categoryBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
}
```

## Wishlist Management

### Adding Items

```tsx
const handleAddItem = async (item: WishlistItem) => {
  try {
    const response = await fetch('/api/wishlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(item)
    });

    if (!response.ok) {
      throw new Error('Failed to add item');
    }

    const newItem = await response.json();
    setWishlistItems(prev => [...prev, newItem]);
  } catch (error) {
    console.error('Failed to add item:', error);
    throw error;
  }
};
```

### Bulk Operations

```tsx
const handleBulkRemove = async (itemIds: string[]) => {
  try {
    const response = await fetch('/api/wishlist/bulk-remove', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ itemIds })
    });

    if (!response.ok) {
      throw new Error('Failed to remove items');
    }

    setWishlistItems(prev => prev.filter(item => !itemIds.includes(item.id)));
  } catch (error) {
    console.error('Failed to remove items:', error);
    throw error;
  }
};
```

### Sharing Wishlists

```tsx
const handleShareWishlist = async (wishlistId: string, shareWith: string[]) => {
  try {
    const response = await fetch(`/api/wishlist/${wishlistId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ shareWith })
    });

    if (!response.ok) {
      throw new Error('Failed to share wishlist');
    }

    console.log('Wishlist shared successfully');
  } catch (error) {
    console.error('Failed to share wishlist:', error);
    throw error;
  }
};
```

## Multi-Select Functionality

### Selection Management

```tsx
const WishlistWithSelection = () => {
  const { selectedItems, toggleItem, selectAll, clearSelection } = useWishlistSelection(items);

  const handleBulkAction = async (action: 'remove' | 'move' | 'export') => {
    if (selectedItems.length === 0) return;

    switch (action) {
      case 'remove':
        await handleBulkRemove(selectedItems);
        break;
      case 'move':
        await handleBulkMove(selectedItems, targetCategory);
        break;
      case 'export':
        await handleExportItems(selectedItems);
        break;
    }
  };

  return (
    <div>
      <div className="bulk-actions">
        <button onClick={selectAll}>Select All</button>
        <button onClick={clearSelection}>Clear</button>
        {selectedItems.length > 0 && (
          <>
            <button onClick={() => handleBulkAction('remove')}>Remove</button>
            <button onClick={() => handleBulkAction('export')}>Export</button>
          </>
        )}
      </div>
      
      <Wishlist
        items={items}
        selectedItems={selectedItems}
        onItemToggle={toggleItem}
        showMultiSelect={true}
      />
    </div>
  );
};
```

## Styling

The components use Tailwind CSS for styling. You can customize the appearance by:

1. **Overriding CSS classes**: Pass custom `className` props
2. **CSS Variables**: Override CSS custom properties
3. **Tailwind Config**: Extend the Tailwind configuration

### Custom Styling Example

```tsx
<Wishlist
  items={items}
  onAddItem={handleAddItem}
  className="custom-wishlist bg-gray-50 rounded-lg p-6"
/>
```

## Testing

Run tests for this package:

```bash
pnpm test
```

### Test Coverage

- Wishlist item management
- Multi-select functionality
- Filtering and sorting
- Bulk operations
- Sharing functionality
- Error handling

## Accessibility

The components include full accessibility support:

- **Keyboard navigation**: Tab, Enter, Escape keys
- **Screen reader support**: ARIA labels and descriptions
- **Focus management**: Proper focus trapping and restoration
- **High contrast**: Compatible with high contrast themes

## Contributing

1. Follow the monorepo's coding standards
2. Write tests for new features
3. Update documentation for API changes
4. Ensure TypeScript types are accurate
5. Test accessibility features

## Related Packages

- `@repo/ui` - Base UI components
- `@repo/features/shared` - Shared utilities
- `@repo/shared-cache` - Caching utilities 