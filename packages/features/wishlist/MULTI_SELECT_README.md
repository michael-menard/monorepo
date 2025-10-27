# Wishlist Multi-Select with Batch Operations

This document describes the implementation of multi-select functionality with batch operations for the wishlist feature.

## Overview

The multi-select functionality allows users to select multiple wishlist items and perform batch operations on them, including:

- **Batch Delete**: Remove multiple items at once
- **Batch Toggle Purchased**: Mark multiple items as purchased or not purchased
- **Batch Update Priority**: Change priority for multiple items
- **Batch Update Category**: Change category for multiple items

## Components

### 1. WishlistItemCard

Enhanced with checkbox selection functionality:

```tsx
<WishlistItemCard
  item={item}
  selected={selectedItems.includes(item.id)}
  onSelect={checked => handleItemSelect(item.id, checked)}
  showCheckbox={true}
  // ... other props
/>
```

**New Props:**

- `selected?: boolean` - Whether the item is selected
- `onSelect?: (checked: boolean) => void` - Callback when selection changes
- `showCheckbox?: boolean` - Whether to show the selection checkbox

### 2. BatchOperationsToolbar

A floating toolbar that appears when items are selected:

```tsx
<BatchOperationsToolbar
  selectedItems={selectedItems}
  totalItems={items.length}
  wishlistId={wishlistId}
  onClearSelection={handleClearSelection}
  onItemsDeleted={handleItemsDeleted}
  onItemsUpdated={handleItemsUpdated}
  onItemsToggled={handleItemsToggled}
/>
```

**Features:**

- Shows selection count (e.g., "3 of 10 selected")
- Batch operations buttons with confirmation dialogs
- Processing indicators during operations
- Modal dialogs for priority and category updates

### 3. Wishlist (Main Component)

Integrates all multi-select functionality:

```tsx
<Wishlist
  wishlistId={wishlistId}
  onItemEdit={handleItemEdit}
  onItemDelete={handleItemDelete}
  onItemTogglePurchased={handleItemTogglePurchased}
  onItemsDeleted={handleItemsDeleted}
  onItemsUpdated={handleItemsUpdated}
  onItemsToggled={handleItemsToggled}
  filters={filters}
/>
```

## API Endpoints

New batch operation endpoints have been added to the wishlist API:

### Batch Delete

```typescript
batchDeleteWishlistItems: builder.mutation<
  { message: string; deletedIds: string[] },
  { wishlistId: string; itemIds: string[] }
>
```

### Batch Update

```typescript
batchUpdateWishlistItems: builder.mutation<
  { message: string; updatedIds: string[] },
  { wishlistId: string; itemIds: string[]; data: Partial<UpdateWishlistItem> }
>
```

### Batch Toggle Purchased

```typescript
batchTogglePurchased: builder.mutation<
  { message: string; updatedIds: string[] },
  { wishlistId: string; itemIds: string[]; isPurchased: boolean }
>
```

## Usage Example

```tsx
import React, { useState } from 'react'
import { Wishlist } from '@packages/features/wishlist'

const WishlistPage: React.FC = () => {
  const [wishlistId] = useState('my-wishlist-id')

  const handleItemsDeleted = (deletedIds: string[]) => {
    console.log('Deleted items:', deletedIds)
    // Handle success notification
  }

  const handleItemsUpdated = (updatedIds: string[]) => {
    console.log('Updated items:', updatedIds)
    // Handle success notification
  }

  const handleItemsToggled = (toggledIds: string[], isPurchased: boolean) => {
    console.log('Toggled items:', toggledIds, 'isPurchased:', isPurchased)
    // Handle success notification
  }

  return (
    <Wishlist
      wishlistId={wishlistId}
      onItemsDeleted={handleItemsDeleted}
      onItemsUpdated={handleItemsUpdated}
      onItemsToggled={handleItemsToggled}
    />
  )
}
```

## User Experience

1. **Selection**: Users can click checkboxes on individual items to select them
2. **Visual Feedback**: Selected items show a blue ring border
3. **Toolbar**: A floating toolbar appears at the bottom when items are selected
4. **Batch Operations**: Users can perform various operations on selected items
5. **Confirmation**: Delete operations require confirmation
6. **Processing**: Loading indicators show during batch operations
7. **Clear Selection**: Users can clear all selections with the Clear button

## Testing

Comprehensive tests have been written for:

- **WishlistItemCard**: Checkbox functionality, selection states, event handling
- **BatchOperationsToolbar**: All batch operations, confirmation dialogs, error handling
- **Integration**: End-to-end multi-select workflow

Run tests with:

```bash
pnpm test:run
```

## Implementation Details

### State Management

- Selection state is managed locally in the Wishlist component
- RTK Query handles API calls and cache invalidation
- Optimistic updates for better UX

### Error Handling

- API errors are caught and logged
- Users can retry failed operations
- Graceful degradation if batch operations fail

### Performance

- Efficient re-rendering with React.memo and useCallback
- Debounced API calls to prevent excessive requests
- Optimistic UI updates for immediate feedback

## Future Enhancements

Potential improvements for the multi-select functionality:

1. **Select All/None**: Add buttons to select/deselect all items
2. **Keyboard Shortcuts**: Support for keyboard navigation and shortcuts
3. **Bulk Import/Export**: Import/export selected items
4. **Advanced Filtering**: Filter by selection state
5. **Undo/Redo**: Support for undoing batch operations
6. **Progress Tracking**: Show progress for large batch operations
