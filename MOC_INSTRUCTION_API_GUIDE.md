# MOC Instruction API Guide

## Overview

The MOC (My Own Creation) Instruction API has been updated to match your UI requirements:

- **Title** (required)
- **Description** (optional)
- **Instructions Files** (required) - 1 or more PDF or .io files
- **Parts Lists** (optional) - 0 to 10 files (CSV, XML, JSON, PDF, TXT)
- **Images** (optional) - 0 to 3 images (JPEG, PNG, WebP)

## Database Tables

### Current Tables
- `users` - User profiles
- `moc_instructions` - MOC metadata
- `moc_files` - Associated files (instructions, parts lists, images)

### Storage Configuration
- **Development**: Files stored locally in `uploads/moc-files/`
- **Production**: Files stored in S3 bucket

## API Endpoints

### 1. Create MOC (Metadata Only)
```
POST /api/mocs
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "My LEGO Castle",
  "description": "A medieval castle with working drawbridge",
  "tags": ["castle", "medieval", "architecture"]
}
```

### 2. Create MOC with Files
```
POST /api/mocs/with-files
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form fields:
- title: string (required)
- description: string (optional)
- tags: JSON array (optional)
- instructionsFile: file[] (required) - 1 or more PDF or .io files
- partsLists: file[] (optional) - 0-10 files
- images: file[] (optional) - 0-3 images
```

## File Validation

### Instructions Files (Required)
- **Formats**: PDF, .io
- **Max size**: 50MB per file
- **Quantity**: 1 or more files (up to 10)

### Parts Lists (Optional)
- **Formats**: CSV, XML, JSON, PDF, TXT
- **Max size**: 10MB per file
- **Quantity**: 0-10 files

### Images (Optional)
- **Formats**: JPEG, PNG, WebP
- **Max size**: 10MB per file
- **Quantity**: 0-3 files
- **Note**: First image becomes the thumbnail

## Updated Zod Schemas

### CreateMocWithFilesSchema
```typescript
export const CreateMocWithFilesSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
});
```

### File Validation Schemas
```typescript
// Instructions file validation
export const MocInstructionFileSchema = z.object({
  originalname: z.string(),
  mimetype: z.enum(['application/pdf', 'application/octet-stream']),
  size: z.number().max(50 * 1024 * 1024), // 50MB
}).refine((file) => {
  return file.mimetype === 'application/pdf' || file.originalname.endsWith('.io');
});

// Parts list file validation
export const MocPartsListFileSchema = z.object({
  originalname: z.string(),
  mimetype: z.enum(['text/csv', 'application/xml', 'application/json', 'application/pdf', 'text/plain']),
  size: z.number().max(10 * 1024 * 1024), // 10MB
});

// Gallery image validation
export const MocGalleryImageSchema = z.object({
  originalname: z.string(),
  mimetype: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  size: z.number().max(10 * 1024 * 1024), // 10MB
});
```

## Testing

### Get Test Token
```bash
curl -X POST http://localhost:9000/api/mocs/test-auth
```

### Create MOC with Metadata
```bash
curl -X POST http://localhost:9000/api/mocs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "My Awesome Castle",
    "description": "A detailed medieval castle",
    "tags": ["castle", "medieval"]
  }'
```

### Create MOC with Files
```bash
curl -X POST http://localhost:9000/api/mocs/with-files \
  -H "Authorization: Bearer <token>" \
  -F "title=My Castle with Instructions" \
  -F "description=Complete building guide" \
  -F "instructionsFile=@instructions-part1.pdf" \
  -F "instructionsFile=@instructions-part2.pdf" \
  -F "instructionsFile=@instructions.io" \
  -F "partsLists=@parts-list.csv" \
  -F "images=@castle-front.jpg" \
  -F "images=@castle-side.jpg"
```

## File Storage Structure

### Local Development
```
uploads/moc-files/
├── {userId}/
│   ├── instructions/
│   │   └── castle-instructions-{uuid}.pdf
│   ├── parts-lists/
│   │   └── parts-list-{uuid}.csv
│   └── images/
│       ├── castle-front-{uuid}.jpg
│       └── castle-side-{uuid}.jpg
```

### Production (S3)
```
s3://bucket/moc-files/
├── {userId}/
│   ├── {mocId}/
│   │   ├── instruction/
│   │   ├── parts-list/
│   │   └── gallery-image/
```

## Response Format

```json
{
  "message": "MOC created successfully with files",
  "moc": {
    "id": "uuid",
    "userId": "uuid", 
    "title": "My Castle",
    "description": "A medieval castle",
    "tags": ["castle", "medieval"],
    "thumbnailUrl": "/uploads/moc-files/user/images/castle-front.jpg",
    "createdAt": "2025-01-06T...",
    "updatedAt": "2025-01-06T...",
    "files": [
      {
        "id": "uuid",
        "fileType": "instruction",
        "fileUrl": "/uploads/moc-files/user/instructions/castle-instructions.pdf",
        "originalFilename": "castle-instructions.pdf",
        "mimeType": "application/pdf"
      }
    ]
  }
}
```

## Next Steps

1. **Test the API** using the provided test script: `node test-create-moc.js`
2. **Update your frontend** to use the new `/with-files` endpoint
3. **Add file validation** on the frontend to match server requirements
4. **Configure S3** for production file storage
5. **Add error handling** for file upload failures

## Notes

- At least one `instructionsFile` is required for the `/with-files` endpoint (up to 10 allowed)
- Images and parts lists are optional
- First uploaded image becomes the thumbnail automatically
- Files are stored locally in development, S3 in production
- All file uploads are validated for type, size, and quantity limits
- Multiple instruction files can be uploaded for complex MOCs (e.g., separate PDFs for different building stages)
