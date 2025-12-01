# @monorepo/file-validator

A universal file validation library that works in both browser and Node.js environments. Provides consistent file validation logic with support for MIME types, file extensions, magic bytes, and custom validators.

## Features

- 🌐 **Universal**: Works in both browser and Node.js environments
- 🔒 **Secure**: Magic bytes validation for enhanced security
- 🎯 **Flexible**: Configurable validation rules and custom validators
- 🚀 **Fast**: Optimized for performance with minimal dependencies
- 📦 **Multer Integration**: Ready-to-use Multer configurations
- 🎨 **TypeScript**: Full TypeScript support with comprehensive types

## Installation

```bash
npm install @monorepo/file-validator
# or
yarn add @monorepo/file-validator
# or
pnpm add @monorepo/file-validator
```

## Quick Start

### Browser Usage

```typescript
import { validateFile, createImageValidationConfig } from '@monorepo/file-validator'

// Validate an image file
const config = createImageValidationConfig(5 * 1024 * 1024) // 5MB max
const result = validateFile(file, config)

if (!result.isValid) {
  console.error('Validation errors:', result.errors)
}
```

### Node.js/Express with Multer

```typescript
import { createLegoPartsListMulterConfig } from '@monorepo/file-validator/multer'

// Create a Multer configuration for LEGO parts lists
const upload = createLegoPartsListMulterConfig('uploads/moc-files', req => req.user?.id)

app.post('/upload-parts-list', upload.single('partsListFile'), (req, res) => {
  // File is automatically validated
  res.json({ message: 'File uploaded successfully' })
})
```

## Predefined File Types

The library comes with predefined configurations for common file types:

- **Images**: JPEG, PNG, WebP, HEIC
- **Documents**: PDF, Text files
- **Data**: CSV, JSON, XML
- **LEGO-specific**: Instructions (PDF, .io), Parts lists (CSV, JSON, XML, TXT)

## Configuration Examples

### Custom Validation Config

```typescript
import { validateFile, FILE_TYPES } from '@monorepo/file-validator'

const config = {
  allowedTypes: ['image-jpeg', 'image-png'],
  maxSize: 10 * 1024 * 1024, // 10MB
  requireExtensionMatch: true,
  allowMimeTypeFallback: true,
}

const result = validateFile(file, config)
```

### Custom File Type

```typescript
import { validateFile } from '@monorepo/file-validator'

const customTypes = {
  'my-custom-type': {
    name: 'My Custom File',
    mimeTypes: ['application/x-custom'],
    extensions: ['.custom'],
    maxSize: 5 * 1024 * 1024,
  },
}

const result = validateFile(
  file,
  {
    allowedTypes: ['my-custom-type'],
  },
  {
    environment: 'browser',
    customTypes,
  },
)
```

## API Reference

### Core Functions

- `validateFile(file, config, context?)` - Main validation function
- `validateFileTypes(file, allowedTypes, context)` - Validate against specific file types
- `validateMagicBytes(buffer, mimeType)` - Validate file content using magic bytes

### Preset Configurations

- `createImageValidationConfig(maxSize?)` - For image files
- `createDocumentValidationConfig(maxSize?)` - For document files
- `createLegoInstructionValidationConfig()` - For LEGO instruction files
- `createLegoPartsListValidationConfig()` - For LEGO parts list files

### Multer Integration

- `createMulterFileFilter(config, options?)` - Create Multer file filter
- `createImageMulterConfig(uploadDir, maxSize?)` - Complete Multer config for images
- `createLegoPartsListMulterConfig(uploadDir, getUserId)` - Complete Multer config for parts lists

## Error Codes

- `FILE_REQUIRED` - File is required but not provided
- `FILE_TOO_LARGE` - File exceeds maximum size limit
- `FILE_TOO_SMALL` - File is below minimum size requirement
- `INVALID_FILE_TYPE` - File type is not in allowed types list
- `INVALID_MIME_TYPE` - MIME type is not allowed
- `INVALID_EXTENSION` - File extension is not allowed
- `MIME_TYPE_EXTENSION_MISMATCH` - Extension doesn't match MIME type

## Migration Guide

### From Manual Validation

**Before:**

```typescript
// Scattered validation logic
const allowedTypes = ['text/csv', 'application/json']
if (!allowedTypes.includes(file.mimetype)) {
  throw new Error('Invalid file type')
}
if (file.size > 10 * 1024 * 1024) {
  throw new Error('File too large')
}
```

**After:**

```typescript
import { validateFile, createLegoPartsListValidationConfig } from '@monorepo/file-validator'

const config = createLegoPartsListValidationConfig()
const result = validateFile(file, config)

if (!result.isValid) {
  throw new Error(result.errors.map(e => e.message).join('; '))
}
```

## License

MIT
