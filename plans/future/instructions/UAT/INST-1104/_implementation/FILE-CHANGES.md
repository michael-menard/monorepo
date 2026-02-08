# File Changes - INST-1104

**Story**: Upload Instructions (Direct ≤10MB)
**Phase**: Planning
**Date**: 2026-02-07

---

## Files to Modify

### 1. apps/api/lego-api/core/utils/file-validation.ts

**Lines to modify**: 21-42 (constants), 88-130 (validation functions)

**Changes**:

#### Add PDF Constants (after line 21)
```typescript
/**
 * Allowed MIME types for PDF uploads (whitelist).
 */
export const ALLOWED_PDF_MIME_TYPES = ['application/pdf'] as const

/**
 * Allowed file extensions for PDF uploads (whitelist).
 */
export const ALLOWED_PDF_EXTENSIONS = ['.pdf'] as const
```

#### Update ValidationResult Schema (line 58)
```typescript
export const ValidationResultSchema = z.discriminatedUnion('valid', [
  z.object({
    valid: z.literal(true),
  }),
  z.object({
    valid: z.literal(false),
    error: z.string(),
    code: z.enum([
      'INVALID_MIME_TYPE',
      'INVALID_EXTENSION',  // NEW
      'FILE_TOO_LARGE',
      'FILE_TOO_SMALL',
      'MISSING_MIME_TYPE',
      'MISSING_FILE_SIZE',
      'MISSING_EXTENSION',  // NEW
    ]),
  }),
])
```

#### Add PDF Validation Functions (after line 192)
```typescript
/**
 * Validates a PDF MIME type against the allowed whitelist.
 *
 * @param mimeType - The MIME type to validate
 * @returns ValidationResult indicating if the MIME type is PDF
 *
 * @example
 * const result = validatePdfMimeType('application/pdf')
 * // { valid: true }
 */
export function validatePdfMimeType(mimeType: string | undefined | null): ValidationResult {
  if (!mimeType || mimeType.trim() === '') {
    return {
      valid: false,
      error: 'MIME type is required',
      code: 'MISSING_MIME_TYPE',
    }
  }

  const normalizedType = mimeType.toLowerCase().trim()

  if (ALLOWED_PDF_MIME_TYPES.includes(normalizedType as any)) {
    return { valid: true }
  }

  return {
    valid: false,
    error: 'Only PDF files are allowed',
    code: 'INVALID_MIME_TYPE',
  }
}

/**
 * Validates a PDF file extension.
 *
 * @param filename - The filename to validate
 * @returns ValidationResult indicating if the extension is .pdf
 *
 * @example
 * const result = validatePdfExtension('instructions.pdf')
 * // { valid: true }
 */
export function validatePdfExtension(filename: string | undefined | null): ValidationResult {
  if (!filename || filename.trim() === '') {
    return {
      valid: false,
      error: 'Filename is required',
      code: 'MISSING_EXTENSION',
    }
  }

  const extension = filename.toLowerCase().match(/\.[^.]+$/)?.[0]

  if (!extension) {
    return {
      valid: false,
      error: 'File has no extension',
      code: 'INVALID_EXTENSION',
    }
  }

  if (ALLOWED_PDF_EXTENSIONS.includes(extension as any)) {
    return { valid: true }
  }

  return {
    valid: false,
    error: 'Only .pdf file extension is allowed',
    code: 'INVALID_EXTENSION',
  }
}

/**
 * Validates a PDF file (MIME type, extension, and size).
 *
 * @param mimeType - The MIME type to validate
 * @param filename - The filename to validate
 * @param sizeBytes - The file size in bytes
 * @returns ValidationResult indicating if all checks pass
 *
 * @example
 * const result = validatePdfFile('application/pdf', 'file.pdf', 5000000)
 * // { valid: true }
 */
export function validatePdfFile(
  mimeType: string | undefined | null,
  filename: string | undefined | null,
  sizeBytes: number | undefined | null,
): ValidationResult {
  // Check MIME type first
  const mimeResult = validatePdfMimeType(mimeType)
  if (!mimeResult.valid) {
    return mimeResult
  }

  // Check extension
  const extensionResult = validatePdfExtension(filename)
  if (!extensionResult.valid) {
    return extensionResult
  }

  // Check file size
  return validateFileSize(sizeBytes)
}
```

**Acceptance Criteria**: AC72 (Backend uses validatePdfFile() utility)

---

### 2. apps/api/lego-api/domains/instructions/application/services.ts

**Lines to modify**: 238-252 (validation section)

**Changes**:

#### Import validation utilities (add to imports at top of file)
```typescript
import {
  validatePdfFile,
  createSecurityEvent,
  logSecurityEvent,
  MAX_FILE_SIZE,
} from '../../../core/utils/file-validation'
```

#### Replace validation logic (lines 237-252)

**BEFORE**:
```typescript
// Validate file type
const allowedTypes = [
  'application/pdf',
  'application/x-studio',
  'application/x-lxf',
  'application/x-ldraw',
]
if (!allowedTypes.includes(file.mimetype) && !file.mimetype.startsWith('application/')) {
  return err('INVALID_FILE')
}

// Validate file size (100MB max for instructions)
const maxSize = 100 * 1024 * 1024
if (file.size > maxSize) {
  return err('INVALID_FILE')
}
```

**AFTER**:
```typescript
// Validate PDF file (AC72: Use validatePdfFile utility)
// AC73: Enforce 10MB limit for direct upload (100MB is for presigned upload in INST-1105)
const validation = validatePdfFile(file.mimetype, file.filename, file.size)
if (!validation.valid) {
  // AC36: Security logging for rejected uploads
  logSecurityEvent(
    createSecurityEvent({
      userId,
      fileName: file.filename,
      rejectionReason: validation.error,
      fileSize: file.size,
      mimeType: file.mimetype,
      sourceMethod: 'uploadInstructionFile',
    })
  )

  // AC74: Return structured error codes
  // Map validation codes to service error codes
  if (validation.code === 'INVALID_MIME_TYPE') {
    return err('INVALID_MIME_TYPE')
  }
  if (validation.code === 'INVALID_EXTENSION') {
    return err('INVALID_EXTENSION')
  }
  if (validation.code === 'FILE_TOO_LARGE') {
    return err('FILE_TOO_LARGE')
  }
  if (validation.code === 'FILE_TOO_SMALL') {
    return err('FILE_TOO_SMALL')
  }

  // Fallback for any other validation error
  return err('INVALID_FILE')
}
```

#### Update error type definition (add new error codes)
Find the InstructionsError type definition and add:
```typescript
type InstructionsError =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'INVALID_FILE'
  | 'INVALID_MIME_TYPE'  // NEW - AC74
  | 'INVALID_EXTENSION'  // NEW - AC74
  | 'FILE_TOO_LARGE'     // NEW - AC74
  | 'FILE_TOO_SMALL'     // NEW - AC74
  | 'UPLOAD_FAILED'
  | 'DB_ERROR'
```

**Acceptance Criteria**: AC73 (Backend enforces 10MB limit), AC74 (Structured error codes)

---

### 3. apps/api/lego-api/domains/instructions/routes.ts

**Lines to modify**: 222-234 (error mapping)

**Changes**:

#### Update error mapping to handle new error codes (lines 222-234)

**BEFORE**:
```typescript
if (!result.ok) {
  const status =
    result.error === 'NOT_FOUND'
      ? 404
      : result.error === 'FORBIDDEN'
        ? 403
        : result.error === 'INVALID_FILE'
          ? 400
          : result.error === 'UPLOAD_FAILED'
            ? 500
            : 500
  return c.json({ error: result.error }, status)
}
```

**AFTER**:
```typescript
if (!result.ok) {
  // Map service error codes to HTTP status and user-friendly messages (AC46-47)
  const errorResponses: Record<string, { status: number; message: string }> = {
    NOT_FOUND: { status: 404, message: 'MOC not found' },
    FORBIDDEN: { status: 403, message: 'You do not own this MOC' },
    INVALID_MIME_TYPE: { status: 400, message: 'Only PDF files are allowed' }, // AC46
    INVALID_EXTENSION: { status: 400, message: 'Only .pdf file extension is allowed' },
    FILE_TOO_LARGE: { status: 400, message: 'File size exceeds maximum limit of 10MB' }, // AC47
    FILE_TOO_SMALL: { status: 400, message: 'File cannot be empty (0 bytes)' },
    INVALID_FILE: { status: 400, message: 'Invalid file' },
    UPLOAD_FAILED: { status: 500, message: 'Upload failed. Please try again.' },
    DB_ERROR: { status: 500, message: 'Database error. Please try again.' },
  }

  const errorResponse = errorResponses[result.error] || {
    status: 500,
    message: 'An error occurred',
  }

  return c.json(
    {
      error: result.error,
      message: errorResponse.message,
    },
    errorResponse.status
  )
}
```

**Acceptance Criteria**: AC46 (Specific error: "Only PDF files are allowed"), AC47 (Specific error: "File size exceeds maximum limit of 10MB")

---

### 4. apps/web/app-instructions-gallery/src/components/MocDetailDashboard/InstructionsCard.tsx

**Lines to modify**: 1-10 (imports), 17-19 (render section)

**Changes**:

#### Add imports
```typescript
import { InstructionsUpload } from '../InstructionsUpload'
import { useAuth } from '@repo/auth' // or wherever auth context is
```

#### Update component to include upload (after line 16)

**BEFORE**:
```typescript
export function InstructionsCard({ instructionsPdfUrls }: InstructionsCardProps) {
  const safeUrls = instructionsPdfUrls ?? []

  return (
    <DashboardCard
      id="instructions"
      title="Instructions"
      titleIcon={<FileText className="h-4 w-4 text-rose-500" />}
    >
      {safeUrls.length === 0 ? (
        <p className="text-sm text-muted-foreground">No instruction PDFs linked yet.</p>
      ) : (
        <ul className="space-y-2" role="list" aria-label="Instruction PDF files">
          {/* ... file list ... */}
        </ul>
      )}
    </DashboardCard>
  )
}
```

**AFTER**:
```typescript
interface InstructionsCardProps {
  instructionsPdfUrls: string[]
  mocId: string        // NEW - required for upload
  mocOwnerId: string   // NEW - for authorization check
}

export function InstructionsCard({
  instructionsPdfUrls,
  mocId,
  mocOwnerId,
}: InstructionsCardProps) {
  const safeUrls = instructionsPdfUrls ?? []
  const { userId } = useAuth()
  const isOwner = userId === mocOwnerId

  return (
    <DashboardCard
      id="instructions"
      title="Instructions"
      titleIcon={<FileText className="h-4 w-4 text-rose-500" />}
    >
      {/* AC1: Instructions upload component renders on MOC detail page */}
      {/* Only show upload for MOC owner */}
      {isOwner && (
        <div className="mb-4">
          <InstructionsUpload mocId={mocId} />
        </div>
      )}

      {safeUrls.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? 'No instruction PDFs uploaded yet. Use the form above to add instructions.'
            : 'No instruction PDFs linked yet.'}
        </p>
      ) : (
        <ul className="space-y-2" role="list" aria-label="Instruction PDF files">
          {safeUrls.map((url, index) => {
            // ... existing file list rendering ...
          })}
        </ul>
      )}
    </DashboardCard>
  )
}
```

**Acceptance Criteria**: AC1 (Component renders on MOC detail page), AC2 ("Add Instructions" button visible)

---

## Files to Create

### 1. apps/web/app-instructions-gallery/src/components/InstructionsUpload/index.tsx

**Size**: ~350 lines

**Structure**:
```typescript
/**
 * InstructionsUpload Component
 * Story INST-1104: Upload Instructions (Direct ≤10MB)
 *
 * Features:
 * - AC1-5: File picker with PDF validation
 * - AC6-8: Client-side validation with error messages
 * - AC9-12: File selection list with metadata
 * - AC13-18: Sequential upload with progress
 * - AC19-23: Success/error handling
 */

import { useState, useCallback, useRef } from 'react'
import { Upload, X, FileText } from 'lucide-react'
import { Button, Card, LoadingSpinner, Badge } from '@repo/app-component-library'
import { showSuccessToast, showErrorToast } from '@repo/app-component-library'
import { useUploadInstructionFileMutation } from '@repo/api-client'
import type { InstructionsUploadProps, FileValidationResult } from './__types__'
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, MIN_FILE_SIZE } from './__types__'

// Validation helper (AC6-8)
function validateFile(file: File): FileValidationResult {
  // AC6: Validate PDF file type
  if (!ALLOWED_FILE_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: 'Only PDF files allowed',
    }
  }

  // AC7: Validate file size ≤10MB
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File too large. Max 10MB per file',
      hint: 'Use presigned upload for larger files (coming soon)', // AC8
    }
  }

  if (file.size < MIN_FILE_SIZE) {
    return {
      valid: false,
      error: 'File cannot be empty',
    }
  }

  return { valid: true }
}

// Format file size (AC11)
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

export function InstructionsUpload({ mocId, onSuccess }: InstructionsUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [isCancelled, setIsCancelled] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploadInstructionFile, { isLoading }] = useUploadInstructionFileMutation()

  // AC5: Handle file selection from input
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles: File[] = []
    const errors: string[] = []

    // Validate each file
    Array.from(files).forEach(file => {
      const validation = validateFile(file)
      if (validation.valid) {
        newFiles.push(file)
      } else {
        errors.push(`${file.name}: ${validation.error}${validation.hint ? ' ' + validation.hint : ''}`)
      }
    })

    // Show errors if any
    if (errors.length > 0) {
      errors.forEach(error => showErrorToast(error))
    }

    // Add valid files to selection
    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles])
    }

    // Reset input
    e.target.value = ''
  }, [])

  // AC10: Remove file from selection
  const handleRemove = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  // AC13-18: Sequential upload with progress
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return

    setIsCancelled(false)

    for (let i = 0; i < selectedFiles.length; i++) {
      // AC18: Check if upload was cancelled
      if (isCancelled) {
        showErrorToast('Upload cancelled')
        break
      }

      const file = selectedFiles[i]
      setUploadingIndex(i)

      try {
        // AC13: Call useUploadInstructionFileMutation for each file
        const result = await uploadInstructionFile({ mocId, file }).unwrap()

        // AC19: Success toast for each file
        showSuccessToast(`${file.name} uploaded successfully`)

        // AC20-21: File appears in list immediately (via cache invalidation)
        if (onSuccess) {
          onSuccess(result)
        }
      } catch (error: any) {
        // AC22-23: Error handling
        const errorMessage =
          error?.data?.message || error?.message || 'Upload failed. Please try again.'
        showErrorToast(`${file.name}: ${errorMessage}`)

        // Stop on error (don't continue uploading remaining files)
        break
      }
    }

    // Clear selection after upload completes
    setSelectedFiles([])
    setUploadingIndex(null)
  }, [selectedFiles, mocId, uploadInstructionFile, onSuccess, isCancelled])

  // AC18: Cancel upload
  const handleCancel = useCallback(() => {
    setIsCancelled(true)
  }, [])

  // AC5: Trigger file input click
  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const isUploading = uploadingIndex !== null

  return (
    <div className="space-y-4">
      {/* AC2, AC5: "Add Instructions" button and file picker */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={handleClick}
          disabled={isUploading}
          aria-label="Add instructions"
        >
          <Upload className="mr-2 h-4 w-4" />
          Add Instructions
        </Button>

        {/* AC3, AC4, AC8: File input with PDF accept and multiple */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
          aria-label="Upload instruction PDF files"
        />
      </div>

      {/* AC9-12: Selected files list */}
      {selectedFiles.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            {/* AC12: File count */}
            <h3 className="text-sm font-medium">
              Selected Files ({selectedFiles.length})
            </h3>
          </div>

          <ul className="space-y-2" role="list" aria-label="Selected instruction files">
            {selectedFiles.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-lg p-2 border border-border"
              >
                <FileText className="h-4 w-4 text-rose-500 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  {/* AC9: Filename */}
                  <p className="text-sm truncate">{file.name}</p>
                  {/* AC11: Formatted file size */}
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>

                {/* AC15-16: Upload progress indicator */}
                {isUploading && uploadingIndex === index && (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner className="h-4 w-4" />
                    <span className="text-xs text-muted-foreground">
                      Uploading {uploadingIndex + 1} of {selectedFiles.length}...
                    </span>
                  </div>
                )}

                {/* AC10: Remove button (only when not uploading) */}
                {!isUploading && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(index)}
                    aria-label={`Remove ${file.name}`}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {/* AC13, AC17, AC18: Upload and Cancel buttons */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  Uploading...
                </>
              ) : (
                'Upload Files'
              )}
            </Button>

            {isUploading && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
```

**Acceptance Criteria**: AC1-23 (all frontend component requirements)

---

### 2. apps/web/app-instructions-gallery/src/components/InstructionsUpload/__types__/index.ts

**Size**: ~60 lines

**Content**:
```typescript
import { z } from 'zod'

/**
 * Allowed file types for PDF uploads
 */
export const ALLOWED_FILE_TYPES = ['application/pdf'] as const

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Minimum file size in bytes (1 byte)
 */
export const MIN_FILE_SIZE = 1

/**
 * Component props schema
 */
export const InstructionsUploadPropsSchema = z.object({
  mocId: z.string().uuid(),
  onSuccess: z.function().args(z.any()).returns(z.void()).optional(),
})

export type InstructionsUploadProps = z.infer<typeof InstructionsUploadPropsSchema>

/**
 * File validation result schema
 */
export const FileValidationResultSchema = z.discriminatedUnion('valid', [
  z.object({
    valid: z.literal(true),
  }),
  z.object({
    valid: z.literal(false),
    error: z.string(),
    hint: z.string().optional(),
  }),
])

export type FileValidationResult = z.infer<typeof FileValidationResultSchema>

/**
 * MocFile response schema (from API)
 */
export const MocFileSchema = z.object({
  id: z.string().uuid(),
  mocId: z.string().uuid(),
  fileType: z.string(),
  fileUrl: z.string().url(),
  originalFilename: z.string(),
  mimeType: z.string(),
  createdAt: z.string().datetime(),
})

export type MocFile = z.infer<typeof MocFileSchema>
```

---

### 3. apps/web/app-instructions-gallery/src/components/InstructionsUpload/__tests__/InstructionsUpload.test.tsx

**Size**: ~250 lines

**Test Cases**:
- AC51: Component renders with "Add Instructions" button
- AC52: Validates PDF file type (rejects JPEG, TXT)
- AC53: Validates file size (rejects >10MB, accepts ≤10MB)
- AC54: Multiple files supported in selection list
- AC55: Remove button removes file from selection

---

### 4. apps/web/app-instructions-gallery/src/components/InstructionsUpload/__tests__/InstructionsUpload.integration.test.tsx

**Size**: ~200 lines

**Test Cases**:
- AC60: POST endpoint called correctly
- AC61: MSW handler returns success
- AC62: MSW handler returns error for invalid file
- AC63: File metadata matches MocFile schema
- AC64: Cache invalidation triggers

---

### 5. apps/web/playwright/tests/instructions/upload-direct.spec.ts

**Size**: ~300 lines

**Test Cases**:
- AC65: Upload single 5MB PDF
- AC66: File uploads successfully, appears in list
- AC67: Upload multiple PDFs (2-3 files) sequentially
- AC68: All files appear in list after upload
- AC69: Reject 15MB PDF with error message
- AC70: Reject JPEG file with error "Only PDF files allowed"
- AC71: Download button functional

---

### 6. apps/web/playwright/fixtures/files/sample-instructions-5mb.pdf

**Type**: Binary file (5MB PDF)
**Purpose**: E2E test fixture for happy path upload

---

### 7. apps/web/playwright/fixtures/files/sample-instructions-15mb.pdf

**Type**: Binary file (15MB PDF)
**Purpose**: E2E test fixture for oversized file rejection

---

### 8. apps/web/app-instructions-gallery/src/components/InstructionsUpload/README.md

**Size**: ~150 lines

**Content**:
- Component props documentation
- Usage example with code snippet
- Validation rules (PDF only, 10MB max)
- Integration example in MOC detail page

---

## Summary

**Files to Modify**: 4
**Files to Create**: 8
**Total Files Changed**: 12

**Estimated Lines of Code**:
- Modified: ~150 lines
- New code: ~1,200 lines
- Tests: ~750 lines
- Documentation: ~150 lines

**Total Effort**: 24 hours (3 story points)

**Phases**:
1. Backend validation utilities: 2 hours
2. Backend service refinement: 2 hours
3. Frontend component: 6 hours
4. Frontend integration: 2 hours
5. Frontend tests: 5 hours
6. E2E tests: 4 hours
7. Documentation: 1 hour

**Risk Level**: Low (backend exists, frontend follows established patterns)

**Confidence**: Very High
