# @repo/features/gallery

A comprehensive gallery component package for displaying and managing image collections with advanced filtering, search, and upload capabilities.

## Features

- 🖼️ **Image Gallery**: Responsive grid layout for image display
- 🔍 **Advanced Search**: Full-text search across image metadata
- 🏷️ **Filtering System**: Filter by tags, categories, and metadata
- 📤 **Upload Integration**: Seamless image upload with progress tracking
- 🎨 **Customizable UI**: Flexible styling with Tailwind CSS
- 📱 **Responsive Design**: Mobile-first responsive layout
- 🔧 **TypeScript**: Full type safety and IntelliSense support
- 🧪 **Testing**: Comprehensive test coverage with Vitest

## Installation

This package is part of the monorepo and should be installed as a dependency in your app:

```bash
pnpm add @repo/features/gallery
```

## Quick Start

### 1. Basic Gallery Usage

```tsx
import { Gallery } from '@repo/features/gallery';

function MyGallery() {
  const images = [
    {
      id: '1',
      url: '/path/to/image1.jpg',
      title: 'Image 1',
      description: 'Description for image 1',
      tags: ['nature', 'landscape']
    },
    // ... more images
  ];

  return (
    <Gallery
      images={images}
      onImageClick={(image) => console.log('Clicked:', image)}
      onUpload={(files) => console.log('Uploading:', files)}
    />
  );
}
```

### 2. With Search and Filtering

```tsx
import { Gallery, useGalleryFilters } from '@repo/features/gallery';

function AdvancedGallery() {
  const { filters, setFilters, filteredImages } = useGalleryFilters(images);

  return (
    <div>
      <GalleryFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableTags={['nature', 'landscape', 'portrait']}
      />
      <Gallery
        images={filteredImages}
        onImageClick={handleImageClick}
        onUpload={handleUpload}
      />
    </div>
  );
}
```

## API Reference

### Gallery Component

The main gallery component for displaying images.

```tsx
interface GalleryProps {
  images: Image[];
  onImageClick?: (image: Image) => void;
  onUpload?: (files: File[]) => void;
  onDelete?: (imageId: string) => void;
  onEdit?: (image: Image) => void;
  loading?: boolean;
  error?: string;
  className?: string;
}
```

#### Props

| Property | Type | Description |
|----------|------|-------------|
| `images` | `Image[]` | Array of images to display |
| `onImageClick` | `(image: Image) => void` | Callback when image is clicked |
| `onUpload` | `(files: File[]) => void` | Callback for file upload |
| `onDelete` | `(imageId: string) => void` | Callback for image deletion |
| `onEdit` | `(image: Image) => void` | Callback for image editing |
| `loading` | `boolean` | Loading state |
| `error` | `string` | Error message |
| `className` | `string` | Additional CSS classes |

### useGalleryFilters Hook

Hook for managing gallery filters and search functionality.

```tsx
const {
  filters,
  setFilters,
  filteredImages,
  searchTerm,
  setSearchTerm,
  clearFilters
} = useGalleryFilters(images);
```

#### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `filters` | `GalleryFilters` | Current filter state |
| `setFilters` | `(filters: GalleryFilters) => void` | Update filters |
| `filteredImages` | `Image[]` | Images filtered by current criteria |
| `searchTerm` | `string` | Current search term |
| `setSearchTerm` | `(term: string) => void` | Update search term |
| `clearFilters` | `() => void` | Clear all filters |

### GalleryFilters Component

Component for displaying and managing gallery filters.

```tsx
interface GalleryFiltersProps {
  filters: GalleryFilters;
  onFiltersChange: (filters: GalleryFilters) => void;
  availableTags: string[];
  className?: string;
}
```

## Types

### Image

```tsx
interface Image {
  id: string;
  url: string;
  title: string;
  description?: string;
  tags: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### GalleryFilters

```tsx
interface GalleryFilters {
  tags: string[];
  categories: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy: 'date' | 'title' | 'size';
  sortOrder: 'asc' | 'desc';
}
```

## Styling

The gallery components use Tailwind CSS for styling. You can customize the appearance by:

1. **Overriding CSS classes**: Pass custom `className` props
2. **CSS Variables**: Override CSS custom properties
3. **Tailwind Config**: Extend the Tailwind configuration

### Custom Styling Example

```tsx
<Gallery
  images={images}
  className="custom-gallery bg-gray-100 rounded-lg p-4"
/>
```

## Testing

Run tests for this package:

```bash
pnpm test
```

### Test Coverage

- Component rendering
- User interactions
- Filter functionality
- Search functionality
- Upload handling
- Error states

## Contributing

1. Follow the monorepo's coding standards
2. Write tests for new features
3. Update documentation for API changes
4. Ensure TypeScript types are accurate

## Related Packages

- `@repo/ui` - Base UI components
- `@repo/features/ImageUploadModal` - Image upload modal
- `@monorepo/upload` - Image processing and upload utilities