# UI/UX Notes: INST-1108 Edit MOC Metadata

Generated: 2026-02-09

---

## Verdict

**PASS-WITH-NOTES**

EditMocPage is MVP-feasible with high component reuse (MocForm). Core user journey (navigate to edit, change fields, save/cancel) is achievable with existing design patterns. Notes address critical consistency, accessibility, and edge case UX requirements.

---

## MVP Component Architecture

### Components Required for Core Journey

**New Component:**
- **EditMocPage** (`apps/web/app-instructions-gallery/src/pages/EditMocPage.tsx`)
  - Container for edit workflow
  - Handles MOC data fetching, mutation triggering, navigation
  - Reuses MocForm component for actual form UI

**Reused Components (100% Reuse):**
- **MocForm** (`apps/web/app-instructions-gallery/src/components/MocForm/index.tsx`)
  - Already implemented in INST-1102 (Create Basic MOC)
  - Props: `initialValues`, `onSubmit`, `onCancel`, `isSubmitting`, `apiError`
  - Fields: title (min 3, max 500), description (max 5000), theme (required), tags (max 20)
  - Features: Auto-focus, validation, Cmd+Enter shortcut, field-level errors
  - **DO NOT DUPLICATE** - Pass `initialValues` from fetched MOC data

**Reused from @repo/app-component-library:**
- `Button` (primary for Save, secondary for Cancel)
- `Input`, `Textarea`, `Label`, `Select` (already used in MocForm)
- Toast components for success/error feedback

**Reused Hooks:**
- `useGetMocDetailQuery(mocId)` from `@repo/api-client/rtk/instructions-api`
- `useUpdateMocMutation()` from `@repo/api-client/rtk/instructions-api`
- `useLocalStorage` for form recovery
- `useNavigate` from `react-router-dom`

### Reuse Targets in packages/**

1. **@repo/app-component-library**: All UI primitives (Button, Input, Textarea, Select, Label)
2. **@repo/api-client/rtk/instructions-api**: RTK Query hooks (useGetMocDetailQuery, useUpdateMocMutation)
3. **@repo/api-client/schemas/instructions**: UpdateMocInput schema for validation
4. **@repo/logger**: Structured logging for errors and user actions

### shadcn Primitives for Core UI

- `Button` (from `_primitives/button`)
- `Input` (from `_primitives/input`)
- `Textarea` (from `_primitives/textarea`)
- `Select` (from `_primitives/select`)
- `Label` (from `_primitives/label`)
- `Toast` (from `_primitives/toast`)

**Design System Rule**: All components MUST import from `@repo/app-component-library`, NOT from individual `_primitives/` paths.

---

## MVP Visual Design

### Layout Structure

**Page Layout** (Mirror CreateMocPage):
```
┌─────────────────────────────────────────┐
│ Header                                  │
│  ← Back to [MOC Title]    [Cancel] [Save]
├─────────────────────────────────────────┤
│                                         │
│  Editing: [MOC Title]                   │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  MocForm Component                │ │
│  │  - Title input                    │ │
│  │  - Description textarea           │ │
│  │  - Theme select                   │ │
│  │  - Tags multi-select              │ │
│  │  - (Buttons at bottom of form)    │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Grid/Flexbox:**
- Max width: `max-w-3xl` (768px) for comfortable reading/editing
- Centered layout: `mx-auto`
- Padding: `px-4 py-8`

### Header Section

**Back Link:**
- Text: "← Back to [MOC Title]"
- Style: `text-sky-600 hover:text-sky-700` (LEGO Sky theme)
- Behavior: Navigates to `/mocs/:id` on click
- Keyboard: Focusable, Enter key navigates

**Page Title:**
- Text: "Editing: [MOC Title]" (dynamic, shows current MOC title)
- Style: `text-3xl font-bold text-gray-900`
- Purpose: Clear context for user (which MOC they're editing)

**Action Buttons:**
- **Cancel Button**:
  - Text: "Cancel"
  - Style: `variant="outline"` (secondary style)
  - Position: Right side, before Save button
  - Behavior: Navigates to detail page without saving
- **Save Button**:
  - Text: "Save" (or "Saving..." during submission)
  - Style: `variant="default"` (primary style, sky-600 background)
  - Position: Right side, last button
  - States:
    - Default: Enabled and clickable
    - Invalid form: Disabled (`opacity-50 cursor-not-allowed`)
    - Submitting: Loading spinner + "Saving..." text
  - Keyboard: Cmd+Enter triggers save (handled by MocForm)

### Form Section

**MocForm Component** (reused exactly as-is):
- Title Input:
  - Label: "Title"
  - Placeholder: "Enter MOC title"
  - Validation: min 3, max 500 characters
  - Error message below input if invalid
- Description Textarea:
  - Label: "Description"
  - Placeholder: "Describe your MOC (optional)"
  - Validation: max 5000 characters
  - Resizable: `resize-y`
- Theme Select:
  - Label: "Theme"
  - Options: Castle, City, Space, Technic, etc.
  - Required field
- Tags Multi-Select:
  - Label: "Tags"
  - Validation: max 20 tags
  - Visual: Tag chips with remove buttons

**Form Buttons** (inside MocForm):
- MocForm already has Cancel and Save buttons
- EditMocPage can hide these and use header buttons instead (via prop like `showButtons={false}`)
- OR: Keep MocForm buttons and remove header buttons (consistency with CreateMocPage)

**Recommendation**: Keep MocForm buttons at bottom of form for consistency with CreateMocPage. Remove header action buttons to avoid duplication.

### Loading States

**Initial Load (Fetching MOC Data):**
- Display: Loading skeleton matching form layout
- Components:
  - Skeleton for title input: `h-10 w-full bg-gray-200 animate-pulse`
  - Skeleton for description: `h-32 w-full bg-gray-200 animate-pulse`
  - Skeleton for theme select: `h-10 w-64 bg-gray-200 animate-pulse`
  - Skeleton for tags: `h-10 w-full bg-gray-200 animate-pulse`
- Duration: Until `useGetMocDetailQuery` resolves

**Submitting (Saving Changes):**
- Save button shows spinner icon + "Saving..." text
- Save button disabled (prevents double submit)
- Form inputs remain enabled (user can still see their changes)
- No full-page loading overlay (keep it lightweight)

### Success/Error Feedback

**Success Toast:**
- Message: "MOC updated!"
- Icon: Checkmark ✓ (green)
- Duration: 3 seconds
- Position: Top-right
- Auto-dismiss: Yes
- Action: Redirect to detail page after toast shown

**Error Toast:**
- Message: "Failed to update MOC. [Error details]" (e.g., "Title too short")
- Icon: X (red)
- Duration: 5 seconds (longer to read error)
- Action Buttons:
  - **Retry**: Triggers save mutation again
  - **Dismiss**: Closes toast
- Auto-dismiss: No (requires user action to close or retry)
- Position: Top-right

**Form Recovery Toast:**
- Message: "Unsaved changes found. Restore?"
- Icon: Info ℹ️ (blue)
- Action Buttons:
  - **Restore**: Loads draft from localStorage into form
  - **Discard**: Clears localStorage draft
- Duration: 10 seconds or until user clicks
- Position: Top-right

### Error States

**404 Error (MOC Not Found or Unauthorized):**
- Display: Error page (not form)
- Message: "MOC not found"
- Subtext: "This MOC doesn't exist or you don't have permission to edit it."
- Action: Button "Go to My MOCs" → navigates to `/mocs` (gallery)
- Style: Centered layout, error icon, gray text

**Network Error (Failed to Load):**
- Display: Error state with retry option
- Message: "Failed to load MOC"
- Subtext: "Check your connection and try again."
- Action: Button "Retry" → refetches MOC data
- Style: Centered layout, error icon

---

## MVP Accessibility (Blocking Only)

### Critical Screen Reader Requirements

1. **Page Title Announcement:**
   - `<h1>Editing: {mocTitle}</h1>` for screen reader context
   - ARIA live region for success/error toasts

2. **Form Labels:**
   - All inputs must have associated `<label>` elements (MocForm already implements this)
   - Labels use `htmlFor` attribute pointing to input `id`

3. **Error Messages:**
   - Field-level errors announced via `aria-describedby`
   - Error text linked to input: `<input aria-describedby="title-error" />`

4. **Loading States:**
   - Loading skeleton has `aria-busy="true"` and `aria-live="polite"`
   - Announce: "Loading MOC data" when fetching

5. **Button States:**
   - Save button: `aria-disabled="true"` when form invalid or submitting
   - Screen reader text for loading: "Saving, please wait"

6. **Toast Announcements:**
   - Success toast: `role="status"` + `aria-live="polite"`
   - Error toast: `role="alert"` + `aria-live="assertive"`

### Basic Keyboard Navigation for Core Flow

**Tab Order:**
1. Back link
2. Title input (auto-focused on page load)
3. Description textarea
4. Theme select
5. Tags input
6. Cancel button
7. Save button

**Keyboard Shortcuts:**
- **Escape**: Trigger cancel (navigate to detail page)
- **Cmd/Ctrl+Enter**: Trigger save (submit form)
- **Tab**: Move forward through inputs
- **Shift+Tab**: Move backward

**Focus Management:**
- On page load: Auto-focus title input (MocForm handles this)
- On error: Focus first invalid input
- On toast display: No focus trap (toast is non-modal)

### Focus Indicators

- All interactive elements (inputs, buttons, links) must have visible focus ring
- Use `focus-visible:ring-2 focus-visible:ring-sky-500` for consistent focus styles
- No `outline: none` without replacement focus indicator

---

## MVP Design System Rules

### Token-Only Colors (Hard Gate)

**ALLOWED** (Tailwind theme tokens):
- `bg-sky-600`, `bg-sky-700` (primary brand color)
- `text-gray-900`, `text-gray-700`, `text-gray-500` (text hierarchy)
- `border-gray-300` (input borders)
- `bg-red-50`, `text-red-600` (error states)
- `bg-green-50`, `text-green-600` (success states)
- `bg-blue-50`, `text-blue-600` (info states)

**FORBIDDEN**:
- Hex colors: `#1a73e8`, `#ff0000`
- RGB: `rgb(26, 115, 232)`
- Inline styles with colors: `style={{ color: 'red' }}`

**Enforcement**: ESLint rule `no-hardcoded-colors` will flag violations.

### _primitives Import Requirement

**CORRECT**:
```tsx
import { Button, Input, Textarea, Select, Label } from '@repo/app-component-library'
```

**WRONG**:
```tsx
import { Button } from '@repo/app-component-library/_primitives/button'
import { Input } from '@repo/app-component-library/_primitives/input'
```

**Reason**: `@repo/app-component-library` is the public API. Internal `_primitives/` paths may change.

---

## MVP Playwright Evidence

### Core Journey Demonstration Steps

**Scenario: Edit MOC Title and Save**

1. **Setup:**
   ```typescript
   await page.goto('/mocs/test-moc-123/edit')
   ```

2. **Verify form pre-populated:**
   ```typescript
   const titleInput = page.locator('input[name="title"]')
   await expect(titleInput).toHaveValue('Castle MOC')
   ```

3. **Change title:**
   ```typescript
   await titleInput.fill('Medieval Castle')
   ```

4. **Submit form:**
   ```typescript
   await page.locator('button', { hasText: 'Save' }).click()
   ```

5. **Verify success:**
   ```typescript
   await expect(page.locator('text="MOC updated!"')).toBeVisible()
   await expect(page).toHaveURL('/mocs/test-moc-123')
   await expect(page.locator('h1')).toContainText('Medieval Castle')
   ```

**Scenario: Cancel Edit**

1. **Navigate to edit page:**
   ```typescript
   await page.goto('/mocs/test-moc-123/edit')
   ```

2. **Make changes:**
   ```typescript
   await page.locator('input[name="title"]').fill('New Title')
   ```

3. **Click Cancel:**
   ```typescript
   await page.locator('button', { hasText: 'Cancel' }).click()
   ```

4. **Verify no save:**
   ```typescript
   await expect(page).toHaveURL('/mocs/test-moc-123')
   await expect(page.locator('h1')).toContainText('Castle MOC') // Original title
   ```

**Scenario: Validation Prevents Invalid Submission**

1. **Navigate to edit page:**
   ```typescript
   await page.goto('/mocs/test-moc-123/edit')
   ```

2. **Enter invalid title:**
   ```typescript
   await page.locator('input[name="title"]').fill('AB') // Too short
   ```

3. **Verify Save button disabled:**
   ```typescript
   const saveButton = page.locator('button', { hasText: 'Save' })
   await expect(saveButton).toBeDisabled()
   ```

4. **Verify error message:**
   ```typescript
   await expect(page.locator('text="Title must be at least 3 characters"')).toBeVisible()
   ```

**Artifacts to Capture:**
- Screenshot on failure
- Playwright trace for debugging
- Network logs showing PATCH request (or lack thereof for cancel/validation)

---

## Notes for Implementation

### Consistency with CreateMocPage

EditMocPage MUST match CreateMocPage in:
1. **Layout**: Same max-width, padding, spacing
2. **Header**: Same back link style, page title format
3. **Form**: Reuse MocForm component exactly
4. **Buttons**: Same button styles (primary sky-600, secondary outline)
5. **Toasts**: Same toast styling, duration, position
6. **Error handling**: Same error toast with retry pattern

**DRY Principle**: If CreateMocPage and EditMocPage share layout logic, consider extracting a `MocFormPage` wrapper component. However, avoid premature abstraction—only extract if duplication becomes painful.

### Form Pre-Population Pattern

**Data Flow:**
1. EditMocPage uses `useGetMocDetailQuery(mocId)` to fetch MOC data
2. On success, extract: `{ title, description, theme, tags }` from response
3. Pass to MocForm as `initialValues` prop:
   ```tsx
   <MocForm
     initialValues={{
       title: moc.title,
       description: moc.description,
       theme: moc.theme,
       tags: moc.tags,
     }}
     onSubmit={handleSave}
     onCancel={handleCancel}
     isSubmitting={isUpdating}
     apiError={updateError}
   />
   ```

**Key Point**: MocForm must support `initialValues` prop. If not already implemented, add it to MocForm (should be straightforward with controlled inputs).

### Form Recovery localStorage Key

**Key Pattern**: `moc-edit-draft-${mocId}`

**Example**: `moc-edit-draft-test-moc-123`

**Isolation**: Each MOC gets its own localStorage key, preventing conflicts between multiple edit sessions.

**Cleanup**: Clear localStorage draft on:
- Successful save
- User clicks "Discard" in recovery toast
- After 7 days (optional expiration logic)

### Navigation Patterns

**Back Link:**
- Always navigates to detail page: `/mocs/:mocId`
- Use relative navigation if possible: `navigate('..')` or `navigate(-1)`

**Cancel Button:**
- Same as back link: `/mocs/:mocId`
- Confirm if unsaved changes exist (future: INST-1200)

**After Save:**
- Redirect to detail page: `/mocs/:mocId`
- Show success toast before redirect

**Escape Key:**
- Trigger cancel action
- Implementation: `useEffect` with `keydown` event listener

---

## Edge Case UX Considerations

### 1. MOC Data Fetch Fails
**UX**: Show error state with Retry button. Do not render form with empty fields.

### 2. MOC Deleted by Another User During Edit
**UX**: On save, backend returns 404. Show error toast: "This MOC no longer exists." Redirect to gallery.

### 3. Concurrent Edits (Multiple Tabs)
**Out of scope for MVP**. Last write wins. Future: Optimistic locking or conflict detection.

### 4. Slow Network (Form Data Load)
**UX**: Show loading skeleton for up to 10 seconds. After 10 seconds, show "Taking longer than usual..." message with Retry button.

### 5. Browser Refresh During Edit
**UX**: If localStorage draft exists, show recovery toast. Otherwise, re-fetch MOC data and load fresh form.

### 6. User Changes Mind After Clicking Save
**Out of scope for MVP**. No "Undo" feature. Future: Add "Undo" button in success toast (short window to revert).

---

## Out of Scope (Future Work)

These are NOT required for MVP but documented for future iterations:

1. **Unsaved Changes Guard** (INST-1200):
   - Modal: "You have unsaved changes. Leave without saving?"
   - Prevent navigation away from edit page if form is dirty

2. **Optimistic UI Updates**:
   - Update detail page UI before backend confirms save
   - Rollback on error

3. **Edit History/Audit Trail**:
   - Show "Last updated by [User] on [Date]"
   - Track change history

4. **Inline Edit on Detail Page**:
   - Edit title directly on detail page without separate edit page
   - Auto-save on blur

5. **Keyboard Shortcut Help**:
   - `?` key shows keyboard shortcuts modal
   - Cmd+S to save (in addition to Cmd+Enter)

6. **Field-Level Diffing**:
   - Highlight which fields changed since last save
   - Show "Revert" button per field

7. **Rich Text Editor for Description**:
   - Markdown support
   - Formatting toolbar

8. **Auto-Save Drafts**:
   - Save to localStorage every 5 seconds while editing

9. **Collaborative Editing**:
   - Show if another user is editing the same MOC
   - Conflict resolution UI

10. **Accessibility Enhancements (Beyond MVP)**:
    - High contrast mode
    - Larger touch targets (mobile)
    - WCAG AAA compliance (MVP targets AA)

---

## Success Criteria

This UI/UX plan is successful when:
1. ✅ EditMocPage matches CreateMocPage visual design and layout
2. ✅ MocForm component is reused without duplication
3. ✅ Form pre-populates correctly with MOC data
4. ✅ Save and Cancel buttons work as expected
5. ✅ Success and error toasts display correctly
6. ✅ Loading and error states handled gracefully
7. ✅ All interactive elements are keyboard accessible
8. ✅ Screen reader announcements work for critical actions
9. ✅ No hardcoded colors (token-only enforcement)
10. ✅ Focus management is clear and logical
11. ✅ Playwright E2E tests pass for core journey

---

## Implementation Checklist

- [ ] Create EditMocPage component
- [ ] Fetch MOC data with `useGetMocDetailQuery`
- [ ] Render loading skeleton while fetching
- [ ] Render 404 error state if MOC not found
- [ ] Pass MOC data as `initialValues` to MocForm
- [ ] Wire up `useUpdateMocMutation` on form submit
- [ ] Implement Cancel button (navigate to detail page)
- [ ] Implement Escape key handler for cancel
- [ ] Show success toast on save success
- [ ] Show error toast with Retry button on save error
- [ ] Redirect to detail page after successful save
- [ ] Implement form recovery from localStorage
- [ ] Show recovery toast if draft exists
- [ ] Clear localStorage draft on successful save
- [ ] Add ARIA labels and screen reader support
- [ ] Ensure keyboard navigation works (Tab, Escape, Cmd+Enter)
- [ ] Add focus indicators to all interactive elements
- [ ] Test with screen reader (VoiceOver on Mac, NVDA on Windows)
- [ ] Verify token-only colors (no hex/RGB)
- [ ] Verify `@repo/app-component-library` imports (no _primitives/ paths)
- [ ] Write Playwright E2E tests for core journey
- [ ] Capture screenshots and traces on failure
