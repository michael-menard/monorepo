# @repo/features/ImageUploadModal

A reusable image upload modal component with drag-and-drop support, preview functionality, and progress tracking.

## Features

- 📤 **Drag & Drop**: Intuitive drag-and-drop file upload
- 🖼️ **Image Preview**: Real-time preview of selected images
- 📊 **Progress Tracking**: Upload progress with visual indicators
- ✅ **Validation**: File type and size validation
- 🎨 **Customizable UI**: Flexible styling with Tailwind CSS
- 📱 **Responsive Design**: Mobile-first responsive layout
- 🔧 **TypeScript**: Full type safety and IntelliSense support
- 🧪 **Testing**: Comprehensive test coverage with Vitest

## Installation

This package is part of the monorepo and should be installed as a dependency in your app:

```bash
pnpm add @repo/features/ImageUploadModal
```

## Quick Start

### 1. Basic Usage

```tsx
import { ImageUploadModal } from '@repo/features/ImageUploadModal';
import { useState } from 'react';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  const handleUpload = async (files: File[]) => {
    try {
      // Handle file upload logic
      console.log('Uploading files:', files);
      setIsOpen(false);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>
        Upload Images
      </button>
      
      <ImageUploadModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onUpload={handleUpload}
        maxFiles={5}
        maxFileSize={5 * 1024 * 1024} // 5MB
        acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
      />
    </div>
  );
}
```

### 2. With Custom Configuration

```tsx
import { ImageUploadModal, ImageUploadConfig } from '@repo/features/ImageUploadModal';

function CustomUploadModal() {
  const config: ImageUploadConfig = {
    maxFiles: 10,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    acceptedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowMultiple: true,
    showPreview: true,
    autoUpload: false,
    uploadEndpoint: '/api/upload',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  return (
    <ImageUploadModal
      isOpen={isOpen}
      onClose={onClose}
      onUpload={handleUpload}
      config={config}
      title="Upload Your Images"
      description="Drag and drop your images here or click to browse"
    />
  );
}
```

## API Reference

### ImageUploadModal Component

The main modal component for image uploads.

```tsx
interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => Promise<void> | void;
  config?: ImageUploadConfig;
  title?: string;
  description?: string;
  className?: string;
}
```

#### Props

| Property | Type | Description |
|----------|------|-------------|
| `isOpen` | `boolean` | Controls modal visibility |
| `onClose` | `() => void` | Callback when modal is closed |
| `onUpload` | `(files: File[]) => Promise<void> \| void` | Upload handler |
| `config` | `ImageUploadConfig` | Upload configuration |
| `title` | `string` | Modal title |
| `description` | `string` | Modal description |
| `className` | `string` | Additional CSS classes |

### ImageUploadConfig

Configuration object for upload behavior.

```tsx
interface ImageUploadConfig {
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
  allowMultiple?: boolean;
  showPreview?: boolean;
  autoUpload?: boolean;
  uploadEndpoint?: string;
  headers?: Record<string, string>;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
}
```

#### Configuration Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `maxFiles` | `number` | `5` | Maximum number of files |
| `maxFileSize` | `number` | `5MB` | Maximum file size in bytes |
| `acceptedTypes` | `string[]` | `['image/*']` | Accepted MIME types |
| `allowMultiple` | `boolean` | `true` | Allow multiple file selection |
| `showPreview` | `boolean` | `true` | Show image previews |
| `autoUpload` | `boolean` | `false` | Auto-upload on file selection |
| `uploadEndpoint` | `string` | - | Custom upload endpoint |
| `headers` | `Record<string, string>` | - | Custom request headers |
| `onProgress` | `(progress: number) => void` | - | Progress callback |
| `onError` | `(error: string) => void` | - | Error callback |

### useImageUpload Hook

Hook for managing image upload state and logic.

```tsx
const {
  files,
  addFiles,
  removeFile,
  clearFiles,
  uploadProgress,
  isUploading,
  error,
  upload
} = useImageUpload(config);
```

#### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `files` | `File[]` | Selected files |
| `addFiles` | `(newFiles: File[]) => void` | Add files to selection |
| `removeFile` | `(index: number) => void` | Remove file by index |
| `clearFiles` | `() => void` | Clear all files |
| `uploadProgress` | `number` | Upload progress (0-100) |
| `isUploading` | `boolean` | Upload in progress |
| `error` | `string` | Upload error message |
| `upload` | `() => Promise<void>` | Start upload process |

## Events and Callbacks

### Upload Events

```tsx
interface UploadEvents {
  onFileSelect?: (files: File[]) => void;
  onFileRemove?: (file: File, index: number) => void;
  onUploadStart?: () => void;
  onUploadProgress?: (progress: number) => void;
  onUploadSuccess?: (result: any) => void;
  onUploadError?: (error: Error) => void;
  onUploadComplete?: () => void;
}
```

## Styling

The modal uses Tailwind CSS for styling. You can customize the appearance by:

1. **Overriding CSS classes**: Pass custom `className` props
2. **CSS Variables**: Override CSS custom properties
3. **Tailwind Config**: Extend the Tailwind configuration

### Custom Styling Example

```tsx
<ImageUploadModal
  isOpen={isOpen}
  onClose={onClose}
  onUpload={handleUpload}
  className="custom-upload-modal"
  title="Custom Upload Title"
  description="Custom upload description"
/>
```

## Error Handling

The component provides comprehensive error handling:

```tsx
const handleUpload = async (files: File[]) => {
  try {
    // Upload logic
    await uploadFiles(files);
  } catch (error) {
    // Error will be displayed in the modal
    console.error('Upload failed:', error);
  }
};
```

### Common Error Types

- **File size exceeded**: When file exceeds `maxFileSize`
- **Invalid file type**: When file type not in `acceptedTypes`
- **Too many files**: When selection exceeds `maxFiles`
- **Upload failed**: Network or server errors

## Testing

Run tests for this package:

```bash
pnpm test
```

### Test Coverage

- Modal open/close functionality
- File selection and validation
- Drag and drop behavior
- Upload progress tracking
- Error handling
- Accessibility features

## Accessibility

The modal includes full accessibility support:

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
- `@repo/features/FileUpload` - File upload utilities
- `@repo/shared-image-utils` - Image processing utilities 