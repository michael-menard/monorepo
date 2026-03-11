# UI/UX Notes: INST-1102 - Create Basic MOC

Generated: 2026-02-05
Story: INST-1102 - Create Basic MOC
Author: PM UI/UX Advisor

---

## UX Strategy Summary

Follow the established **AddItemPage pattern** from wishlist-gallery for consistency across the application. This story introduces the first MOC create flow, setting UX precedent for the entire Instructions feature domain.

---

## Page Layout & Structure

### Layout Pattern: Centered Form
```
┌─────────────────────────────────────────────────────────┐
│ [< Back to Gallery]                                     │
│                                                         │
│ # Add New MOC                                           │
│ Create a new MOC to add to your collection.            │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │  Form Fields (max-w-2xl centered)               │   │
│ │                                                  │   │
│ │  Title *                                         │   │
│ │  [_______________________________________]       │   │
│ │                                                  │   │
│ │  Description                                     │   │
│ │  [_______________________________________]       │   │
│ │  [_______________________________________]       │   │
│ │                                                  │   │
│ │  Theme *                                         │   │
│ │  [Select a theme                        ▼]       │   │
│ │                                                  │   │
│ │  Tags                                            │   │
│ │  [+ Add tags                              ]      │   │
│ │  [medieval] [castle] [architecture]              │   │
│ │                                                  │   │
│ │                    [Cancel] [Create MOC →]       │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Component Hierarchy
```
CreateMocPage
├── BackButton (ghost variant, left-aligned)
├── PageHeader
│   ├── Heading (h1, text-3xl font-bold)
│   └── Description (text-muted-foreground)
└── MocForm (max-w-2xl, centered, py-8)
    ├── TitleInput (required, auto-focus)
    ├── DescriptionTextarea (optional, rows=4)
    ├── ThemeSelect (required, dropdown)
    ├── TagInput (multi-select, comma-separated)
    └── FormActions
        ├── CancelButton (secondary)
        └── SubmitButton (primary, disabled until valid)
```

---

## Component Specifications

### 1. Page Header

**Purpose**: Orient user and set expectations

**Content**:
- **Heading**: "Add New MOC" (or "Create MOC")
- **Description**: "Create a new MOC to add to your collection." (or similar instructional text)

**Styling**:
```tsx
<div className="mb-8">
  <h1 className="text-3xl font-bold">Add New MOC</h1>
  <p className="text-muted-foreground mt-2">
    Create a new MOC to add to your collection.
  </p>
</div>
```

---

### 2. Back Button

**Purpose**: Provide escape route without committing changes

**Pattern**: Follow AddItemPage pattern
```tsx
<RouterLink to="/mocs">
  <Button variant="ghost" size="sm" className="mb-4">
    <ChevronLeft className="mr-1 h-4 w-4" />
    Back to Gallery
  </Button>
</RouterLink>
```

**Behavior**:
- Always visible at top-left
- Ghost variant (minimal visual weight)
- Icon + text for clarity
- No confirmation modal (unsaved changes guard is future work - INST-1200)

---

### 3. Title Input

**Purpose**: Primary identifier for the MOC

**Field Configuration**:
```tsx
<div>
  <Label htmlFor="title">
    Title <span className="text-red-500">*</span>
  </Label>
  <Input
    id="title"
    name="title"
    type="text"
    placeholder="e.g., Medieval Castle"
    required
    minLength={3}
    aria-invalid={errors.title ? 'true' : 'false'}
    aria-describedby={errors.title ? 'title-error' : undefined}
  />
  {errors.title && (
    <p id="title-error" className="text-sm text-red-500 mt-1">
      {errors.title}
    </p>
  )}
</div>
```

**Validation Messages**:
- Empty: "Title is required"
- Too short: "Title must be at least 3 characters"

**UX Enhancements**:
- **Auto-focus** on mount (AC3)
- Live character count (optional, nice-to-have)
- Clear icon to reset field (optional)

**Accessibility**:
- `htmlFor` label association
- `aria-invalid` on error state
- `aria-describedby` linking to error message

---

### 4. Description Textarea

**Purpose**: Optional context about the MOC

**Field Configuration**:
```tsx
<div>
  <Label htmlFor="description">
    Description <span className="text-muted-foreground text-sm">(optional)</span>
  </Label>
  <Textarea
    id="description"
    name="description"
    rows={4}
    placeholder="Tell us about your MOC..."
  />
</div>
```

**Behavior**:
- Optional field - no validation errors
- Multi-line (4 rows initially)
- Auto-resize on content (optional enhancement)

---

### 5. Theme Select

**Purpose**: Categorize MOC by theme

**Field Configuration**:
```tsx
<div>
  <Label htmlFor="theme">
    Theme <span className="text-red-500">*</span>
  </Label>
  <Select name="theme" required>
    <SelectTrigger id="theme">
      <SelectValue placeholder="Select a theme" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="Castle">Castle</SelectItem>
      <SelectItem value="Space">Space</SelectItem>
      <SelectItem value="City">City</SelectItem>
      <SelectItem value="Technic">Technic</SelectItem>
      <SelectItem value="Creator">Creator</SelectItem>
      <SelectItem value="Other">Other</SelectItem>
    </SelectContent>
  </Select>
  {errors.theme && (
    <p className="text-sm text-red-500 mt-1">{errors.theme}</p>
  )}
</div>
```

**Theme Options** (Recommended):
- Castle
- Space
- City
- Technic
- Creator
- Star Wars
- Harry Potter
- Marvel
- DC
- Friends
- Other

**Note**: Theme list should be validated with PM/stakeholders during elaboration.

**Accessibility**:
- Keyboard navigation (arrow keys to scroll options)
- Search-by-typing (start typing "cas" to jump to "Castle")

---

### 6. Tag Input (Multi-Select)

**Purpose**: Flexible tagging for search/organization

**Component**: Reuse `TagInput` from wishlist-gallery

**Pattern**:
```tsx
<div>
  <Label htmlFor="tags">
    Tags <span className="text-muted-foreground text-sm">(optional)</span>
  </Label>
  <TagInput
    id="tags"
    value={tags}
    onChange={setTags}
    placeholder="Add tags (comma-separated or press Enter)"
  />
  <p className="text-xs text-muted-foreground mt-1">
    Press Enter or comma to add a tag
  </p>
</div>
```

**Interaction**:
- Type tag name
- Press **Enter** or **comma** to add
- Tags appear as removable pills below input
- Click **X** on pill to remove
- Backspace on empty input removes last tag

**Visual Design**:
```
[Type tag...                                ]
[medieval × ] [castle × ] [architecture × ]
```

**Validation** (Optional):
- Max tags: 10
- Max tag length: 30 characters
- Duplicate detection (case-insensitive)

---

### 7. Form Actions

**Purpose**: Submit or cancel form

**Layout**:
```tsx
<div className="flex justify-end gap-3 mt-6">
  <Button
    type="button"
    variant="secondary"
    onClick={() => navigate({ to: '/mocs' })}
  >
    Cancel
  </Button>
  <Button
    type="submit"
    disabled={!isValid || isSubmitting}
  >
    {isSubmitting ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Creating...
      </>
    ) : (
      <>
        Create MOC
        <ChevronRight className="ml-2 h-4 w-4" />
      </>
    )}
  </Button>
</div>
```

**Button States**:
- **Submit Disabled**: Form invalid or submitting
- **Submit Loading**: Show spinner + "Creating..." text
- **Submit Enabled**: Default state when valid

**Accessibility**:
- Submit button has clear label
- Loading state announced to screen readers
- Focus management after submit

---

## Interaction Patterns

### Focus Management

**On Mount**:
1. Page loads
2. After 100ms delay (allow render)
3. Focus title input
4. User can immediately start typing

**After Validation Error**:
- Focus first invalid field
- Announce error to screen readers

**After Submit Error**:
- Focus first error field
- Scroll to error if needed

---

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Escape** | Cancel form, return to gallery (AC14) |
| **Tab** | Move between fields |
| **Enter** | Submit form (if valid) |
| **Enter** (in TagInput) | Add current tag |

---

### Form Validation Flow

```
1. User types in field
   ↓
2. onBlur → validate field
   ↓
3. Show inline error if invalid
   ↓
4. User corrects → remove error
   ↓
5. All valid → enable Submit button
```

**Validation Timing**:
- **onBlur**: Show error when user leaves field
- **onChange**: Clear error when user corrects
- **onSubmit**: Final validation before API call

---

### Loading & Submission States

**State 1: Idle**
- Form is editable
- Submit button enabled (if valid)

**State 2: Submitting**
- Form disabled (read-only)
- Submit button shows spinner + "Creating..."
- Cancel button disabled

**State 3: Success (Optimistic)**
- Show toast: "MOC created!"
- Immediate navigation to `/mocs/:id`
- Form no longer visible

**State 4: Error**
- Form re-enabled
- Error toast with **Retry** button
- Form data persists (not cleared)
- Data saved to localStorage for recovery

---

## Toast Notifications

### Success Toast
```tsx
toast.success('MOC created!', {
  description: `${mocTitle} has been added to your collection.`,
  duration: 5000
})
```

### Error Toast (with Retry)
```tsx
toast.error('Failed to create MOC', {
  description: 'Please try again or check your connection.',
  action: {
    label: 'Retry',
    onClick: () => handleRetry()
  },
  duration: 10000 // Longer for error with action
})
```

---

## Accessibility Checklist

- [ ] All form fields have associated `<Label>` with `htmlFor`
- [ ] Required fields indicated visually (`*`) and semantically (`required` attribute)
- [ ] Error messages linked via `aria-describedby`
- [ ] `aria-invalid` set on fields with errors
- [ ] Form has `aria-label` or `aria-labelledby`
- [ ] Submit button disabled state communicated to screen readers
- [ ] Loading state announced (`aria-live="polite"`)
- [ ] Focus management on mount (auto-focus title)
- [ ] Keyboard shortcuts documented (Escape to cancel)
- [ ] Color contrast meets WCAG AA (4.5:1 for text)

---

## Responsive Behavior

### Desktop (≥1024px)
- Form centered with `max-w-2xl`
- Two-column layout for Theme/Tags (optional enhancement)
- Spacious padding (`py-8`)

### Tablet (768px - 1023px)
- Single column layout
- Full width with side padding
- Maintained spacing

### Mobile (<768px)
- Full width with minimal padding
- Stack all fields vertically
- Larger touch targets (min 44x44px)
- Sticky form actions at bottom (optional)

---

## Design Tokens (Tailwind)

### Colors
- **Primary**: `bg-primary text-primary-foreground` (Submit button)
- **Secondary**: `bg-secondary text-secondary-foreground` (Cancel button)
- **Error**: `text-red-500 border-red-300` (Validation errors)
- **Muted**: `text-muted-foreground` (Optional labels, descriptions)

### Typography
- **Page Heading**: `text-3xl font-bold`
- **Field Labels**: `text-sm font-medium`
- **Descriptions**: `text-sm text-muted-foreground`
- **Error Messages**: `text-sm text-red-500`

### Spacing
- **Form Container**: `max-w-2xl py-8`
- **Field Gap**: `space-y-6` (between fields)
- **Label-Input Gap**: `space-y-2`
- **Error Message Gap**: `mt-1`

---

## Reuse Recommendations

### From Wishlist-Gallery
1. **AddItemPage.tsx** → CreateMocPage structure
2. **WishlistForm** → Form layout and validation pattern
3. **TagInput** → Directly reusable for tags field
4. **useLocalStorage hook** → Form recovery on failure

### From @repo/app-component-library
- `Button`, `Input`, `Textarea`, `Label`
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- All components follow LEGO-inspired Sky/Teal theme

---

## Edge Cases & Error States

### Empty State
Not applicable (this is a create form, no empty state)

### Network Error
- Show error toast with Retry button
- Keep form data (don't clear)
- Save to localStorage for recovery

### Validation Error from API
- Display error inline below relevant field
- Focus field with error
- Keep form enabled for correction

### Duplicate Title (if enforced)
- Error below title field: "A MOC with this title already exists"
- Suggest alternative or edit existing

---

## Future Enhancements (Out of Scope)

These are NOT part of INST-1102 but documented for future consideration:

- **Unsaved Changes Modal** (INST-1200): "You have unsaved changes. Leave without saving?"
- **Auto-save Draft**: Periodic localStorage save while typing
- **Image Upload**: Cover image selection (INST-1103)
- **Rich Text Editor**: For description field
- **Theme Icons**: Show icon next to each theme option
- **Tag Autocomplete**: Suggest existing tags as user types
- **Duplicate Detection**: Real-time check for similar MOC titles

---

## Questions for Elaboration

1. **Theme List**: What are the definitive theme options? Should themes be fetched from API or hardcoded?
2. **Slug Visibility**: Should the generated slug be shown to the user for editing?
3. **Tag Limits**: Maximum number of tags? Maximum tag length?
4. **Description Length**: Maximum character count for description?
5. **Title Uniqueness**: Should titles be unique per user? If so, how to handle collisions?

---

## Component File Structure

```
apps/web/app-instructions-gallery/src/
├── pages/
│   ├── CreateMocPage.tsx          # Main page component
│   └── __tests__/
│       └── CreateMocPage.test.tsx # Unit tests
├── components/
│   ├── MocForm/                   # Reusable form component
│   │   ├── index.tsx
│   │   └── __tests__/
│   │       └── MocForm.test.tsx
│   └── TagInput/                  # Copy from wishlist
│       ├── index.tsx
│       └── __tests__/
│           └── TagInput.test.tsx
```

---

## Notes

- **Consistency**: This UX pattern establishes the standard for all MOC create/edit forms
- **Reuse**: Maximum reuse from wishlist-gallery reduces implementation time and maintains UX consistency
- **Accessibility**: All WCAG AA standards met for keyboard nav, screen readers, color contrast
- **Mobile-first**: Design works on all screen sizes with appropriate adaptations
