# MOC File Upload Functionality

## Overview

The MOC File Upload functionality allows users to upload PDF instructions and Stud.io (.io) files to the MOC Instructions Detail Page. This feature enables users to reference these files later when building their LEGO MOCs.

## Features

### Core Functionality

- **File Upload**: Upload PDF and .io files with title, description, and optional thumbnail
- **File Management**: View, download, and delete uploaded files
- **File Validation**: Client-side validation for file type and size
- **Progress Tracking**: Visual feedback during upload process
- **Error Handling**: Graceful error handling with user-friendly messages

### Supported File Types

- **PDF Files**: `application/pdf` - For instruction manuals and documentation
- **Stud.io Files**: `.io` extension - For Stud.io model files

### File Size Limits

- **Maximum File Size**: 50MB per file
- **Thumbnail Images**: 10MB maximum (JPEG, PNG, WebP)

## User Interface

### Upload Button

The upload button is located in the Instructions tab and features:

- **Label**: "Upload Instructions"
- **Styling**: Primary button, large size, full width, rounded, shadowed
- **Position**: Near the header for the list of MOC Instructions

### Upload Dialog

The upload dialog includes:

- **Title Field**: Required field for file title
- **Description Field**: Optional field for file description
- **File Selection**: Drag-and-drop or click-to-select interface
- **Thumbnail Upload**: Optional thumbnail image upload
- **Validation**: Real-time validation feedback

### File Display

Uploaded files are displayed with:

- **Thumbnail**: Custom thumbnail or default file icon
- **File Information**: Title, description, file type, size, download count
- **Actions**: Download and delete buttons
- **Metadata**: File type badge, size, and download statistics

## Technical Implementation

### Backend Integration

The file upload functionality integrates with the backend through RTK Query:

```typescript
// API Endpoints
useGetInstructionsFilesQuery(id) // Fetch uploaded files
useUploadInstructionsFileMutation() // Upload new files
useDeleteInstructionsFileMutation() // Delete files
```

### Data Flow

1. **File Selection**: User selects file through dialog
2. **Validation**: Client-side validation of file type and size
3. **Upload**: File uploaded to backend with metadata
4. **Storage**: File stored in cloud storage (S3/Cloudflare)
5. **Database**: File metadata stored in database
6. **UI Update**: File list updated via RTK Query cache

### File Validation

```typescript
// File type validation
validateInstructionFileType(file: File): boolean

// File size validation
validateFileSize(file: File, maxSizeMB: number): boolean

// File type detection
getFileTypeLabel(file: File): string
```

### Error Handling

- **Network Errors**: Retry mechanism with user feedback
- **Validation Errors**: Clear error messages for invalid files
- **Upload Failures**: Graceful degradation with retry options

## Testing Strategy

### Unit Tests

- File upload dialog rendering
- Form validation
- File type and size validation
- API integration
- Error handling

### UX Tests

- User interaction flows
- Accessibility compliance
- Responsive design
- Loading states
- Error recovery

### Performance Tests

- Large file handling
- Multiple file uploads
- Memory usage optimization
- Network performance

### Security Tests

- File type validation
- File size limits
- Malicious file prevention
- Input sanitization

### Accessibility Tests

- ARIA compliance
- Keyboard navigation
- Screen reader support
- Focus management

### End-to-End Tests

- Complete upload workflow
- File management operations
- Error scenarios
- Cross-browser compatibility

## API Schema

### Upload Request

```typescript
interface MockInstructionFileUpload {
  file: File
  title: string
  description?: string
  thumbnailImage?: File
  instructionsId: string
}
```

### File Response

```typescript
interface MockInstructionFile {
  id: string
  instructionsId: string
  title: string
  description?: string
  fileName: string
  fileUrl: string
  fileType: 'pdf' | 'io'
  fileSize: number
  thumbnailUrl?: string
  downloadCount: number
  createdAt: Date
  updatedAt: Date
}
```

## Configuration

### Environment Variables

```env
# File upload configuration
MAX_FILE_SIZE_MB=50
MAX_THUMBNAIL_SIZE_MB=10
ALLOWED_FILE_TYPES=pdf,io
```

### Storage Configuration

- **Primary Storage**: AWS S3 or Cloudflare R2
- **CDN**: Cloudflare or Vercel Assets
- **Backup**: Local storage for development

## Performance Optimizations

### Client-Side

- **Lazy Loading**: Files loaded on demand
- **Image Compression**: Automatic thumbnail compression
- **Debounced Inputs**: Optimized form interactions
- **Virtual Scrolling**: Efficient rendering of large file lists

### Server-Side

- **Chunked Uploads**: Large file upload support
- **Background Processing**: Async file processing
- **Caching**: CDN caching for file downloads
- **Compression**: Automatic file compression

## Security Considerations

### File Validation

- **Type Checking**: MIME type and extension validation
- **Size Limits**: Strict file size enforcement
- **Content Scanning**: Malware scanning for uploaded files
- **Access Control**: User-based file access permissions

### Data Protection

- **Encryption**: Files encrypted at rest
- **Secure URLs**: Time-limited download URLs
- **Audit Logging**: File access and modification logs
- **Backup**: Regular file backup procedures

## Browser Support

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## Future Enhancements

### Planned Features

- **Batch Upload**: Multiple file upload support
- **File Versioning**: Version control for uploaded files
- **Advanced Search**: File content search and filtering
- **Collaboration**: Shared file access and permissions
- **Integration**: Third-party storage provider support

### Performance Improvements

- **Progressive Upload**: Streaming file uploads
- **Smart Caching**: Intelligent file caching strategies
- **Compression**: Advanced file compression algorithms
- **CDN Optimization**: Multi-region CDN deployment

## Troubleshooting

### Common Issues

1. **File Upload Fails**
   - Check file size and type
   - Verify network connection
   - Clear browser cache

2. **Slow Upload Speed**
   - Check network bandwidth
   - Try smaller file sizes
   - Use wired connection

3. **File Not Displaying**
   - Refresh page
   - Check file permissions
   - Verify file format

### Debug Information

Enable debug logging for troubleshooting:

```typescript
// Enable debug mode
localStorage.setItem('debug', 'file-upload:*')
```

## Contributing

### Development Setup

1. Install dependencies
2. Configure environment variables
3. Set up local storage
4. Run development server

### Testing

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:ux
pnpm test:performance
pnpm test:security
pnpm test:accessibility
pnpm test:e2e
```

### Code Standards

- Follow TypeScript best practices
- Use Zod for schema validation
- Implement comprehensive error handling
- Write thorough test coverage
- Follow accessibility guidelines

## License

This file upload functionality is part of the LEGO MOC Instructions application and follows the same licensing terms as the main project.
