# @repo/shared-image-utils

A comprehensive image optimization utilities package for the monorepo, providing both backend (Node.js) and frontend (browser) image processing capabilities.

## Features

- **Backend Image Processing**: High-performance image optimization using Sharp
- **Frontend Image Processing**: Client-side image processing using Canvas API
- **Multiple Format Support**: JPEG, PNG, WebP, and AVIF
- **Predefined Presets**: Common configurations for avatars, thumbnails, galleries, etc.
- **Responsive Variants**: Generate multiple image sizes for responsive design
- **Type Safety**: Full TypeScript support with Zod validation
- **Performance Optimization**: Automatic quality adjustment based on image size

## Installation

```bash
pnpm add @repo/shared-image-utils
```

## Quick Start

### Backend Usage

```typescript
import { processImage, getPreset, createImageVariants } from '@repo/shared-image-utils'

// Process a single image
const { buffer, stats } = await processImage(imageBuffer, {
  maxWidth: 800,
  maxHeight: 600,
  quality: 85,
  format: 'webp'
})

// Use predefined presets
const avatarConfig = getPreset('avatar')
const { buffer: avatarBuffer } = await processImage(imageBuffer, avatarConfig)

// Create multiple variants
const variants = await createImageVariants(imageBuffer, [
  { name: 'thumbnail', config: getPreset('thumbnail') },
  { name: 'gallery', config: getPreset('gallery') },
  { name: 'hero', config: getPreset('hero') }
])
```

### Frontend Usage

```typescript
import { processImageFile, validateImageFile, getPreset } from '@repo/shared-image-utils'

// Validate image file
const validation = validateImageFile(file, { maxSizeMB: 10 })
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors)
  return
}

// Process image file
const { file: processedFile, stats } = await processImageFile({
  file,
  config: getPreset('gallery')
})

// Create multiple variants
const variants = await createImageVariantsFile(file, [
  { name: 'thumbnail', config: getPreset('thumbnail') },
  { name: 'gallery', config: getPreset('gallery') }
], (progress) => {
  console.log(`Processing: ${progress * 100}%`)
})
```

## API Reference

### Backend Utilities

#### `processImage(buffer, config?)`

Process and optimize an image buffer.

```typescript
const { buffer, stats } = await processImage(imageBuffer, {
  maxWidth: 800,
  maxHeight: 600,
  quality: 85,
  format: 'webp',
  fit: 'cover',
  progressive: true,
  stripMetadata: true
})
```

#### `createImageVariants(buffer, variants)`

Create multiple image variants from a single source.

```typescript
const variants = await createImageVariants(buffer, [
  { name: 'thumbnail', config: getPreset('thumbnail') },
  { name: 'gallery', config: getPreset('gallery') }
])
```

#### `getImageMetadata(buffer)`

Extract metadata from an image buffer.

```typescript
const metadata = await getImageMetadata(buffer)
// Returns: { width, height, format, size, hasAlpha, isOpaque, orientation }
```

### Frontend Utilities

#### `processImageFile(options)`

Process and optimize an image file in the browser.

```typescript
const { file, stats } = await processImageFile({
  file: imageFile,
  config: getPreset('gallery'),
  onProgress: (progress) => console.log(`${progress * 100}%`)
})
```

#### `validateImageFile(file, validation?)`

Validate an image file before processing.

```typescript
const validation = validateImageFile(file, {
  maxSizeMB: 10,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
})
```

#### `createImageVariantsFile(file, variants, onProgress?)`

Create multiple image variants in the browser.

```typescript
const variants = await createImageVariantsFile(file, [
  { name: 'thumbnail', config: getPreset('thumbnail') },
  { name: 'gallery', config: getPreset('gallery') }
], (progress) => console.log(`${progress * 100}%`))
```

### Presets

#### Available Presets

- **`avatar`**: 200x200, high quality, cover fit
- **`thumbnail`**: 150x150, medium quality, cover fit
- **`gallery`**: 800x800, good quality, inside fit
- **`hero`**: 1200x800, high quality, cover fit
- **`background`**: 1920x1080, optimized for web, cover fit

#### Using Presets

```typescript
import { getPreset, createCustomPreset } from '@repo/shared-image-utils'

// Use predefined preset
const avatarConfig = getPreset('avatar')

// Create custom preset based on existing one
const customAvatar = createCustomPreset('avatar', {
  maxWidth: 300,
  quality: 95,
  format: 'webp'
})
```

### Responsive Variants

#### Standard Breakpoints

```typescript
import { createStandardResponsiveVariants, RESPONSIVE_BREAKPOINTS } from '@repo/shared-image-utils'

const variants = createStandardResponsiveVariants(getPreset('gallery'))
// Creates: mobile (480px), tablet (768px), desktop (1024px), large (1440px), xlarge (1920px)
```

#### Custom Breakpoints

```typescript
import { createResponsiveVariants } from '@repo/shared-image-utils'

const variants = createResponsiveVariants(getPreset('gallery'), [
  { name: 'small', width: 320 },
  { name: 'medium', width: 640 },
  { name: 'large', width: 1024 }
])
```

## Configuration

### Image Processing Config

```typescript
interface ImageProcessingConfig {
  maxWidth: number
  maxHeight: number
  quality: number
  format: 'jpeg' | 'png' | 'webp' | 'avif'
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  progressive: boolean
  optimizeCoding: boolean
  stripMetadata: boolean
  blur?: number
  sharpen: boolean
  rotate: boolean
}
```

### Validation Config

```typescript
interface ImageValidation {
  maxSizeMB: number
  allowedTypes: string[]
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}
```

## Performance Tips

1. **Use Appropriate Presets**: Choose presets based on your use case
2. **Optimize Quality**: Larger images benefit from lower quality settings
3. **Choose Right Format**: WebP/AVIF for better compression, PNG for transparency
4. **Batch Processing**: Use `createImageVariants` for multiple sizes
5. **Frontend Validation**: Validate files before upload to reduce server load

## Browser Support

- **Modern Browsers**: Full support for all features
- **WebP Support**: Automatically detected and used when available
- **Canvas API**: Required for frontend processing
- **File API**: Required for file handling

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test --coverage

# Run tests in watch mode
pnpm test:watch
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass

## License

Internal package - see monorepo license. 