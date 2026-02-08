# UI/UX Notes: INST-1103 - Upload Thumbnail

## Verdict
**PASS-WITH-NOTES**

Core user journey is implementable with existing components. Notes cover MVP-critical UX patterns and accessibility requirements.

---

## MVP Component Architecture

### Core Components Required

#### ThumbnailUpload (NEW)
- **Location**: `apps/web/app-instructions-gallery/src/components/ThumbnailUpload/`
- **Base**: Adapt `ImageUploadZone` from `app-sets-gallery`
- **Key Differences**:
  - `maxImages={1}` - Single thumbnail only
  - Remove reorder button (not needed for single image)
  - Label: "Thumbnail" instead of "Images"
  - Preview aspect ratio: 16:9 or 1:1 (match gallery cards)
- **States**:
  - Empty: Dashed border, upload icon, "Drop image or click to upload"
  - Drag-over: Solid border (sky-500), increased opacity
  - Preview: Image preview, filename, file size, remove button
  - Uploading: Spinner on upload button, button disabled
  - Success: Auto-update preview, success toast
  - Error: Error toast, upload button enabled

#### ThumbnailCoverCard (MOC Detail Page)
- **Location**: `apps/web/app-instructions-gallery/src/pages/MocDetailPage/components/`
- **Purpose**: Display thumbnail in sidebar with "Change Thumbnail" button
- **Layout**:
  - Sticky sidebar card (4 cols on desktop)
  - Image fills card width, maintains aspect ratio
  - Overlay: "Change Thumbnail" button on hover
  - Fallback: Placeholder icon if no thumbnail

### Reuse from @repo/app-component-library

| Component | Usage |
|-----------|-------|
| `Button` | Upload button, Remove button, Change Thumbnail button |
| `Card` | ThumbnailCoverCard wrapper |
| `Label` | "Thumbnail" label for upload zone |
| `Toast` | Success/error notifications |
| `Spinner` | Loading state during upload |

### Reuse from Existing Apps

| Component | Source | Adaptation |
|-----------|--------|------------|
| `ImageUploadZone` | `app-sets-gallery` | Set `maxImages={1}`, remove reorder UI, adapt labels |

---

## MVP Visual Design

### Upload Zone Design

**Empty State:**
```
┌─────────────────────────────────────────┐
│                                         │
│              [Upload Icon]              │
│                                         │
│     Drop image or click to upload       │
│         JPEG, PNG, WebP · Max 10MB      │
│                                         │
└─────────────────────────────────────────┘
```
- Border: 2px dashed gray-300
- Padding: 32px
- Text: gray-600, center-aligned
- Icon: gray-400, 48x48px

**Drag-Over State:**
```
┌─────────────────────────────────────────┐
│                                         │
│           [Upload Icon (blue)]          │
│                                         │
│          Drop to upload thumbnail       │
│                                         │
└─────────────────────────────────────────┘
```
- Border: 2px solid sky-500
- Background: sky-50 (5% opacity)
- Text: sky-700
- Icon: sky-500

**Preview State:**
```
┌─────────────────────────────────────────┐
│         [Image Preview 16:9]            │
│                                         │
│  castle-moc.jpg · 2.3 MB                │
│                                         │
│  [Remove] [Upload Thumbnail]            │
└─────────────────────────────────────────┘
```
- Image: object-fit cover, max-height 300px
- Filename: gray-700, truncate if too long
- File size: gray-500
- Remove button: secondary (gray)
- Upload button: primary (sky-600)

**Uploading State:**
- Upload button: Disabled, shows spinner
- Text: "Uploading thumbnail..."
- Remove button: Disabled

### Cover Card Design (Detail Page Sidebar)

**With Thumbnail:**
```
┌─────────────────────────────────────────┐
│                                         │
│         [MOC Thumbnail Image]           │
│         (hover: dark overlay +          │
│          "Change Thumbnail" button)     │
│                                         │
└─────────────────────────────────────────┘
```
- Card: Full width of sidebar (4 cols)
- Image aspect ratio: 16:9
- Hover overlay: black 40% opacity
- Button: white text, appears on hover only

**Without Thumbnail (Fallback):**
```
┌─────────────────────────────────────────┐
│                                         │
│            [Placeholder Icon]           │
│                                         │
│          Add Thumbnail                  │
│                                         │
└─────────────────────────────────────────┘
```
- Background: gray-100
- Icon: gray-400, 64x64px
- Text: gray-600, center-aligned
- Click anywhere to trigger upload

### Placement

**Create Page (`/mocs/new`):**
- After MOC form submission succeeds
- Redirect to detail page
- Thumbnail upload available in sidebar immediately

**Detail Page (`/mocs/:id`):**
- Sidebar sticky card (top of sidebar)
- Always visible above metadata card

**Gallery Page (`/mocs`):**
- Thumbnail displays in gallery card
- No upload UI on gallery (must go to detail page)

---

## MVP Accessibility (Blocking Only)

### Keyboard Navigation (REQUIRED)
- [ ] **Tab** to focus upload zone
- [ ] **Enter** or **Space** to open file picker
- [ ] **Tab** to focus Upload/Remove buttons
- [ ] **Escape** to cancel drag-over state (if in drag mode)

### Screen Reader Support (REQUIRED)
- [ ] Upload zone: `aria-label="Upload thumbnail image"`
- [ ] File input: `aria-describedby="thumbnail-constraints"` (points to "JPEG, PNG, WebP · Max 10MB")
- [ ] Upload button: `aria-label="Upload thumbnail"`, `aria-busy="true"` during upload
- [ ] Remove button: `aria-label="Remove selected thumbnail"`
- [ ] Cover card image: `alt="[MOC Title] thumbnail"` (use actual MOC title)

### Focus Management (REQUIRED)
- [ ] Focus remains on upload button after file selection
- [ ] Focus moves to "Change Thumbnail" button after successful upload
- [ ] Focus trapped in error toast (if present) until dismissed

### Color Contrast (REQUIRED - WCAG AA)
- [ ] Text on upload zone: gray-600 on white (contrast ratio ≥4.5:1)
- [ ] Drag-over text: sky-700 on sky-50 (contrast ratio ≥4.5:1)
- [ ] Button text: white on sky-600 (contrast ratio ≥4.5:1)

### Announcements (REQUIRED)
- [ ] File selected: "Selected [filename], [file size]"
- [ ] Upload started: "Uploading thumbnail"
- [ ] Upload success: "Thumbnail uploaded successfully"
- [ ] Upload error: "[Error message]" (e.g., "File too large. Max 10MB")

---

## Error Messaging (MVP-Critical)

### Toast Notifications (Preferred)

| Scenario | Message | Type |
|----------|---------|------|
| Invalid file type | "Only images allowed (JPEG, PNG, WebP)" | Error |
| File too large | "File too large. Max 10MB" | Error |
| Upload success | "Thumbnail uploaded!" | Success |
| Network error | "Network error. Please try again" | Error |
| Server error | "Upload failed. Please try again" | Error |
| Unauthorized | "You do not own this MOC" | Error |
| MOC not found | "MOC not found" | Error |

### Inline Errors (AVOID)
- Do NOT use inline error messages in upload zone (clutters UI)
- Use toast notifications instead (temporary, non-blocking)

---

## Loading States (MVP-Critical)

### Upload Button States

| State | Visual | Disabled |
|-------|--------|----------|
| No file selected | "Upload Thumbnail" (gray) | Yes |
| File selected | "Upload Thumbnail" (sky-600) | No |
| Uploading | [Spinner] "Uploading..." (sky-600) | Yes |
| Success | "Upload Thumbnail" (sky-600) | No (resets) |

### Cover Card States

| State | Visual |
|-------|--------|
| No thumbnail | Placeholder icon, "Add Thumbnail" text |
| Has thumbnail | Image displayed, "Change Thumbnail" on hover |
| Uploading | Image preview (if replacing), spinner overlay |

---

## Mobile Considerations (MVP-Critical)

### Touch Interactions
- [ ] Tap upload zone to open native file picker
- [ ] No drag-and-drop on mobile (not supported)
- [ ] Large touch targets: 44x44px minimum (buttons)

### Responsive Layout
- [ ] Upload zone: Full width on mobile
- [ ] Cover card: Full width in stacked layout (mobile)
- [ ] Preview image: Max-height 200px on mobile (reduce viewport usage)

### Native File Picker
- [ ] `accept="image/jpeg,image/png,image/webp"` triggers image-only picker
- [ ] Camera access available on mobile devices (if supported)

---

## Design System Compliance

### Color Tokens (Tailwind)
- Primary: `sky-500`, `sky-600`, `sky-700`
- Neutral: `gray-100`, `gray-300`, `gray-500`, `gray-600`, `gray-700`
- Success: `green-500` (toast background)
- Error: `red-500` (toast background)

### Typography
- Upload zone text: `text-base` (16px)
- File info: `text-sm` (14px)
- Button text: `text-sm font-medium`

### Spacing
- Upload zone padding: `p-8` (32px)
- Card padding: `p-4` (16px)
- Button gap: `gap-2` (8px)

### Shadows
- Card: `shadow-sm`
- Drag-over: `shadow-md`

---

## Animation (Optional, Non-Blocking)

### Framer Motion Enhancements

| Element | Animation | Trigger |
|---------|-----------|---------|
| Upload zone | Border color fade (sky-500) | Drag-over |
| Preview image | Fade in (opacity 0 → 1, 200ms) | Image loaded |
| Toast | Slide in from top (200ms) | Error/success |
| Upload button spinner | Rotate 360° (1s loop) | Uploading |

### CSS Transitions (Fallback)
- Border color: `transition-colors duration-200`
- Opacity: `transition-opacity duration-200`

---

## Future UX Enhancements (Out of MVP Scope)

- [ ] Image cropping before upload
- [ ] Thumbnail size presets (square, 16:9, 4:3)
- [ ] Bulk thumbnail upload for multiple MOCs
- [ ] Auto-generate thumbnail from first page of instructions PDF
- [ ] Thumbnail rotation/flip tools
- [ ] Multiple thumbnail sizes (small, medium, large)
- [ ] Drag-to-reorder for multiple gallery images (INST-2030)
- [ ] Image optimization preview (before/after comparison)
- [ ] Undo thumbnail change

---

## Checklist for Implementation

### Component Setup
- [ ] Create `ThumbnailUpload` component directory
- [ ] Import `ImageUploadZone` from `app-sets-gallery`
- [ ] Configure `maxImages={1}`, remove reorder button
- [ ] Add thumbnail-specific labels and constraints

### Styling
- [ ] Apply LEGO-inspired theme (sky/teal colors)
- [ ] Ensure 16:9 or 1:1 aspect ratio for preview
- [ ] Add drag-over visual feedback (border color, opacity)
- [ ] Responsive layout for mobile

### Accessibility
- [ ] Add ARIA labels to all interactive elements
- [ ] Implement keyboard navigation (Tab, Enter, Space)
- [ ] Ensure color contrast compliance (WCAG AA)
- [ ] Test with screen reader (VoiceOver or NVDA)

### Error Handling
- [ ] Implement toast notifications for all error cases
- [ ] Client-side validation for file type and size
- [ ] Display backend error messages in UI
- [ ] Prevent double uploads (disable button during upload)

### Integration
- [ ] Wire up POST /api/v2/mocs/:id/thumbnail endpoint
- [ ] Update RTK Query cache on success
- [ ] Refresh gallery and detail page thumbnails
- [ ] Handle S3 upload failures gracefully

---

## Design Assets Needed

- Upload icon (SVG, 48x48px)
- Placeholder icon for no thumbnail (SVG, 64x64px)
- Loading spinner (SVG, 24x24px)

All icons should follow LEGO-inspired theme (sky/teal colors).
