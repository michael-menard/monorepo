# FileUpload Component

A comprehensive, reusable file upload component with drag-and-drop functionality, progress tracking, file validation, and metadata support.

## Features

- **Drag & Drop**: Intuitive drag-and-drop interface for file selection
- **File Validation**: Built-in file type and size validation
- **Progress Tracking**: Real-time upload progress with visual indicators
- **Metadata Support**: Custom metadata fields for additional file information
- **Multiple Modes**: Support for single file, multiple files, and avatar uploads
- **Error Handling**: Comprehensive error handling and user feedback
- **TypeScript Support**: Full TypeScript support with Zod schema validation
- **Customizable**: Highly customizable styling and behavior

## Installation

```bash
pnpm add @monorepo/fileupload
```

## Basic Usage

```tsx
import { FileUpload } from '@monorepo/fileupload';

function MyComponent() {
  const handleUpload = async (files: File[] | File, metadata?: Record<string, any>) => {
    console.log('Uploading files:', files);
    console.log('Metadata:', metadata);
    // Your upload logic here
  };

  return (
    <FileUpload
      onUpload={handleUpload}
      accept="image/*"
      maxSizeMB={10}
      multiple={true}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onUpload` | `(files: File[] \| File, metadata?: Record<string, any>) => Promise<void> \| void` | **Required** | Upload handler function |
| `accept` | `string \| string[]` | `'image/*'` | Accepted file types |
| `maxSizeMB` | `number` | `20` | Maximum file size in MB |
| `multiple` | `boolean` | `false` | Allow multiple file selection |
| `showPreview` | `boolean` | `true` | Show file preview list |
| `showCropper` | `boolean` | `false` | Enable image cropping |
| `cropAspectRatio` | `number` | `1` | Aspect ratio for cropping |
| `onRemove` | `(file: File) => void` | - | File removal handler |
| `onError` | `(error: string) => void` | - | Error handler |
| `metadataFields` | `MetadataField[]` | `[]` | Custom metadata fields |
| `mode` | `'modal' \| 'inline' \| 'avatar'` | `'inline'` | Display mode |
| `initialFiles` | `File[]` | `[]` | Pre-populated files |
| `uploadButtonLabel` | `string` | `'Upload Files'` | Upload button text |
| `disabled` | `boolean` | `false` | Disable the component |
| `className` | `string` | - | Custom CSS classes |
| `dragAreaClassName` | `string` | - | Custom drag area classes |
| `previewClassName` | `string` | - | Custom preview area classes |

## Metadata Fields

You can add custom metadata fields to collect additional information about uploaded files:

```tsx
const metadataFields = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'text' },
  { name: 'category', label: 'Category', type: 'select', options: ['Art', 'Nature', 'Urban'] },
  { name: 'tags', label: 'Tags', type: 'text' },
];

<FileUpload
  onUpload={handleUpload}
  metadataFields={metadataFields}
  accept="image/*"
/>
```

## Examples

### Basic Image Upload

```tsx
<FileUpload
  onUpload={handleUpload}
  accept="image/*"
  uploadButtonLabel="Upload Images"
/>
```

### Avatar Upload with Cropping

```tsx
<FileUpload
  onUpload={handleAvatarUpload}
  accept="image/*"
  multiple={false}
  mode="avatar"
  showCropper={true}
  cropAspectRatio={1}
  uploadButtonLabel="Upload Avatar"
/>
```

### Multiple File Upload with Metadata

```tsx
const metadataFields = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'category', label: 'Category', type: 'select', options: ['Art', 'Nature', 'Urban'] },
];

<FileUpload
  onUpload={handleGalleryUpload}
  accept={['image/jpeg', 'image/png', 'image/webp']}
  multiple={true}
  metadataFields={metadataFields}
  uploadButtonLabel="Upload to Gallery"
/>
```

### Document Upload

```tsx
<FileUpload
  onUpload={handleDocumentUpload}
  accept={['.pdf', '.doc', '.docx', '.txt']}
  multiple={true}
  showPreview={false}
  uploadButtonLabel="Upload Documents"
/>
```

### Error Handling

```tsx
const handleError = (error: string) => {
  console.error('Upload error:', error);
  // Show toast notification or handle error
};

<FileUpload
  onUpload={handleUpload}
  onError={handleError}
  accept="image/*"
/>
```

### Custom Styling

```tsx
<FileUpload
  onUpload={handleUpload}
  accept="image/*"
  className="max-w-md mx-auto"
  dragAreaClassName="border-2 border-purple-300 bg-purple-50 hover:border-purple-400"
  previewClassName="border-purple-200 bg-purple-50"
  uploadButtonLabel="Upload with Custom Style"
/>
```

## Hooks

The component uses several custom hooks that can be used independently:

### useFileUpload

Manages file state, validation, and upload logic.

```tsx
import { useFileUpload } from '@monorepo/fileupload';

const { state, actions } = useFileUpload(
  { accept: 'image/*', maxSizeMB: 10, multiple: true },
  onUpload
);
```

### useMetadataFields

Manages metadata form state and validation.

```tsx
import { useMetadataFields } from '@monorepo/fileupload';

const { state, actions } = useMetadataFields(metadataFields);
```

### useDragAndDrop

Handles drag and drop functionality.

```tsx
import { useDragAndDrop } from '@monorepo/fileupload';

const { state, actions } = useDragAndDrop();
```

### useUploadProgress

Tracks upload progress for individual files.

```tsx
import { useUploadProgress } from '@monorepo/fileupload';

const { state, actions } = useUploadProgress();
```

## Validation

The component includes built-in validation for:

- **File Type**: Validates against accepted file types
- **File Size**: Ensures files don't exceed maximum size
- **Required Fields**: Validates required metadata fields
- **Number Fields**: Validates numeric input for number fields

## Error Handling

The component provides comprehensive error handling:

- File validation errors are displayed inline
- Upload errors are passed to the `onError` callback
- Network errors are handled gracefully
- User-friendly error messages

## Accessibility

- Keyboard navigation support
- Screen reader friendly
- ARIA labels and descriptions
- Focus management

## Browser Support

- Modern browsers with ES6+ support
- File API support
- Drag and Drop API support

## Testing

Run the test suite:

```bash
pnpm test
```

The component includes comprehensive tests covering:

- File selection and validation
- Drag and drop functionality
- Metadata field handling
- Upload progress tracking
- Error scenarios
- Accessibility features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details. 