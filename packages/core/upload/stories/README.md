# @monorepo/upload

A comprehensive file and image upload system with drag-and-drop, progress tracking, validation, and image processing capabilities.

## Features

- 🎯 **Multiple Modes**: Inline, modal, and avatar upload interfaces
- 🖱️ **Drag & Drop**: Intuitive file selection with visual feedback
- 📊 **Progress Tracking**: Real-time upload progress with linear and circular indicators
- ✅ **Validation**: File type, size, and count validation with Zod schemas
- 🖼️ **Image Processing**: Client and server-side image processing with presets
- 🎨 **Customizable**: Extensive configuration options and styling
- ♿ **Accessible**: WCAG 2.2 AA compliant with keyboard navigation
- 📱 **Responsive**: Works on all device sizes
- 🔒 **Secure**: Built-in security measures and validation

## Quick Start

```tsx
import { Upload } from '@monorepo/upload';

// Basic inline upload
<Upload mode="inline" />

// Modal upload with preset
<Upload mode="modal" preset="gallery" />

// Avatar upload
<Upload mode="avatar" preset="avatar" />
```

## Components

### Upload

The main component that can render in different modes:

- `inline`: Direct upload area in component tree
- `modal`: Button that opens upload modal
- `avatar`: Circular upload for profile pictures

### UploadArea

Drag-and-drop interface component with visual feedback.

### FilePreview

Displays file information, preview thumbnails, and upload status.

### ProgressIndicator

Shows upload progress in linear or circular format.

## Presets

Pre-configured upload settings for common use cases:

- **avatar**: 200x200px, 5MB, images only
- **thumbnail**: 150x150px, 3MB, images only
- **gallery**: 800x800px, 10MB, images only
- **hero**: 1200x800px, 15MB, images only
- **background**: 1920x1080px, 20MB, images only
- **document**: 50MB, documents only
- **general**: 100MB, all file types

## Configuration

```tsx
const config = {
  maxFiles: 5,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  acceptedFileTypes: ['image/jpeg', 'image/png'],
  multiple: true,
  autoUpload: false,
  endpoint: '/api/upload',
  headers: { Authorization: 'Bearer token' },
}

;<Upload config={config} />
```

## Hooks

- `useUpload`: Main upload logic and state management
- `useDragAndDrop`: Drag-and-drop functionality
- `useFileValidation`: File validation utilities
- `useUploadProgress`: Progress tracking
- `useImageProcessing`: Image processing operations
- `useMetadataFields`: Metadata form handling

## Events

```tsx
<Upload
  onUploadStart={files => console.log('Started:', files)}
  onUploadProgress={(progress, file) => console.log('Progress:', progress)}
  onUploadComplete={files => console.log('Completed:', files)}
  onUploadError={(error, file) => console.log('Error:', error)}
  onFilesChange={files => console.log('Files changed:', files)}
/>
```

## Styling

The components use Tailwind CSS classes and can be customized with:

```tsx
<Upload className="custom-upload-styles" mode="inline" />
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Bundle Size

- Main bundle: ~35KB (9KB gzipped)
- Browser-only: ~25KB (8KB gzipped)
- Tree-shakeable exports for optimal bundle size
