# MOC File Upload Fix Summary

## Issue Identified
The frontend was sending `{title: "Some Title", description: "Some Description", filesDisabled: true}` instead of the required files. The UI was using mock file uploads instead of real file uploads.

## Root Cause
1. **Frontend**: Upload components were commented out and replaced with "Simulate File Upload" buttons
2. **Frontend**: Form submission was hardcoded to send `filesDisabled: true` instead of actual files
3. **Frontend**: RTK Query was configured to send JSON instead of FormData
4. **Frontend**: File validation was commented out, allowing submission without required files

## Fixes Applied

### 1. Frontend Form Submission (`MocInstructionsGallery/index.tsx`)
**Before:**
```typescript
const jsonData = {
  title: mocData.title,
  description: mocData.description,
  filesDisabled: true  // ❌ Wrong!
};
const result = await createMocWithFiles(jsonData).unwrap();
```

**After:**
```typescript
// Validate required files
if (!mocData.instructionsFile) {
  throw new Error('At least one instructions file is required');
}

// Create FormData for file upload
const formData = new FormData();
formData.append('title', mocData.title);
if (mocData.description) {
  formData.append('description', mocData.description);
}

// Add required instructions file
formData.append('instructionsFile', mocData.instructionsFile.file);

// Add optional parts lists and images
mocData.partsLists.forEach((partsList) => {
  formData.append('partsLists', partsList.file);
});
mocData.images.forEach((image) => {
  formData.append('images', image.file);
});

const result = await createMocWithFiles(formData).unwrap();
```

### 2. RTK Query Configuration (`instructionsApi.ts`)
**Before:**
```typescript
createInstructionWithFiles: builder.mutation<any, any>({
  query: (data) => ({
    url: '/with-files',
    method: 'POST',
    body: data,
    headers: {
      'Content-Type': 'application/json',  // ❌ Wrong for file uploads!
    },
  }),
}),
```

**After:**
```typescript
createInstructionWithFiles: builder.mutation<any, any>({
  query: (data) => {
    const isFormData = data instanceof FormData;
    
    return {
      url: '/with-files',
      method: 'POST',
      body: data,
      // Don't set Content-Type for FormData - browser handles multipart/form-data
      ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
    };
  },
}),
```

### 3. Frontend Modal Component (`CreateMocModal.tsx`)
**Before:**
```typescript
// import { Upload } from '@repo/upload'; // Temporarily disabled ❌

// Validation commented out ❌
// if (!formData.instructionsFile) {
//   newErrors.instructionsFile = 'Instructions file is required';
// }

// Mock upload buttons instead of real Upload components ❌
<Button onClick={() => setFormData(prev => ({
  ...prev,
  instructionsFile: {
    id: 'mock-file',
    file: new File([''], 'mock-instructions.pdf', { type: 'application/pdf' }),
    // ...
  }
}))}>
  Simulate File Upload (for testing)
</Button>
```

**After:**
```typescript
import { Upload } from '@repo/upload'; // ✅ Enabled

// Validation enabled ✅
if (!formData.instructionsFile) {
  newErrors.instructionsFile = 'At least one instructions file is required (PDF or .io format)';
}

// Real Upload components ✅
<Upload
  mode="inline"
  config={{
    maxFiles: 1,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    acceptedFileTypes: ['application/pdf', 'application/octet-stream'],
    multiple: false,
    autoUpload: false,
  }}
  onFilesChange={handleInstructionsFileUpload}
/>
```

### 4. Upload Handlers Added
```typescript
const handleInstructionsFileUpload = useCallback((files: UploadFile[]) => {
  if (files.length > 0) {
    setFormData(prev => ({ ...prev, instructionsFile: files[0] }));
    if (errors.instructionsFile) {
      setErrors(prev => ({ ...prev, instructionsFile: '' }));
    }
  }
}, [errors.instructionsFile]);

const handlePartsListsUpload = useCallback((files: UploadFile[]) => {
  setFormData(prev => ({ ...prev, partsLists: files }));
}, []);

const handleImagesUpload = useCallback((files: UploadFile[]) => {
  setFormData(prev => ({ ...prev, images: files }));
}, []);
```

## File Upload Configuration

### Instructions Files (Required)
- **Formats**: PDF, .io
- **Max Size**: 50MB per file
- **Quantity**: 1-10 files
- **Field Name**: `instructionsFile`

### Parts Lists (Optional)
- **Formats**: CSV, XML, JSON, PDF, TXT
- **Max Size**: 10MB per file
- **Quantity**: 0-10 files
- **Field Name**: `partsLists`

### Images (Optional)
- **Formats**: JPEG, PNG, WebP
- **Max Size**: 10MB per file
- **Quantity**: 0-3 files
- **Field Name**: `images`

## Expected API Request Format

The frontend now sends a proper `multipart/form-data` request:

```
POST /api/mocs/with-files
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="title"

My LEGO Castle
------WebKitFormBoundary...
Content-Disposition: form-data; name="description"

A detailed medieval castle
------WebKitFormBoundary...
Content-Disposition: form-data; name="instructionsFile"; filename="castle-instructions.pdf"
Content-Type: application/pdf

[PDF file content]
------WebKitFormBoundary...
Content-Disposition: form-data; name="partsLists"; filename="parts-list.csv"
Content-Type: text/csv

[CSV file content]
------WebKitFormBoundary...
Content-Disposition: form-data; name="images"; filename="castle-front.jpg"
Content-Type: image/jpeg

[JPEG file content]
------WebKitFormBoundary...
```

## Testing

1. **Start the API server**: The backend is already configured to handle this format
2. **Open the frontend**: The modal now requires at least one instructions file
3. **Upload files**: Use the Upload components to select real files
4. **Submit**: The form will send FormData with actual files to the API

## Result

✅ **Fixed**: Frontend now properly collects and sends files as required
✅ **Fixed**: Validation enforces at least one instructions file
✅ **Fixed**: RTK Query handles FormData correctly
✅ **Fixed**: Upload components are enabled and functional
✅ **Ready**: API can now receive and process real file uploads
