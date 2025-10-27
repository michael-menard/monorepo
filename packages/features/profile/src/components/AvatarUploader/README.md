# AvatarUploader Component

A React component for uploading and cropping profile avatars with comprehensive validation and user-friendly interface.

## Features

- **Image Cropping**: Uses `react-easy-crop` for intuitive image cropping
- **File Validation**: Validates file type and size with customizable limits
- **Upload Progress**: Shows progress during upload processing
- **Error Handling**: Displays user-friendly error messages
- **Responsive Design**: Works on desktop and mobile devices
- **Accessibility**: Full keyboard navigation and screen reader support

## Props

```typescript
interface AvatarUploaderProps {
  currentAvatar?: string // Current avatar URL
  onUpload: (file: File) => void // Upload handler function
  onRemove?: () => void // Optional remove handler
  isLoading?: boolean // Loading state
  className?: string // Additional CSS classes
  maxFileSize?: number // Max file size in bytes (default: 5MB)
  acceptedFileTypes?: string[] // Allowed file types
  cropAspectRatio?: number // Crop aspect ratio (default: 1)
  cropShape?: 'rect' | 'round' // Crop shape (default: 'round')
}
```

## Usage

```tsx
import { AvatarUploader } from '@repo/profile'

function ProfilePage() {
  const [avatar, setAvatar] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)

  const handleUpload = async (file: File) => {
    setIsLoading(true)
    try {
      // Upload file to your server
      const response = await uploadAvatar(file)
      setAvatar(response.avatarUrl)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = () => {
    setAvatar(undefined)
  }

  return (
    <AvatarUploader
      currentAvatar={avatar}
      onUpload={handleUpload}
      onRemove={handleRemove}
      isLoading={isLoading}
      maxFileSize={5 * 1024 * 1024} // 5MB
      acceptedFileTypes={['image/jpeg', 'image/png', 'image/webp', 'image/heic']}
      cropAspectRatio={1}
      cropShape="round"
    />
  )
}
```

## File Validation

The component validates:

- **File Type**: JPEG, PNG, WebP, HEIC (configurable)
- **File Size**: Maximum 5MB by default (configurable)
- **File Instance**: Ensures valid File object

## Cropping Features

- **Zoom Control**: Slider to zoom in/out (1x to 3x)
- **Drag to Crop**: Click and drag to position crop area
- **Aspect Ratio**: Maintains square aspect ratio by default
- **Round/Rectangular**: Configurable crop shape

## Error Messages

- File size exceeds limit
- Invalid file type
- Upload processing errors
- File validation errors

## Dependencies

- `react-easy-crop`: Image cropping functionality
- `@repo/ui`: UI components (Button, Avatar, Dialog, Progress)
- `lucide-react`: Icons
- `zod`: Schema validation (optional, uses custom validation)

## Testing

The component includes comprehensive tests covering:

- File validation
- Upload functionality
- Error handling
- UI interactions
- Accessibility features

Run tests with:

```bash
pnpm test:run
```
