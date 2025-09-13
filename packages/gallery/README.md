# @monorepo/gallery

A comprehensive, flexible gallery component system for React applications. Consolidates all gallery functionality with support for multiple layouts, data types, and interaction patterns.

## Features

### 🎨 **Multiple Layouts**
- **Grid**: Responsive grid layout with customizable columns
- **Masonry**: Pinterest-style masonry layout
- **List**: Compact list view with thumbnails
- **Table**: Data-heavy table view with sorting
- **Carousel**: Featured content carousel with navigation

### 🔧 **Flexible Configuration**
- **Responsive Design**: Configurable breakpoints and columns
- **View Modes**: Compact, comfortable, and spacious spacing
- **Animations**: Smooth transitions with Framer Motion
- **Theming**: Tailwind CSS with customizable styling

### 📊 **Data Adapters**
- **Built-in Adapters**: Image, inspiration, instruction, wishlist
- **Custom Adapters**: Transform any data type to gallery format
- **Type Safety**: Full TypeScript support with Zod validation

### 🎯 **Preset Configurations**
- **Inspiration Gallery**: Optimized for creative content browsing
- **Instructions Gallery**: Perfect for MOC instruction management
- **Wishlist Gallery**: Designed for purchase tracking and management
- **Compact Gallery**: Ideal for sidebars and modals
- **Table Gallery**: Data-heavy management interfaces
- **Carousel Gallery**: Featured content highlights

### ⚡ **Advanced Features**
- **Selection**: Single and multi-select with batch operations
- **Search & Filtering**: Configurable search and filter options
- **Infinite Scroll**: Seamless content loading
- **Drag & Drop**: Reorderable items (where applicable)
- **Actions**: Like, share, download, edit, delete operations

## Installation

```bash
pnpm add @monorepo/gallery
```

## Quick Start

### Basic Usage

```tsx
import { Gallery } from '@monorepo/gallery';

const MyGallery = () => {
  const items = [
    {
      id: '1',
      title: 'Amazing LEGO Build',
      imageUrl: '/images/build1.jpg',
      author: 'Builder123',
      createdAt: new Date(),
    },
    // ... more items
  ];

  return (
    <Gallery
      items={items}
      preset="inspiration"
      actions={{
        onItemClick: (item) => console.log('Clicked:', item),
        onItemLike: (id, liked) => console.log('Liked:', id, liked),
      }}
    />
  );
};
```

### Using Presets

```tsx
import { Gallery, GalleryPresets } from '@monorepo/gallery';

// Inspiration gallery with masonry layout
<Gallery items={items} preset="inspiration" />

// Instructions gallery with grid layout and selection
<Gallery items={items} preset="instructions" />

// Wishlist gallery with drag-and-drop
<Gallery items={items} preset="wishlist" />

// Compact gallery for sidebars
<Gallery items={items} preset="compact" />
```

### Custom Configuration

```tsx
import { Gallery } from '@monorepo/gallery';

<Gallery
  items={items}
  config={{
    layout: 'grid',
    viewMode: 'comfortable',
    selectable: true,
    multiSelect: true,
    columns: {
      xs: 1,
      sm: 2,
      md: 3,
      lg: 4,
      xl: 5,
    },
    filterConfig: {
      searchable: true,
      tagFilter: true,
      customFilters: [
        {
          key: 'difficulty',
          label: 'Difficulty',
          type: 'select',
          options: [
            { value: 'beginner', label: 'Beginner' },
            { value: 'advanced', label: 'Advanced' },
          ],
        },
      ],
    },
  }}
  actions={{
    onItemClick: handleItemClick,
    onItemsSelected: handleSelection,
    onBatchDelete: handleBatchDelete,
  }}
/>
```

### Data Adapters

Transform your data to work with the gallery:

```tsx
import { Gallery, GalleryAdapters } from '@monorepo/gallery';

// Using built-in adapters
<Gallery
  items={mocInstructions}
  adapter={GalleryAdapters.instruction}
  preset="instructions"
/>

// Creating custom adapter
const customAdapter = GalleryAdapters.create({
  idField: 'uuid',
  titleField: 'name',
  imageField: 'photoUrl',
  authorField: 'creator',
  type: 'custom',
});

<Gallery
  items={customData}
  adapter={customAdapter}
/>
```

## API Reference

### Gallery Props

```tsx
interface GalleryProps {
  items: GalleryItem[];
  config?: Partial<GalleryConfig>;
  actions?: GalleryActions;
  className?: string;
  loading?: boolean;
  error?: string | null;
  selectedItems?: string[];
  adapter?: DataAdapter;
  preset?: string | GalleryPreset;
}
```

### Gallery Config

```tsx
interface GalleryConfig {
  layout: 'grid' | 'masonry' | 'list' | 'table' | 'carousel';
  viewMode: 'compact' | 'comfortable' | 'spacious';
  itemsPerPage: number;
  infiniteScroll: boolean;
  selectable: boolean;
  multiSelect: boolean;
  draggable: boolean;
  sortable: boolean;
  sortOptions: SortOption[];
  filterConfig: FilterConfig;
  columns: ResponsiveColumns;
  gap: number;
  animations: AnimationConfig;
}
```

### Actions

```tsx
interface GalleryActions {
  onItemClick?: (item: GalleryItem) => void;
  onItemLike?: (itemId: string, liked: boolean) => void;
  onItemShare?: (itemId: string) => void;
  onItemDelete?: (itemId: string) => void;
  onItemDownload?: (itemId: string) => void;
  onItemEdit?: (item: GalleryItem) => void;
  onItemsSelected?: (itemIds: string[]) => void;
  onBatchDelete?: (itemIds: string[]) => void;
  onBatchDownload?: (itemIds: string[]) => void;
  onBatchShare?: (itemIds: string[]) => void;
  onLoadMore?: () => Promise<void>;
  onRefresh?: () => Promise<void>;
}
```

## Available Presets

- **`inspiration`**: Masonry layout for creative content
- **`instructions`**: Grid layout with selection for MOC instructions
- **`wishlist`**: Grid layout with drag-and-drop for wishlist management
- **`compact`**: List layout for small spaces
- **`table`**: Table layout for data management
- **`carousel`**: Carousel layout for featured content

## Styling

The gallery uses Tailwind CSS classes and can be customized through:

1. **CSS Custom Properties**: Override default colors and spacing
2. **Tailwind Classes**: Pass custom `className` props
3. **Theme Configuration**: Extend your Tailwind config

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build package
pnpm build

# Run Storybook
pnpm storybook
```

## License

MIT
