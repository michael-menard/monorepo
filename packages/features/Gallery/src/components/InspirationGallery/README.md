# InspirationGallery Component

A responsive masonry layout gallery component with infinite scroll, loading states, and smooth animations built with React, Framer Motion, and Tailwind CSS.

## Features

- **Masonry Layout**: Responsive CSS columns layout that adapts to different screen sizes
- **Infinite Scroll**: Automatic loading of more content when scrolling near the bottom
- **Loading States**: Beautiful loading animations and states
- **Responsive Design**: Configurable columns for different breakpoints (sm, md, lg, xl)
- **Smooth Animations**: Framer Motion powered animations for image loading and interactions
- **Accessibility**: Full keyboard navigation and ARIA support
- **Customizable**: Flexible props for styling and behavior customization

## Installation

The component is part of the `@repo/gallery` package and is automatically available when you import from the gallery package.

```bash
# The component is already included in the features gallery package
import { InspirationGallery } from '@repo/features-gallery';
```

## Basic Usage

```tsx
import React, { useState, useCallback } from 'react';
import { InspirationGallery } from '@repo/features-gallery';
import type { GalleryImage } from '@repo/features-gallery';

const MyGallery = () => {
  const [images, setImages] = useState<GalleryImage[]>([
    {
      id: '1',
      url: 'https://example.com/image1.jpg',
      title: 'Beautiful Landscape',
      description: 'A stunning mountain landscape',
      author: 'John Doe',
      tags: ['nature', 'landscape'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // ... more images
  ]);

  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const handleLoadMore = useCallback(async () => {
    setLoading(true);
    // Fetch more images from your API
    const newImages = await fetchMoreImages();
    setImages(prev => [...prev, ...newImages]);
    setLoading(false);
  }, []);

  return (
    <InspirationGallery
      images={images}
      onImageClick={(image) => console.log('Image clicked:', image.title)}
      onImageLike={(imageId, liked) => console.log('Image liked:', imageId, liked)}
      onLoadMore={handleLoadMore}
      hasMore={hasMore}
      loading={loading}
    />
  );
};
```

## Props

### Required Props

- `images`: `GalleryImage[]` - Array of images to display

### Optional Props

- `className`: `string` - Additional CSS classes for styling
- `onImageClick`: `(image: GalleryImage) => void` - Callback when an image is clicked
- `onImageLike`: `(imageId: string, liked: boolean) => void` - Callback when an image is liked/unliked
- `onImageShare`: `(imageId: string) => void` - Callback when an image is shared
- `onImageDelete`: `(imageId: string) => void` - Callback when an image is deleted
- `onImageDownload`: `(imageId: string) => void` - Callback when an image is downloaded
- `onImageAddToAlbum`: `(imageId: string) => void` - Callback when an image is added to an album
- `onLoadMore`: `() => Promise<void>` - Callback to load more images (for infinite scroll)
- `hasMore`: `boolean` - Whether there are more images to load (default: false)
- `loading`: `boolean` - Whether currently loading more images (default: false)
- `columns`: `{ sm?: number; md?: number; lg?: number; xl?: number }` - Number of columns per breakpoint (default: { sm: 2, md: 3, lg: 4, xl: 5 })
- `gap`: `number` - Gap between images in Tailwind spacing units (default: 4)

## GalleryImage Type

```tsx
interface GalleryImage {
  id: string;
  url: string;
  title?: string;
  description?: string;
  author?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Advanced Usage

### Custom Column Configuration

```tsx
<InspirationGallery
  images={images}
  columns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
  gap={6}
  className="border-2 border-gray-200 rounded-lg p-4"
  // ... other props
/>
```

### With Custom Styling

```tsx
<InspirationGallery
  images={images}
  className="bg-gray-50 p-6 rounded-xl shadow-lg"
  gap={8}
  // ... other props
/>
```

### Infinite Scroll Implementation

```tsx
const [images, setImages] = useState<GalleryImage[]>([]);
const [loading, setLoading] = useState(false);
const [hasMore, setHasMore] = useState(true);
const [page, setPage] = useState(1);

const handleLoadMore = useCallback(async () => {
  if (loading || !hasMore) return;
  
  setLoading(true);
  try {
    const newImages = await fetchImages(page);
    setImages(prev => [...prev, ...newImages]);
    setPage(prev => prev + 1);
    
    // Stop loading more if no more images
    if (newImages.length === 0) {
      setHasMore(false);
    }
  } catch (error) {
    console.error('Failed to load more images:', error);
  } finally {
    setLoading(false);
  }
}, [loading, hasMore, page]);
```

## Responsive Breakpoints

The component uses Tailwind CSS breakpoints:

- `sm`: 640px and up
- `md`: 768px and up  
- `lg`: 1024px and up
- `xl`: 1280px and up

## Accessibility

The component includes:

- Keyboard navigation support (Enter/Space to activate)
- ARIA labels and roles
- Focus management
- Screen reader friendly structure

## Performance

- Lazy loading of images
- Efficient re-rendering with React.memo
- Optimized animations with Framer Motion
- Debounced scroll handling for infinite scroll

## Browser Support

- Modern browsers with CSS Grid support
- IE11+ with polyfills (if needed)

## Examples

See the `example.tsx` file in this directory for complete usage examples including:

- Basic gallery setup
- Custom configurations
- Infinite scroll implementation
- Event handling

## Testing

The component includes comprehensive tests covering:

- Layout responsiveness
- Image loading and interactions
- Infinite scroll functionality
- Loading states
- Accessibility features
- Props and configuration

Run tests with:

```bash
pnpm test:run
``` 