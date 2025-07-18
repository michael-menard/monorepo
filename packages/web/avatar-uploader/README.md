# Avatar Uploader Component

A reusable React component for avatar upload functionality with file validation, preview, and progress tracking.

## Features

- **File Validation**: Supports JPEG, JPG, HEIC, and PNG formats
- **Size Limits**: Maximum 20MB file size
- **Image Preview**: Shows selected image before upload
- **Progress Tracking**: Visual upload progress indicator
- **Error Handling**: Displays validation and upload errors
- **Accessibility**: ARIA labels and keyboard navigation support
- **Flexible**: Works with any backend API endpoint

## Installation

```bash
# From the monorepo root
pnpm add @monorepo/avatar-uploader
```

## Usage

```tsx
import AvatarUploader from '@monorepo/avatar-uploader';

function ProfilePage() {
  const handleSuccess = () => {
    console.log('Avatar uploaded successfully!');
  };

  const handleError = (error: Error) => {
    console.error('Upload failed:', error);
  };

  return (
    <AvatarUploader
      userId="user123"
      baseUrl="http://localhost:3000"
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `userId` | `string` | Yes | The user ID for the avatar upload |
| `baseUrl` | `string` | Yes | Base URL for the API endpoint (e.g., "http://localhost:3000") |
| `onSuccess` | `() => void` | No | Callback called when upload completes successfully |
| `onError` | `(error: Error) => void` | No | Callback called when upload fails |

## API Endpoint

The component expects a backend endpoint at `POST {baseUrl}/api/users/{userId}/avatar` that:

- Accepts multipart form data with an `avatar` field
- Returns 200 status on success
- Handles authentication via cookies (credentials: 'include')

## File Requirements

- **Supported formats**: JPEG, JPG, HEIC, PNG
- **Maximum size**: 20MB
- **Field name**: `avatar` (in FormData)

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Build the component
pnpm build
```

## Testing

The component includes comprehensive tests for:
- File validation
- Upload functionality
- Error handling
- User interactions
- Accessibility features

Run tests with:
```bash
pnpm test
```

## Storybook

View the component in Storybook:
```bash
pnpm storybook
```

The component is available in the Storybook with examples showing different usage patterns. 