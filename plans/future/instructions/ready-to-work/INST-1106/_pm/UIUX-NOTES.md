# UI/UX Notes: INST-1106 Upload Parts List

## Verdict
**PASS-WITH-NOTES** - Core user journey is implementable with existing component patterns. Notes cover MVP-critical UX patterns and accessibility requirements.

---

## MVP Component Architecture

### Components Required for Core Journey

#### PartsListUpload Component (NEW)
- **Location**: `apps/web/app-instructions-gallery/src/components/PartsListUpload/`
- **Base Pattern**: Adapt from `ThumbnailUpload` (INST-1103)
- **Key Differences**:
  - Accept CSV, XML, or PDF (not just images)
  - Single file only (no multiple selection)
  - Replace mode when file exists (not append)
- **States**: Empty, Selected, Uploading, Success, Error

#### PartsListCard (Display Component)
- **Location**: `apps/web/app-instructions-gallery/src/pages/MocDetailPage/components/`
- **Purpose**: Display uploaded parts list with download and replace buttons
- **Layout**: Card in main dashboard area (8-col grid on desktop)

### Reuse Targets from packages/**

From `@repo/app-component-library/_primitives`:
- **Button** - "Add Parts List", "Replace Parts List", "Upload", "Cancel", "Download"
- **Card** - PartsListCard wrapper
- **Label** - File input label
- **Toast** - Success/error notifications
- **Spinner** - Loading state during upload
- **Badge** - File size indicator

### shadcn Primitives for Core UI
- File input (native HTML with shadcn styling)
- Alert component for error messages (if not using Toast)
- Progress component (future enhancement - not MVP)

---

## MVP Accessibility (Blocking Only)

### Requirements that Prevent Core Journey Usage

#### Keyboard Navigation (CRITICAL)
- **Tab** to focus "Add Parts List" button
- **Enter/Space** to activate button and open file picker
- **Tab** to focus "Upload" button after file selected
- **Escape** to cancel file selection (clear state)

#### Screen Reader Support (CRITICAL)
- File input: `aria-label="Upload parts list file (CSV, XML, or PDF)"`
- Upload button: `aria-label="Upload parts list"`, `aria-busy="true"` during upload
- File preview: `aria-live="polite"` region announces selected file
- Success/error: Toast notifications with `role="alert"` for screen reader announcement

#### Focus Management (CRITICAL)
- After file selection: Focus moves to Upload button
- After upload success: Focus returns to Parts List card header
- After error: Focus remains on Upload button for retry

### Basic Keyboard Navigation for Core Flow
1. Tab to "Add Parts List" button → Enter to open file picker
2. Select file in OS dialog → Tab to Upload button → Enter to upload
3. Success toast announces → Tab to Download button

### Critical Screen Reader Requirements
- File picker announces: "Choose file. Accepted types: CSV, XML, PDF. Maximum size: 10MB"
- Selected file announces: "Selected: parts-list.csv, 2 megabytes"
- Upload progress announces: "Uploading parts list..."
- Success announces: "Parts list uploaded successfully"

---

## MVP Design System Rules

### Token-Only Colors (Hard Gate)

**Allowed Color Classes**:
- Text: `text-gray-600`, `text-gray-700`, `text-sky-600`, `text-red-600` (errors)
- Background: `bg-white`, `bg-gray-50`, `bg-sky-50`, `bg-red-50` (error states)
- Border: `border-gray-300`, `border-sky-500`, `border-red-500` (errors)

**Forbidden**:
- Arbitrary values: `bg-[#FF5733]`, `text-[rgb(100,200,300)]`
- Custom CSS colors outside Tailwind theme

### _primitives Import Requirement

**CORRECT**:
```typescript
import { Button } from '@repo/app-component-library/_primitives/Button'
import { Card } from '@repo/app-component-library/_primitives/Card'
import { Toast } from '@repo/app-component-library/_primitives/Toast'
```

**INCORRECT** (NO BARREL FILES):
```typescript
import { Button, Card, Toast } from '@repo/app-component-library' // ❌ FORBIDDEN
```

---

## MVP Playwright Evidence

### Core Journey Demonstration Steps

#### Scenario 1: Upload CSV Parts List (Happy Path)
1. **Setup**: User authenticated, MOC detail page loaded (`/mocs/:id`)
2. **Action**: Click "Add Parts List" button
3. **Assert**: File picker opens (native OS dialog)
4. **Action**: Select `parts-list.csv` (2MB) from test fixtures
5. **Assert**: File preview displays filename and size
6. **Action**: Click "Upload" button
7. **Assert**: Loading spinner appears, upload button disabled
8. **Assert**: Success toast appears: "Parts list uploaded!"
9. **Assert**: Parts list card shows uploaded file with download button
10. **Evidence**: Screenshot of final state, network HAR showing POST request

#### Scenario 2: Replace Existing Parts List
1. **Setup**: MOC with existing CSV parts list (`old-parts.csv`)
2. **Action**: Click "Replace Parts List" button
3. **Action**: Select `new-parts.xml` (3MB)
4. **Action**: Click "Upload"
5. **Assert**: Old file removed from UI, new file displayed
6. **Assert**: Only one file visible (single file enforcement)
7. **Evidence**: Video recording showing replacement flow

#### Scenario 3: Error Handling - Invalid File Type
1. **Setup**: MOC detail page loaded
2. **Action**: Click "Add Parts List"
3. **Action**: Select `image.jpg` (invalid type)
4. **Assert**: Error toast: "Only CSV, XML, and PDF files are allowed"
5. **Assert**: Upload button disabled
6. **Assert**: No network request sent
7. **Evidence**: Screenshot of error state

---

## Component Specifications (MVP-Critical)

### PartsListUpload Component

#### Props (Zod Schema)
```typescript
const PartsListUploadPropsSchema = z.object({
  mocId: z.string().uuid(),
  existingFile: z.object({
    id: z.string().uuid(),
    name: z.string(),
    size: z.number(),
    url: z.string().url(),
  }).optional(),
  onSuccess: z.function().args(z.any()).returns(z.void()).optional(),
})
```

#### States
- **Empty**: No file selected, "Add Parts List" button visible
- **Selected**: File selected, preview shows filename/size, "Upload" button enabled
- **Uploading**: Upload in progress, spinner visible, button disabled
- **Success**: File uploaded, toast notification, UI updates
- **Error**: Upload failed, error toast, button re-enabled for retry

#### Validation (Client-Side)
```typescript
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'text/xml',
  'application/xml',
  'application/pdf',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function validateFile(file: File): ValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only CSV, XML, and PDF files are allowed' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Max 10MB' }
  }
  if (file.size === 0) {
    return { valid: false, error: 'File cannot be empty' }
  }
  return { valid: true }
}
```

---

## Visual Design (MVP-Critical)

### Upload Zone (Empty State)
- **Border**: 2px dashed `border-gray-300`
- **Background**: `bg-white` (no background color)
- **Padding**: `p-8` (32px)
- **Text**: "Upload parts list" in `text-gray-700`, 16px
- **Subtext**: "CSV, XML, or PDF · Max 10MB" in `text-gray-500`, 14px
- **Icon**: Upload icon, `text-gray-400`, 48x48px
- **Hover**: Border changes to `border-gray-400`

### Upload Zone (File Selected State)
- **Border**: 2px solid `border-sky-500`
- **Background**: `bg-white`
- **File Info**:
  - Filename: `text-gray-900`, 16px, truncate if long
  - File size: `text-gray-600`, 14px
- **Buttons**:
  - "Upload": Primary button, `bg-sky-600 hover:bg-sky-700 text-white`
  - "Cancel": Secondary button, `bg-gray-100 hover:bg-gray-200 text-gray-700`

### Upload Zone (Loading State)
- **Border**: `border-sky-500`
- **Spinner**: 24x24px, `text-sky-600`
- **Text**: "Uploading..." in `text-gray-600`
- **Button**: Disabled state, `bg-gray-100 text-gray-400 cursor-not-allowed`

### Parts List Card (File Uploaded)
- **Card**: `bg-white border border-gray-200 rounded-lg p-6`
- **Header**: "Parts List" in `text-gray-900`, 18px font-semibold
- **File Item**:
  - Filename: `text-gray-900`, 16px
  - File size: `text-gray-600`, 14px
  - Upload date: `text-gray-500`, 12px
- **Buttons**:
  - "Download": Primary button (icon + text)
  - "Replace": Secondary button (icon + text)

---

## Error Messaging (MVP-Critical)

Use **Toast** notifications (not inline errors) for all upload errors:

| Error | Toast Message | Color | Duration |
|-------|---------------|-------|----------|
| Invalid file type | "Only CSV, XML, and PDF files are allowed" | Red | 5s |
| File too large | "File too large. Maximum size is 10MB" | Red | 5s |
| Empty file | "File cannot be empty" | Red | 5s |
| Upload failed | "Upload failed. Please try again." | Red | 5s |
| Network error | "Network error. Check your connection and try again." | Red | 5s |
| Success | "Parts list uploaded!" | Green | 3s |

---

## Mobile Considerations (MVP-Critical)

### Touch Targets
- Button minimum size: 44x44px (Apple HIG, Google Material)
- "Add Parts List" button: Full width on mobile, 48px height

### Layout
- Upload zone: Full width on mobile (remove desktop padding)
- File preview: Stack vertically on mobile (filename above size)
- Buttons: Stack vertically on mobile, full width

### File Picker
- Native OS file picker opens (iOS/Android system dialog)
- File type filtering handled by OS

---

## Non-MVP UX (Future Work)

These are out of scope for MVP but should be tracked for future iterations:

### UX Polish Opportunities
- Drag-and-drop upload zone (INST-2035)
- Progress bar with percentage (currently just spinner)
- File preview/thumbnail (PDF preview for parts lists)
- Batch operations (currently single file only)

### Accessibility Enhancements
- High contrast mode support
- Reduced motion mode (disable animations)
- WCAG AAA compliance (MVP targets AA)

### UI Improvements
- Empty state illustration (custom graphic)
- Animated transitions (fade in/out, slide)
- Hover tooltips on buttons
- File format icons (CSV icon, XML icon, PDF icon)
