# FileUpload Migration Guide

> **⚠️ BREAKING CHANGE:**
> The FileUpload component is now fully hook-based. All internal state and logic (file selection, validation, drag-and-drop, metadata) are managed by custom hooks. See below for migration steps and examples.

---

## Quick Start

**Old usage:**
```tsx
<FileUpload onUpload={handleUpload} />
```

**New usage:**
```tsx
import { FileUpload } from '@repo/ui';

const handleUpload = async (files, metadata) => {
  // Your upload logic
};

<FileUpload onUpload={handleUpload} />
```

- All configuration is still via props, but the component now uses hooks internally for all logic.
- You no longer need to manage file state, drag/drop, or metadata state in your parent component.

---

## Legacy API vs. Hook API Comparison

| Feature                | Legacy (Pre-Refactor)         | New (Hook-Based)                |
|------------------------|-------------------------------|---------------------------------|
| File state             | useState in parent/component  | Managed by useFileUpload hook   |
| Metadata state         | useState in parent/component  | Managed by useMetadataFields    |
| Drag-and-drop state    | useState in parent/component  | Managed by useDragAndDrop       |
| Validation             | Custom logic in component     | Built-in via hooks              |
| Testing                | Test internal state           | Mock hooks in tests             |
| Customization          | Props                         | Props (same, but more robust)   |

---

## How to Migrate

1. **Remove all file/metadata/drag state from your parent component.**
   - You no longer need `useState` for files, metadata, or drag state.
   - Remove any custom file/metadata/drag handlers.

2. **Pass all configuration as props.**
   - `accept`, `maxSizeMB`, `multiple`, `metadataFields`, etc. are still props.
   - All validation and state is handled by the component.

3. **Update your upload handler.**
   - The `onUpload` callback receives `(files, metadata)`.
   - You do not need to clear state after upload; the component handles it.

4. **Update tests to mock hooks.**
   - See the Testing section below.

---

## Example Migration

**Before:**
```tsx
const [files, setFiles] = useState([]);
const [metadata, setMetadata] = useState({});
const [isDragging, setIsDragging] = useState(false);

const handleFileChange = (e) => setFiles([...files, ...e.target.files]);
const handleMetadataChange = (field, value) => setMetadata({ ...metadata, [field]: value });
const handleUpload = async () => { await uploadFiles(files, metadata); };

<FileUpload
  onUpload={handleUpload}
  accept="image/*"
  multiple
  // ...
/>
```

**After:**
```tsx
const handleUpload = async (files, metadata) => {
  await uploadFiles(files, metadata);
};

<FileUpload
  onUpload={handleUpload}
  accept="image/*"
  multiple
  // ...
/>
```

---

## Testing

**Mock the hooks in your tests:**
```tsx
import { vi } from 'vitest';

vi.mock('@repo/ui/src/FileUpload/hooks', () => ({
  useFileUpload: vi.fn(() => ({
    state: { files: [], isUploading: false, errors: [] },
    actions: { addFiles: vi.fn(), removeFile: vi.fn(), clearFiles: vi.fn(), upload: vi.fn(), validateFiles: vi.fn() }
  })),
  useMetadataFields: vi.fn(() => ({
    state: { values: {}, errors: {}, isValid: true },
    actions: { updateField: vi.fn(), validateField: vi.fn(), validateAll: vi.fn(), reset: vi.fn(), getFieldValue: vi.fn(), getFieldError: vi.fn() }
  })),
  useDragAndDrop: vi.fn(() => ({
    state: { isDragOver: false, isDragging: false },
    actions: { handleDragOver: vi.fn(), handleDragEnter: vi.fn(), handleDragLeave: vi.fn(), handleDrop: vi.fn(), dragAreaProps: { onDragOver: vi.fn(), onDragEnter: vi.fn(), onDragLeave: vi.fn(), onDrop: vi.fn() } }
  }))
}));
```

- You can now test rendering and prop behavior without worrying about internal state.

---

## Troubleshooting

- **Files not uploading?**
  - Ensure your `onUpload` callback is implemented and returns a Promise.
- **Validation errors?**
  - Check your `accept` and `maxSizeMB` props.
- **Metadata not working?**
  - Ensure your `metadataFields` prop is an array of objects with `name`, `label`, and `type`.
- **Styling issues?**
  - Use `className`, `dragAreaClassName`, and `previewClassName` props for customization.
- **Tests failing?**
  - Make sure you are mocking the hooks as shown above.

---

## See Also
- [FileUpload example usage](./example.tsx)
- [FileUpload tests](./__tests__/FileUpload.test.tsx) 