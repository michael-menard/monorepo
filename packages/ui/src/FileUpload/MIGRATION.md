# FileUpload Component Migration Guide

This guide helps you migrate from existing file upload implementations to the new shared `FileUpload` component that uses custom hooks for better separation of concerns and reusability.

## Overview

The new `FileUpload` component has been refactored to use custom hooks:
- `useFileUpload` - Handles file selection, validation, and upload state
- `useMetadataFields` - Manages metadata form fields and validation
- `useDragAndDrop` - Handles drag and drop interactions

This architecture provides better separation of concerns, easier testing, and more reusable logic.

## Installation

The `FileUpload` component is part of the `@repo/ui` package. Make sure it's installed in your project:

```bash
pnpm add @repo/ui
```

## Basic Migration

### Before (Old Implementation)
```tsx
// Old custom file upload component
const [files, setFiles] = useState([]);
const [isUploading, setIsUploading] = useState(false);
const [error, setError] = useState(null);

const handleFileChange = (event) => {
  const selectedFiles = Array.from(event.target.files);
  // Custom validation logic
  // Custom file handling
  setFiles(selectedFiles);
};

const handleUpload = async () => {
  setIsUploading(true);
  try {
    await uploadFiles(files);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsUploading(false);
  }
};

return (
  <div>
    <input type="file" onChange={handleFileChange} />
    {files.map(file => (
      <div key={file.name}>{file.name}</div>
    ))}
    <button onClick={handleUpload} disabled={isUploading}>
      {isUploading ? 'Uploading...' : 'Upload'}
    </button>
  </div>
);
```

### After (New Hook-Based Component)
```tsx
import { FileUpload } from '@repo/ui';

const MyComponent = () => {
  const handleUpload = async (files, metadata) => {
    // Your upload logic here
    await uploadFiles(files, metadata);
  };

  return (
    <FileUpload
      onUpload={handleUpload}
      accept="image/*"
      multiple={true}
      showPreview={true}
    />
  );
};
```

## Advanced Migration Examples

### 1. Avatar Upload with Cropping

#### Before
```tsx
const AvatarUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setIsCropping(true);
  };
  
  const handleCrop = (croppedFile) => {
    setSelectedFile(croppedFile);
    setIsCropping(false);
  };
  
  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileSelect} />
      {isCropping && (
        <ImageCropper file={selectedFile} onCrop={handleCrop} />
      )}
      {/* Upload logic */}
    </div>
  );
};
```

#### After
```tsx
import { FileUpload } from '@repo/ui';

const AvatarUpload = () => {
  const handleUpload = async (file) => {
    // Handle single file upload for avatar
    await uploadAvatar(file);
  };

  return (
    <FileUpload
      onUpload={handleUpload}
      accept="image/*"
      multiple={false}
      showPreview={true}
      mode="avatar"
      uploadButtonLabel="Upload Avatar"
    />
  );
};
```

### 2. Gallery Upload with Metadata

#### Before
```tsx
const GalleryUpload = () => {
  const [files, setFiles] = useState([]);
  const [metadata, setMetadata] = useState({});
  
  const handleFilesChange = (newFiles) => {
    setFiles([...files, ...newFiles]);
  };
  
  const handleMetadataChange = (field, value) => {
    setMetadata({ ...metadata, [field]: value });
  };
  
  const handleUpload = async () => {
    await uploadGallery(files, metadata);
  };
  
  return (
    <div>
      <input type="file" multiple onChange={handleFilesChange} />
      {files.map(file => (
        <div key={file.name}>{file.name}</div>
      ))}
      <input
        placeholder="Title"
        value={metadata.title || ''}
        onChange={(e) => handleMetadataChange('title', e.target.value)}
      />
      <select
        value={metadata.category || ''}
        onChange={(e) => handleMetadataChange('category', e.target.value)}
      >
        <option value="">Select Category</option>
        <option value="art">Art</option>
        <option value="nature">Nature</option>
      </select>
      <button onClick={handleUpload}>Upload Gallery</button>
    </div>
  );
};
```

#### After
```tsx
import { FileUpload } from '@repo/ui';

const GalleryUpload = () => {
  const handleUpload = async (files, metadata) => {
    await uploadGallery(files, metadata);
  };

  const metadataFields = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'category', label: 'Category', type: 'select', options: ['Art', 'Nature', 'Urban'], required: true },
    { name: 'description', label: 'Description', type: 'text' }
  ];

  return (
    <FileUpload
      onUpload={handleUpload}
      accept="image/*"
      multiple={true}
      showPreview={true}
      metadataFields={metadataFields}
      uploadButtonLabel="Upload to Gallery"
    />
  );
};
```

### 3. Document Upload with Validation

#### Before
```tsx
const DocumentUpload = () => {
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState([]);
  
  const validateFiles = (newFiles) => {
    const newErrors = [];
    newFiles.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        newErrors.push(`${file.name} is too large`);
      }
      if (!['application/pdf', 'text/plain'].includes(file.type)) {
        newErrors.push(`${file.name} is not a supported format`);
      }
    });
    setErrors(newErrors);
    return newErrors.length === 0;
  };
  
  const handleFilesChange = (newFiles) => {
    if (validateFiles(newFiles)) {
      setFiles([...files, ...newFiles]);
    }
  };
  
  return (
    <div>
      <input type="file" accept=".pdf,.txt" multiple onChange={handleFilesChange} />
      {errors.map(error => (
        <div key={error} className="error">{error}</div>
      ))}
      {files.map(file => (
        <div key={file.name}>{file.name}</div>
      ))}
    </div>
  );
};
```

#### After
```tsx
import { FileUpload } from '@repo/ui';

const DocumentUpload = () => {
  const handleUpload = async (files) => {
    await uploadDocuments(files);
  };

  const handleError = (error) => {
    console.error('Upload error:', error);
    // Show error notification
  };

  return (
    <FileUpload
      onUpload={handleUpload}
      onError={handleError}
      accept={['application/pdf', 'text/plain']}
      maxSizeMB={10}
      multiple={true}
      showPreview={true}
      uploadButtonLabel="Upload Documents"
    />
  );
};
```

## Component-Specific Migration

### Migrating from Existing File Upload Components

If you have existing file upload components in your codebase, follow these steps:

1. **Identify the component's purpose** (avatar, gallery, document upload, etc.)
2. **Map existing props to new FileUpload props**:
   - `onChange` → `onUpload`
   - `accept` → `accept`
   - `multiple` → `multiple`
   - Custom validation → Built-in validation with `maxSizeMB` and `accept`
   - Custom metadata fields → `metadataFields` prop

3. **Update the parent component** to use the new `onUpload` callback
4. **Remove custom state management** - the hooks handle this internally
5. **Update tests** to mock the hooks instead of testing internal state

### Testing Migration

#### Before (Testing Internal State)
```tsx
test('handles file selection', () => {
  render(<MyFileUpload onUpload={mockUpload} />);
  
  const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
  const input = screen.getByRole('button', { name: /browse/i });
  
  fireEvent.click(input);
  // Complex setup to simulate file selection
  // Test internal state changes
});
```

#### After (Testing with Hook Mocks)
```tsx
import { vi } from 'vitest';

// Mock the hooks
vi.mock('@repo/ui', async () => {
  const actual = await vi.importActual('@repo/ui');
  return {
    ...actual,
    useFileUpload: vi.fn(),
    useMetadataFields: vi.fn(),
    useDragAndDrop: vi.fn(),
  };
});

test('handles file selection', () => {
  const mockAddFiles = vi.fn();
  mockUseFileUpload.mockReturnValue({
    state: { files: [], isUploading: false, errors: [] },
    actions: { addFiles: mockAddFiles }
  });
  
  render(<FileUpload onUpload={mockUpload} />);
  
  // Test that the hook is called correctly
  expect(mockUseFileUpload).toHaveBeenCalledWith(
    expect.objectContaining({ accept: 'image/*' }),
    mockUpload
  );
});
```

## Benefits of the New Architecture

1. **Separation of Concerns**: File handling, metadata, and drag-and-drop are separate hooks
2. **Reusability**: Hooks can be used independently in other components
3. **Easier Testing**: Each hook can be tested in isolation
4. **Better TypeScript Support**: Each hook has its own well-defined types
5. **Consistent API**: All file uploads across your app use the same interface
6. **Built-in Validation**: File type and size validation handled automatically
7. **Error Handling**: Centralized error handling with customizable error callbacks

## Troubleshooting

### Common Issues

1. **Files not uploading**: Check that your `onUpload` callback is properly implemented
2. **Validation errors**: Ensure `accept` and `maxSizeMB` props match your requirements
3. **Metadata not working**: Verify that `metadataFields` array is properly structured
4. **Styling issues**: Use `className`, `dragAreaClassName`, and `previewClassName` for customization

### Getting Help

If you encounter issues during migration:
1. Check the component's TypeScript interfaces for prop requirements
2. Review the example usage in `example.tsx`
3. Run the test suite to see expected behavior
4. Check that all required dependencies are installed 