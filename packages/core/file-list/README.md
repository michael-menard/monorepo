# @repo/file-list

A generic, reusable file list component built with atomic design principles. Displays files in a clean data table format with customizable actions and configuration options.

## Features

- 🗂️ **Generic file display** - Works with any file data structure
- 📊 **Data table layout** - Clean, scannable table interface
- 🎨 **Customizable actions** - Flexible children-based action system
- 📱 **Responsive columns** - Different columns for different screen sizes
- 🔧 **Configurable layout** - Show/hide columns based on breakpoints
- 📱 **Mobile-first design** - Optimized for small screens
- 🎯 **Type-safe** - Built with Zod schemas and TypeScript
- 🎨 **Consistent styling** - Uses @repo/ui components

## Installation

```bash
pnpm add @repo/file-list
```

## Basic Usage

```tsx
import { FileList, FileActions, createCommonActions } from '@repo/file-list'

const files = [
  {
    id: '1',
    name: 'parts-list.csv',
    size: 1024,
    mimeType: 'text/csv',
    url: 'https://example.com/files/parts-list.csv',
    createdAt: new Date(),
  },
  // ... more files
]

function MyFileList() {
  const handleView = file => window.open(file.url, '_blank')
  const handleDownload = file => {
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.name
    link.click()
  }
  const handleDelete = file => console.log('Delete:', file.id)

  const actions = createCommonActions({
    onView: handleView,
    onDownload: handleDownload,
    onDelete: handleDelete,
  })

  return <FileList files={files}>{file => <FileActions file={file} actions={actions} />}</FileList>
}
```

## Advanced Usage

### Responsive Configuration

```tsx
<FileList
  files={files}
  config={{
    dateField: 'updatedAt',
    compact: true,
    emptyMessage: 'No parts lists uploaded yet',
    columns: {
      default: {
        icon: true,
        name: true,
        size: true,
        date: true,
        actions: true,
      },
      sm: {
        icon: true,
        name: true,
        size: false,
        date: false,
        actions: true,
      },
      md: {
        icon: true,
        name: true,
        size: true,
        date: false,
        actions: true,
      },
    },
  }}
>
  {file => (
    <div className="flex gap-1">
      <Button onClick={() => handleCustomAction(file)}>Custom Action</Button>
    </div>
  )}
</FileList>
```

### Responsive Design

The component automatically adapts to different screen sizes with a mobile-first approach:

```tsx
// Automatic responsive behavior - no configuration needed!
<FileList files={files}>{file => <FileActions file={file} actions={actions} />}</FileList>
```

**Mobile/Tablet (< 1024px):**

- Only file name and actions
- No table headers
- No icons
- Clean, minimal layout

**Desktop (≥ 1024px):**

- Full table with headers
- Icon, name, size, date, and actions
- Complete file information

**Breakpoint:**

- `lg`: 1024px (where the layout switches from mobile to desktop)

### Custom Actions

```tsx
const customActions = [
  {
    key: 'preview',
    config: {
      icon: 'Eye',
      tooltip: 'Preview file',
      variant: 'ghost',
    },
    onClick: file => openPreview(file),
  },
  {
    key: 'share',
    config: {
      icon: 'Share2',
      tooltip: 'Share file',
      variant: 'ghost',
    },
    onClick: file => shareFile(file),
  },
]

;<FileList files={files}>{file => <FileActions file={file} actions={customActions} />}</FileList>
```

### Data Normalization

The package includes utilities to normalize different file data structures:

```tsx
import { normalizeFileItem } from '@repo/file-list'

// Works with different API response formats
const apiFile = {
  fileId: '123',
  originalFilename: 'document.pdf',
  fileSize: 2048,
  contentType: 'application/pdf',
  downloadUrl: 'https://api.example.com/files/123',
  dateCreated: '2024-01-01T00:00:00Z',
}

const normalizedFile = normalizeFileItem(apiFile)
// Result: { id: '123', name: 'document.pdf', size: 2048, ... }
```

## API Reference

### FileList Props

| Prop          | Type                            | Default | Description                       |
| ------------- | ------------------------------- | ------- | --------------------------------- |
| `files`       | `FileItem[]`                    | -       | Array of files to display         |
| `config`      | `Partial<FileListConfig>`       | `{}`    | Configuration options             |
| `children`    | `(file: FileItem) => ReactNode` | -       | Render function for actions       |
| `onFileClick` | `(file: FileItem) => void`      | -       | Callback when file row is clicked |
| `className`   | `string`                        | `''`    | Additional CSS classes            |
| `loading`     | `boolean`                       | `false` | Loading state                     |
| `error`       | `string`                        | -       | Error message to display          |

### FileListConfig

| Property       | Type                         | Default       | Description                |
| -------------- | ---------------------------- | ------------- | -------------------------- |
| `showSize`     | `boolean`                    | `true`        | Show file size column      |
| `showDate`     | `boolean`                    | `true`        | Show date column           |
| `dateField`    | `'createdAt' \| 'updatedAt'` | `'createdAt'` | Which date to display      |
| `compact`      | `boolean`                    | `false`       | Use compact layout         |
| `emptyMessage` | `string`                     | -             | Custom empty state message |
| `showHeaders`  | `boolean`                    | `true`        | Show table headers         |

### FileItem Schema

```typescript
{
  id: string;              // Unique identifier
  name: string;            // Display name
  size?: number;           // File size in bytes
  mimeType?: string;       // MIME type
  extension?: string;      // File extension
  url: string;             // Download/access URL
  createdAt?: string | Date; // Creation date
  updatedAt?: string | Date; // Last modified date
  metadata?: Record<string, unknown>; // Additional data
}
```

## Integration Examples

### With MOC Parts Lists

```tsx
// In MocDetailPage
const partsListFiles =
  instruction.files?.filter(file => file.fileType === 'parts-list').map(normalizeFileItem) || []

;<FileList files={partsListFiles} config={{ emptyMessage: 'No parts lists uploaded yet' }}>
  {file => (
    <FileActions
      file={file}
      actions={createCommonActions({
        onView: file => window.open(file.url, '_blank'),
        onDownload: downloadFile,
        onDelete: deleteFile,
      })}
    />
  )}
</FileList>
```

### With Upload Integration

```tsx
// Combine with upload functionality
function FileManager() {
  const [files, setFiles] = useState([])

  return (
    <div>
      <UploadComponent onUpload={newFiles => setFiles([...files, ...newFiles])} />
      <FileList files={files}>
        {file => <FileActions file={file} actions={commonActions} />}
      </FileList>
    </div>
  )
}
```

## Styling

The component uses @repo/ui components and follows your design system. All styling is handled through Tailwind CSS classes and can be customized via the `className` prop.

## Contributing

This package follows atomic design principles and should remain generic and reusable. When adding features, ensure they don't introduce domain-specific logic.
