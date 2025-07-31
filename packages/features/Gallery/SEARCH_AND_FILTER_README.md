# Gallery Search and Filter Functionality

This document describes the search and filtering capabilities implemented in the gallery package.

## Overview

The gallery package includes comprehensive search and filtering functionality that allows users to:

- Search images by title, description, author, or tags
- Filter images by tags and categories
- Use debounced search for better performance
- Clear filters easily
- See search results with loading states and error handling

## Components

### 1. FilterBar Component

The `FilterBar` component provides the main search and filtering interface.

**Location:** `src/components/FilterBar/index.tsx`

**Features:**
- Search input with debouncing
- Tag filtering with toggle functionality
- Category filtering with dropdown
- Clear filters button
- Expandable/collapsible filter panel
- Active filters summary

**Props:**
```typescript
interface FilterBarProps {
  onSearchChange: (query: string) => void;
  onTagsChange: (tags: string[]) => void;
  onCategoryChange: (category: string) => void;
  onClearFilters: () => void;
  availableTags?: string[];
  availableCategories?: string[];
  searchPlaceholder?: string;
  className?: string;
  debounceMs?: number;
}
```

### 2. useFilterBar Hook

The `useFilterBar` hook manages the search and filtering state and integrates with the API.

**Location:** `src/hooks/useFilterBar.ts`

**Features:**
- Local filter state management
- API integration for search results
- Available tags and categories fetching
- Search parameter computation
- Loading and error state handling

**Return Value:**
```typescript
interface UseFilterBarReturn {
  // State
  filters: FilterState;
  searchResults: any[];
  isLoading: boolean;
  error: any;
  totalResults: number;
  hasActiveFilters: boolean;

  // Available options
  availableTags: string[];
  availableCategories: string[];

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setSelectedCategory: (category: string) => void;
  clearFilters: () => void;
  toggleTag: (tag: string) => void;

  // Computed
  searchParams: {
    query?: string;
    tags?: string[];
    category?: string;
    from?: number;
    size?: number;
  };
}
```

### 3. GalleryWithSearch Component

The `GalleryWithSearch` component combines the FilterBar with the main Gallery component.

**Location:** `src/components/GalleryWithSearch/index.tsx`

**Features:**
- Integrated search and filtering
- Automatic tag extraction from images
- Search results display
- Loading and error states
- No results messaging
- Fallback to local filtering when API is unavailable

**Props:**
```typescript
interface GalleryWithSearchProps {
  images: GalleryImage[];
  className?: string;
  onImageClick?: (image: GalleryImage) => void;
  onImageLike?: (imageId: string, liked: boolean) => void;
  onImageShare?: (imageId: string) => void;
  onImageDelete?: (imageId: string) => void;
  onImageDownload?: (imageId: string) => void;
  onImageAddToAlbum?: (imageId: string) => void;
  onImagesSelected?: (imageIds: string[]) => void;
  selectedImages?: string[];
  onImagesDeleted?: (imageIds: string[]) => void;
  onImagesAddedToAlbum?: (imageIds: string[], albumId: string) => void;
  onImagesDownloaded?: (imageIds: string[]) => void;
  onImagesShared?: (imageIds: string[]) => void;
  layout?: 'grid' | 'masonry';
  searchPlaceholder?: string;
  showFilterBar?: boolean;
}
```

## API Integration

### Gallery API Endpoints

The gallery package includes RTK Query endpoints for search and filtering:

**Location:** `src/store/galleryApi.ts`

**Endpoints:**
- `searchImages` - Search images with filters
- `getAvailableTags` - Get available tags for filtering
- `getAvailableCategories` - Get available categories for filtering

**Search Filters:**
```typescript
interface SearchFilters {
  query?: string;
  tags?: string[];
  category?: string;
  from?: number;
  size?: number;
}
```

**Search Response:**
```typescript
interface SearchResponse {
  data: GalleryImage[];
  total: number;
  source: 'elasticsearch' | 'database';
  message?: string;
}
```

## Usage Examples

### Basic Usage

```tsx
import { GalleryWithSearch } from '@repo/gallery';

const MyGallery = () => {
  const images = [
    {
      id: '1',
      url: 'https://example.com/image1.jpg',
      title: 'Nature Landscape',
      description: 'Beautiful nature landscape',
      author: 'John Doe',
      tags: ['nature', 'landscape'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // ... more images
  ];

  return (
    <GalleryWithSearch
      images={images}
      onImageClick={(image) => console.log('Clicked:', image.title)}
      layout="grid"
      showFilterBar={true}
    />
  );
};
```

### Advanced Usage with Custom Handlers

```tsx
import { GalleryWithSearch } from '@repo/gallery';

const AdvancedGallery = () => {
  const handleImageLike = (imageId: string, liked: boolean) => {
    // Handle like/unlike
    console.log(`Image ${imageId} ${liked ? 'liked' : 'unliked'}`);
  };

  const handleImageDelete = (imageId: string) => {
    // Handle image deletion
    console.log(`Deleting image ${imageId}`);
  };

  const handleImagesSelected = (imageIds: string[]) => {
    // Handle batch selection
    console.log('Selected images:', imageIds);
  };

  return (
    <GalleryWithSearch
      images={images}
      onImageClick={handleImageClick}
      onImageLike={handleImageLike}
      onImageDelete={handleImageDelete}
      onImagesSelected={handleImagesSelected}
      layout="masonry"
      searchPlaceholder="Search your images..."
      className="my-custom-gallery"
    />
  );
};
```

### Using FilterBar Directly

```tsx
import { FilterBar, useFilterBar } from '@repo/gallery';

const CustomFilterBar = () => {
  const {
    filters,
    searchResults,
    isLoading,
    availableTags,
    availableCategories,
    setSearchQuery,
    setSelectedTags,
    setSelectedCategory,
    clearFilters,
  } = useFilterBar({
    initialFilters: {
      searchQuery: '',
      selectedTags: [],
      selectedCategory: '',
    },
    debounceMs: 300,
    pageSize: 20,
  });

  return (
    <FilterBar
      onSearchChange={setSearchQuery}
      onTagsChange={setSelectedTags}
      onCategoryChange={setSelectedCategory}
      onClearFilters={clearFilters}
      availableTags={availableTags}
      availableCategories={availableCategories}
      searchPlaceholder="Search images..."
    />
  );
};
```

## Search and Filter Features

### Search Functionality

- **Text Search:** Search by title, description, author, or tags
- **Debounced Input:** Prevents excessive API calls while typing
- **Fuzzy Matching:** Supports partial matches and typos
- **Multi-field Search:** Searches across multiple fields simultaneously

### Filter Functionality

- **Tag Filtering:** Filter by one or more tags
- **Category Filtering:** Filter by image categories
- **Combined Filters:** Use multiple filters simultaneously
- **Active Filter Display:** Shows currently active filters
- **Easy Clear:** Clear individual filters or all filters at once

### Performance Features

- **Debounced Search:** Configurable debounce time (default: 300ms)
- **Pagination Support:** Supports large datasets with pagination
- **Caching:** RTK Query provides automatic caching
- **Loading States:** Shows loading indicators during search
- **Error Handling:** Graceful error handling with user feedback

### User Experience Features

- **Responsive Design:** Works on all screen sizes
- **Keyboard Navigation:** Full keyboard accessibility
- **Visual Feedback:** Clear visual indicators for active filters
- **No Results Handling:** Helpful messages when no results found
- **Search Results Summary:** Shows result count and total

## Testing

The search and filtering functionality includes comprehensive tests:

- **FilterBar Tests:** `src/components/FilterBar/__tests__/FilterBar.test.tsx`
- **useFilterBar Hook Tests:** `src/hooks/__tests__/useFilterBar.test.ts`
- **GalleryWithSearch Tests:** `src/components/GalleryWithSearch/__tests__/GalleryWithSearch.test.tsx`

### Running Tests

```bash
# Run all gallery tests
pnpm test:run

# Run specific test files
pnpm vitest run src/components/FilterBar/__tests__/FilterBar.test.tsx
pnpm vitest run src/components/GalleryWithSearch/__tests__/GalleryWithSearch.test.tsx
```

## Integration with Backend

The search and filtering functionality integrates with the backend API:

### Elasticsearch Integration

When Elasticsearch is available, the search uses:
- Full-text search across title, description, and tags
- Fuzzy matching for typos
- Relevance scoring
- Fast search performance

### Database Fallback

When Elasticsearch is unavailable, the search falls back to:
- Database queries with LIKE operators
- Basic text matching
- Tag-based filtering
- Category filtering

### API Endpoints

The backend provides these endpoints:
- `GET /api/gallery/search` - Search images with filters
- `GET /api/gallery/tags` - Get available tags
- `GET /api/gallery/categories` - Get available categories

## Configuration

### Environment Variables

```bash
# Elasticsearch configuration (optional)
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=gallery

# Search configuration
SEARCH_DEBOUNCE_MS=300
SEARCH_PAGE_SIZE=20
```

### Component Configuration

```typescript
// Default configuration
const defaultConfig = {
  debounceMs: 300,
  pageSize: 20,
  searchPlaceholder: 'Search images...',
  showFilterBar: true,
};
```

## Future Enhancements

Potential future improvements:
- Advanced search operators (AND, OR, NOT)
- Date range filtering
- File type filtering
- Saved searches
- Search history
- Search suggestions/autocomplete
- Advanced sorting options
- Export filtered results

## Troubleshooting

### Common Issues

1. **Search not working:** Check if the API endpoints are available
2. **Filters not applying:** Verify the filter state is being updated
3. **Performance issues:** Adjust debounce time or page size
4. **No results showing:** Check if the search query matches the data

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
DEBUG=gallery:search
```

This will log search queries, filter changes, and API responses for debugging purposes. 