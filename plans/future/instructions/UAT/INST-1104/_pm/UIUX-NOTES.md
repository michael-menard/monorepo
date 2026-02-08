# UI/UX Notes: INST-1104 - Upload Instructions (Direct ≤10MB)

## Verdict
**PASS-WITH-NOTES**

Core user journey is implementable with standard file picker component. MVP-critical UX patterns focus on file selection, validation feedback, and upload progress. Drag-drop enhancement deferred to INST-2035.

---

## MVP Component Architecture

### Core Components Required

#### InstructionsUpload (NEW)
- **Location**: `apps/web/app-instructions-gallery/src/components/InstructionsUpload/`
- **Purpose**: File picker for PDF instruction files with validation and upload
- **Key Features**:
  - File input with `accept="application/pdf"`
  - Multiple file selection (`multiple` attribute)
  - Display selected files in list (name, size, remove button)
  - Upload button to trigger mutation
  - Client-side validation (PDF only, ≤10MB per file)
  - Sequential upload with progress indicators
- **States**:
  - Empty: "Add Instructions" button
  - Files Selected: List of files with names, sizes, remove buttons
  - Uploading: Loading spinner on upload button, button disabled
  - Success: Success toast, files added to instructions list
  - Error: Error toast, upload button enabled

#### InstructionsFileList (MOC Detail Page)
- **Location**: `apps/web/app-instructions-gallery/src/pages/MocDetailPage/components/`
- **Purpose**: Display uploaded instruction files with download buttons
- **Layout**:
  - Card component in main area (8 cols on desktop)
  - List view: Each file shows filename, size, upload date, download button
  - Empty state: "No instructions uploaded yet" with "Add Instructions" CTA
  - Loading state: Skeleton loaders while fetching files

### Reuse from @repo/app-component-library

| Component | Usage |
|-----------|-------|
| `Button` | "Add Instructions" button, Upload button, Remove button, Download button |
| `Card` | InstructionsFileList wrapper |
| `Label` | Labels for file inputs |
| `Toast` | Success/error notifications |
| `Spinner` | Loading state during upload |
| `Badge` | File size badge, file type indicator |

### Reuse from Existing Apps

| Pattern | Source | Adaptation |
|---------|--------|------------|
| File picker pattern | Standard HTML `<input type="file">` | Add `accept="application/pdf"` and `multiple` |
| File list display | Common UX pattern | Show filename, size, remove/download actions |

---

## MVP Visual Design

### Add Instructions Button

**Location:** MOC Detail Page, Instructions card

```
┌─────────────────────────────────────────┐
│ Instructions                        (3) │
│                                         │
│  [+ Add Instructions]                   │
│                                         │
│  📄 castle-part1.pdf · 5 MB   [↓]       │
│  📄 castle-part2.pdf · 3 MB   [↓]       │
│  📄 castle-part3.pdf · 2 MB   [↓]       │
└─────────────────────────────────────────┘
```

- Button: Secondary style, icon + text
- Color: sky-600 (design token)
- Hover: sky-700
- Click: Opens file picker

### File Selection Display

**After selecting files, before upload:**

```
┌─────────────────────────────────────────┐
│ Upload Instructions                      │
│                                         │
│ Selected Files (3)                      │
│                                         │
│  📄 castle-part1.pdf                    │
│     5.2 MB                        [✕]   │
│                                         │
│  📄 castle-part2.pdf                    │
│     3.1 MB                        [✕]   │
│                                         │
│  📄 assembly-guide.pdf                  │
│     2.8 MB                        [✕]   │
│                                         │
│                                         │
│  [Cancel]        [Upload Instructions]  │
└─────────────────────────────────────────┘
```

- File icon: gray-400
- Filename: text-base, gray-900
- File size: text-sm, gray-500
- Remove button: gray-400 hover:gray-600
- Upload button: Primary style (sky-600)

### Upload Progress State

**During upload (sequential):**

```
┌─────────────────────────────────────────┐
│ Uploading Instructions...                │
│                                         │
│  📄 castle-part1.pdf                    │
│     5.2 MB                    ✓ Uploaded│
│                                         │
│  📄 castle-part2.pdf                    │
│     3.1 MB                    [Spinner] │
│                                         │
│  📄 assembly-guide.pdf                  │
│     2.8 MB                      Waiting │
│                                         │
│                                         │
│  [Cancel]   [Upload Instructions disabled]│
└─────────────────────────────────────────┘
```

- Uploaded: green-600 checkmark
- Uploading: blue spinner
- Waiting: gray-400 text
- Cancel: Aborts remaining uploads

### Instructions File List (MOC Detail Page)

**Uploaded files display:**

```
┌─────────────────────────────────────────┐
│ Instructions                        (3) │
│                                         │
│  [+ Add Instructions]                   │
│                                         │
│  📄 castle-part1.pdf                    │
│     5 MB · Uploaded Feb 6, 2026   [↓]   │
│                                         │
│  📄 castle-part2.pdf                    │
│     3 MB · Uploaded Feb 6, 2026   [↓]   │
│                                         │
│  📄 assembly-guide.pdf                  │
│     3 MB · Uploaded Feb 6, 2026   [↓]   │
└─────────────────────────────────────────┘
```

- File icon: PDF icon (gray-600)
- Filename: text-base, gray-900, bold
- Metadata: text-sm, gray-500
- Download button: sky-600 hover:sky-700

### Empty State

**No instructions uploaded:**

```
┌─────────────────────────────────────────┐
│ Instructions                        (0) │
│                                         │
│              📄                         │
│                                         │
│   No instructions uploaded yet          │
│                                         │
│   Upload PDF files to share your        │
│   building instructions.                │
│                                         │
│         [+ Add Instructions]            │
└─────────────────────────────────────────┘
```

- Icon: gray-300, 64x64px
- Text: gray-500, center-aligned
- CTA button: Primary style

### Error States

**Client-side validation error:**

```
Toast (top-right, 4 seconds):
┌─────────────────────────────────────────┐
│ ✕  Only PDF files allowed               │
└─────────────────────────────────────────┘
```

**File too large:**

```
Toast (top-right, 6 seconds):
┌─────────────────────────────────────────┐
│ ✕  File too large. Max 10MB per file    │
│    Use presigned upload for larger      │
│    files (coming soon).                 │
└─────────────────────────────────────────┘
```

**Server error:**

```
Toast (top-right, 5 seconds):
┌─────────────────────────────────────────┐
│ ✕  Upload failed. Please try again.     │
└─────────────────────────────────────────┘
```

**Success:**

```
Toast (top-right, 3 seconds):
┌─────────────────────────────────────────┐
│ ✓  Instructions uploaded!               │
└─────────────────────────────────────────┘
```

---

## MVP Accessibility (Blocking Only)

### Keyboard Navigation (MVP-Critical)

| Interaction | Keyboard Shortcut |
|-------------|------------------|
| Focus "Add Instructions" button | Tab |
| Activate file picker | Enter or Space |
| Navigate selected files list | Tab |
| Remove selected file | Enter or Space on Remove button |
| Focus Upload button | Tab |
| Trigger upload | Enter or Space |
| Close modal/dialog | Escape |

### Screen Reader Requirements (MVP-Critical)

**File Picker:**
- `<button aria-label="Add instructions">`
- Input field: `aria-describedby="file-picker-help"`
- Help text: `id="file-picker-help"` "Select one or more PDF files to upload. Maximum 10MB per file."

**Selected Files List:**
- `<ul role="list" aria-label="Selected files">`
- Each file: `<li aria-label="castle-part1.pdf, 5.2 megabytes">`
- Remove button: `<button aria-label="Remove castle-part1.pdf from upload queue">`

**Upload Button:**
- Enabled: `<button>Upload Instructions</button>`
- Uploading: `<button aria-busy="true" aria-live="polite">Uploading... 2 of 3 files</button>`
- Disabled: `<button disabled aria-disabled="true">Upload Instructions</button>`

**Instructions List (MOC Detail):**
- `<ul role="list" aria-label="Uploaded instruction files">`
- Each file: `<li aria-label="castle-part1.pdf, 5 megabytes, uploaded February 6, 2026">`
- Download button: `<button aria-label="Download castle-part1.pdf">`

### Focus Management (MVP-Critical)

1. **File Selection:**
   - Focus returns to "Add Instructions" button after file picker closes
   - If files selected, focus moves to first file in list

2. **Upload Completion:**
   - On success: Focus moves to first newly uploaded file in instructions list
   - On error: Focus returns to upload button for retry

3. **File Removal:**
   - Focus moves to next file in list
   - If last file removed, focus moves to "Add Instructions" button

### Color Contrast (MVP-Critical)

- All text: Minimum 4.5:1 contrast ratio (WCAG AA)
- Buttons: Minimum 3:1 contrast for borders (WCAG AA)
- Error messages: Use icon + text, not color alone
- Success indicators: Checkmark icon + green text (accessible without color)

---

## MVP Design System Rules

### Token-Only Colors (Hard Gate)

**DO:**
- `bg-sky-50`, `bg-sky-600`, `bg-sky-700` (design tokens)
- `text-gray-900`, `text-gray-600`, `text-gray-500` (design tokens)
- `border-gray-300`, `border-sky-500` (design tokens)
- `text-green-600`, `text-red-600` (for success/error states)

**DO NOT:**
- `bg-[#f0f9ff]` (arbitrary hex values)
- `text-[rgb(15,23,42)]` (arbitrary RGB)
- Custom color classes outside design tokens

### _primitives Import Requirement

```tsx
// CORRECT
import { Button, Card, Label, Toast } from '@repo/app-component-library/_primitives'

// WRONG
import Button from '@repo/app-component-library/buttons/Button'
```

### Component Composition Pattern

```tsx
// InstructionsUpload.tsx
import { Button, Card, Label } from '@repo/app-component-library/_primitives'
import { useUploadInstructionFileMutation } from '@repo/api-client'

export function InstructionsUpload({ mocId }: { mocId: string }) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadFile, { isLoading }] = useUploadInstructionFileMutation()

  // File selection, validation, upload logic
  // ...

  return (
    <Card>
      <Label>Upload Instructions</Label>
      <input
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleFileSelect}
        aria-describedby="file-picker-help"
      />
      <p id="file-picker-help" className="text-sm text-gray-500">
        Select PDF files (max 10MB each)
      </p>

      {/* Selected files list */}

      <Button onClick={handleUpload} disabled={isLoading}>
        {isLoading ? 'Uploading...' : 'Upload Instructions'}
      </Button>
    </Card>
  )
}
```

---

## MVP Playwright Evidence

### Core Journey Demonstration Steps

**Scenario 1: Upload single PDF file**

1. Navigate to `/mocs/{mocId}`
2. Assert: Instructions card visible with empty state
3. Click "Add Instructions" button
4. File picker opens
5. Select `sample-5mb.pdf`
6. Assert: File appears in selected files list with name "sample-5mb.pdf" and size "5 MB"
7. Click "Upload Instructions" button
8. Assert: Upload button shows loading state
9. Wait for upload to complete
10. Assert: Success toast "Instructions uploaded!" appears
11. Assert: File appears in instructions list with download button
12. Assert: File count badge shows "(1)"

**Scenario 2: Upload multiple PDF files**

1. Navigate to `/mocs/{mocId}`
2. Click "Add Instructions"
3. Select 3 PDF files: `part1.pdf`, `part2.pdf`, `part3.pdf`
4. Assert: All 3 files appear in selected files list
5. Click "Upload Instructions"
6. Assert: Files upload sequentially (observe upload progress indicators)
7. Wait for all uploads to complete
8. Assert: Success toast appears
9. Assert: All 3 files appear in instructions list
10. Assert: File count badge shows "(3)"

**Scenario 3: Reject invalid file type**

1. Navigate to `/mocs/{mocId}`
2. Click "Add Instructions"
3. Attempt to select `image.jpg` (JPEG file)
4. Assert: File picker rejects file (if `accept` enforced) OR client validation shows error
5. Assert: Error toast "Only PDF files allowed" appears
6. Assert: Upload button disabled or no files in selection list

**Scenario 4: Reject oversized file**

1. Navigate to `/mocs/{mocId}`
2. Click "Add Instructions"
3. Select `large-15mb.pdf`
4. Assert: Error toast "File too large. Max 10MB per file" appears
5. Assert: Hint about presigned upload may appear
6. Assert: Upload button disabled or file marked as invalid

---

## Non-MVP Enhancements (Deferred to Future Stories)

### Drag-and-Drop Upload Zone (INST-2035)
- Drop zone with visual feedback
- Drag-over state styling
- Multi-file drag-and-drop support

### Progress Bar with Percentage (INST-2036)
- Show upload progress: "Uploading... 45%"
- Circular progress indicator
- Estimated time remaining

### File Preview/Thumbnails (INST-2032)
- PDF thumbnail preview in file list
- Lightbox viewer for PDFs
- Page count display

### Batch Upload Endpoint
- Single API request for multiple files
- Parallel uploads for faster completion
- Rollback on partial failure

### File Reordering (INST-3020)
- Drag-to-reorder instructions files
- Display order persisted to database
- "Part 1", "Part 2" labels

### Mobile Optimizations (INST-3060)
- Mobile-friendly file picker
- Touch-optimized file list
- Responsive layout for small screens

### Accessibility Enhancements
- WCAG AAA compliance (7:1 contrast ratio)
- High contrast mode support
- Reduced motion preferences

---

## Design System Compliance Checklist

- [ ] All colors use design tokens (no arbitrary hex/RGB values)
- [ ] All components import from `_primitives`
- [ ] Button states: default, hover, active, disabled, loading
- [ ] Toast notifications use `@repo/app-component-library/_primitives/Toast`
- [ ] Typography follows design system (text-base, text-sm, font weights)
- [ ] Spacing uses Tailwind scale (px-4, py-2, gap-4, etc.)
- [ ] Icons use consistent library (Lucide React recommended)
- [ ] Responsive design with Tailwind breakpoints (sm:, md:, lg:)
- [ ] Focus rings visible and accessible (ring-2 ring-sky-500)
- [ ] Loading states use Spinner from `_primitives`

---

## Critical UX Flows

### Flow 1: First-Time Upload (Empty State)
1. User sees empty state with CTA
2. Clicks "Add Instructions"
3. Selects PDF file
4. Validates file (client-side)
5. Uploads file
6. Sees success feedback
7. File appears in list with download button

### Flow 2: Add More Files (Existing Files)
1. User sees existing files list
2. Clicks "Add Instructions" button above list
3. Selects additional PDFs
4. Uploads files
5. New files append to list (no replacement)
6. All files remain accessible

### Flow 3: Error Recovery
1. User selects invalid file
2. Sees error message
3. Removes invalid file
4. Selects valid file
5. Uploads successfully
6. Continues workflow without frustration

### Flow 4: Multiple File Upload
1. User selects 3 PDFs at once
2. All files display in selection list
3. User reviews list, removes 1 file
4. Uploads remaining 2 files
5. Sees progress for each file
6. Both files appear in instructions list

---

## Summary

**MVP-Critical:**
- Standard file picker with PDF accept filter
- Client-side validation (type, size)
- File list display (name, size, remove button)
- Sequential upload with loading states
- Success/error toast notifications
- Instructions file list on MOC detail page
- Keyboard navigation and screen reader support
- Design token compliance

**Non-MVP (Future):**
- Drag-and-drop upload zone
- Progress bars with percentage
- PDF preview/thumbnails
- Batch upload optimization
- File reordering
- Mobile optimizations

**Accessibility Baseline:**
- WCAG AA compliance (4.5:1 contrast)
- Keyboard navigation for all interactions
- Screen reader labels for all elements
- Focus management for modal/upload flows
- Error messages with icons (not color alone)
