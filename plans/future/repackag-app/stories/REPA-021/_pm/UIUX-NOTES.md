# UI/UX Notes: REPA-021

## Verdict
**PASS-WITH-NOTES** - UI changes are minimal (component relocation), but design system compliance must be verified.

## MVP Component Architecture

### Components Required for Core Journey

1. **DashboardSkeleton** (relocated to library)
   - Reuse: Library's `Skeleton` primitive from `feedback/skeleton.tsx`
   - Pattern: Follow `MocCardSkeleton` structure (lines 220-262)
   - Location: Add to `@repo/app-component-library/src/feedback/skeleton.tsx`

2. **EmptyState** (new generic component)
   - Reuse: Library's `Button` component, `lucide-react` icons
   - Pattern: Follow component structure from `feedback/` module
   - Location: `@repo/app-component-library/src/feedback/empty-states.tsx`
   - Props API:
     ```typescript
     {
       icon: LucideIcon
       title: string
       description: string
       action?: {
         label: string
         onClick?: () => void
         href?: string
       }
       features?: Array<{ icon: LucideIcon; title: string; description: string }>
     }
     ```

3. **EmptyDashboard** (preset wrapping EmptyState)
   - Reuse: `EmptyState` component with dashboard-specific defaults
   - Pattern: Preset pattern (similar to how shadcn provides component variants)
   - Location: Same file as `EmptyState` (`empty-states.tsx`)

### Reuse Targets in packages/**

- `@repo/app-component-library/src/_primitives/button.tsx` - For CTA buttons
- `@repo/app-component-library/src/feedback/skeleton.tsx` - Base `Skeleton` primitive
- `lucide-react` - Icons (already a library dependency)
- `@tanstack/react-router` - `Link` component for navigation CTAs

### shadcn Primitives for Core UI

- `Button` - Already exists in `_primitives/`
- `Skeleton` - Already exists in `feedback/skeleton.tsx`
- No new primitives required

## MVP Accessibility (Blocking Only)

### Requirements That Prevent Core Journey Usage

1. **Loading State Announcement**
   - **Requirement**: Screen readers must announce when loading starts and completes
   - **Implementation**: Use `aria-live="polite"` region for loading → loaded transitions
   - **Test**: VoiceOver/NVDA announce "Dashboard loading" then "Dashboard loaded"

2. **Empty State Focus Management**
   - **Requirement**: CTA button must be keyboard-accessible
   - **Implementation**: Ensure `Button` component (already a11y-compliant) is used
   - **Test**: Tab navigation reaches CTA button, Enter/Space activates

3. **Skeleton Semantics**
   - **Requirement**: Loading skeletons must not confuse screen readers
   - **Implementation**: Add `aria-busy="true"` and `aria-label="Loading dashboard"` to skeleton container
   - **Test**: Screen reader announces loading state, doesn't read skeleton as content

### Basic Keyboard Navigation for Core Flow

- **Loading state**: No interaction required (passive display)
- **Empty state CTA**: Must be reachable via Tab, activatable via Enter/Space
- **Feature highlights**: Should be navigable, but not blocking if read-only

### Critical Screen Reader Requirements

1. **DashboardSkeleton**: Container marked with `role="status"` and `aria-label="Loading dashboard"`
2. **EmptyState**:
   - Title and description readable
   - CTA button has accessible name
   - Icon has `aria-hidden="true"` (decorative)
3. **Feature highlights**: Each feature should have accessible text (no icon-only content)

## MVP Design System Rules

### Token-Only Colors (Hard Gate)

All color classes must use design tokens from Tailwind config:
- Background: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`, `text-primary`
- Borders: `border-border`, `border-input`
- Accents: `bg-primary`, `text-primary-foreground`

**Violations to avoid**:
- Hardcoded hex values in className
- Arbitrary values like `bg-[#F5F5F5]`
- Direct Tailwind color names like `bg-gray-100`

**Verification**:
- Grep codebase for `bg-\[#` or `text-\[#` patterns
- Lint rule should catch arbitrary color values

### `_primitives` Import Requirement

Components MUST import shadcn primitives from `_primitives/`:
```typescript
// CORRECT
import { Button } from '@repo/app-component-library'
// or
import { Button } from '../_primitives/button'

// WRONG
import { Button } from '@/components/ui/button'
```

**Verification**:
- Check all imports in new `empty-states.tsx` file
- Ensure no direct shadcn imports outside `_primitives/`

## MVP Playwright Evidence

### Core Journey Demonstration Steps

1. **Loading State Journey**:
   ```typescript
   test('dashboard loading state shows skeleton', async ({ page }) => {
     await page.goto('/')
     // Assert skeleton visible
     await expect(page.locator('[data-testid="dashboard-skeleton"]')).toBeVisible()
     // Wait for data to load
     await page.waitForSelector('[data-testid="dashboard-stats"]')
     // Assert skeleton hidden
     await expect(page.locator('[data-testid="dashboard-skeleton"]')).not.toBeVisible()
   })
   ```

2. **Empty State Journey**:
   ```typescript
   test('empty dashboard shows CTA to add first MOC', async ({ page }) => {
     await page.goto('/')
     await page.waitForLoadState('networkidle')
     // Assert empty state visible
     await expect(page.getByRole('button', { name: /add your first moc/i })).toBeVisible()
     // Click CTA
     await page.getByRole('button', { name: /add your first moc/i }).click()
     // Assert navigates to add MOC page (or opens modal)
     await expect(page).toHaveURL(/.*add-moc.*/)
   })
   ```

3. **Accessibility Journey** (keyboard navigation):
   ```typescript
   test('empty state CTA is keyboard accessible', async ({ page }) => {
     await page.goto('/')
     await page.waitForLoadState('networkidle')
     // Tab to CTA button
     await page.keyboard.press('Tab') // skip other focusable elements if needed
     // Assert CTA has focus
     await expect(page.getByRole('button', { name: /add your first moc/i })).toBeFocused()
     // Activate with keyboard
     await page.keyboard.press('Enter')
     // Assert action triggered
   })
   ```

## Non-MVP UI/UX Notes (FUTURE-UIUX.md)

These items should be tracked but are NOT blocking for MVP:

### UX Polish Opportunities
- **Skeleton animation**: Add pulse animation to make loading feel more dynamic
- **Empty state illustration**: Replace icon with custom LEGO-themed illustration
- **Feature highlight animations**: Stagger animations when feature cards appear
- **CTA button hover effects**: Add subtle scale or glow effect

### Accessibility Enhancements
- **High contrast mode**: Test in Windows High Contrast mode
- **Reduced motion**: Respect `prefers-reduced-motion` for animations
- **Focus visible improvements**: Enhance focus indicator styling beyond browser defaults
- **ARIA descriptions**: Add `aria-describedby` for richer context

### UI Improvements
- **Responsive skeleton**: Adjust skeleton column count based on viewport
- **Empty state variants**: Create presets for other empty states (wishlist, gallery, etc.)
- **Skeleton shimmer effect**: Add shimmer gradient animation
- **Dark mode verification**: Ensure colors work in dark theme

## Design Consistency Checklist

- [ ] Spacing follows 4px/8px grid (use `space-` tokens)
- [ ] Typography uses `text-` size tokens (no arbitrary font sizes)
- [ ] Border radius uses `rounded-` tokens (no `rounded-[12px]`)
- [ ] Icons from `lucide-react` (consistent icon family)
- [ ] Button variants use library's `Button` component (no custom button styles)
- [ ] Hover/focus states use library's interaction patterns
- [ ] Loading states use library's `Skeleton` primitive
- [ ] Empty states follow library's feedback module pattern

## Component Prop API Design

### EmptyState Component

**Props Schema (Zod)**:
```typescript
const EmptyStatePropsSchema = z.object({
  icon: z.custom<LucideIcon>(),
  title: z.string().min(1),
  description: z.string().min(1),
  action: z.object({
    label: z.string().min(1),
    onClick: z.function().optional(),
    href: z.string().optional(),
  }).optional(),
  features: z.array(z.object({
    icon: z.custom<LucideIcon>(),
    title: z.string(),
    description: z.string(),
  })).optional(),
  className: z.string().optional(),
})
```

**Design Notes**:
- `icon` and `title` are required (every empty state needs these)
- `description` required (provides context for the empty state)
- `action` optional (some empty states might not have actions)
- `features` optional (only dashboard empty state uses this currently)
- `className` optional (for consumer customization)

### EmptyDashboard Preset

**Props Schema (Zod)**:
```typescript
const EmptyDashboardPropsSchema = z.object({
  onAddClick: z.function().optional(),
  addLink: z.string().optional(),
  className: z.string().optional(),
})
```

**Design Notes**:
- Wraps `EmptyState` with dashboard-specific defaults
- `onAddClick` OR `addLink` (mutually exclusive via runtime check)
- Hard-codes icon, title, description, and features
- Consumers only customize the action behavior

## Visual Regression Testing

**Before/After Comparison Strategy**:

1. **Capture baseline screenshots** (before consolidation):
   - `main-app` dashboard loading state
   - `main-app` dashboard empty state
   - `app-dashboard` dashboard loading state
   - `app-dashboard` dashboard empty state

2. **Capture comparison screenshots** (after consolidation):
   - Same views using library components

3. **Visual diff**:
   - Use Percy, Chromatic, or Playwright's built-in screenshot comparison
   - Assert pixel-perfect match (or <1% diff threshold)
   - Flag any layout shifts or color differences

**Storybook Visual Testing**:
- Create stories for all component variants
- Use Storybook's viewport addon to test responsive behavior
- Compare Storybook renderings to original in-app renderings

## Icon Guidelines

**Icon Size Consistency**:
- Empty state main icon: `size={64}` or `className="h-16 w-16"`
- Feature highlight icons: `size={24}` or `className="h-6 w-6"`
- CTA button icon (if used): `size={16}` or `className="h-4 w-4"`

**Icon Color**:
- Use `text-muted-foreground` for decorative icons
- Use `text-primary` for action-related icons
- Ensure sufficient contrast (4.5:1 for text, 3:1 for UI components)

## Layout Structure

### DashboardSkeleton Layout
```
Container (full width)
├─ Header
│  ├─ Title Skeleton (h1 size)
│  └─ Quick Actions Skeleton (3 buttons)
├─ Stats Row
│  └─ 3 Stat Card Skeletons (equal width)
└─ MOC Grid
   └─ 5 MOC Card Skeletons (responsive grid)
```

### EmptyDashboard Layout
```
Container (centered, max-w-2xl)
├─ Icon (centered, 64x64)
├─ Title (centered, h2)
├─ Description (centered, body text)
├─ Feature Highlights Grid (2x2)
│  └─ 4 Feature Cards (icon + title + description)
└─ CTA Button (centered)
```

**Responsive Behavior**:
- Mobile (<768px): Single column, stacked layout
- Tablet (768px-1024px): 2-column feature grid
- Desktop (>1024px): 2-column feature grid (same as tablet)

## Potential UI Blockers

1. **Link vs Button for CTA**:
   - **Issue**: Should CTA be a `<Link>` (routing) or `<Button>` (action)?
   - **Resolution**: Support both via props (prefer `href` for routing, `onClick` for actions)
   - **Implementation**: Render `<Link>` if `href` provided, else `<Button>`

2. **Feature Highlights in Generic EmptyState**:
   - **Issue**: Are feature highlights specific to dashboard, or generic?
   - **Resolution**: Make `features` prop optional on `EmptyState`, only `EmptyDashboard` uses it
   - **Implementation**: Conditionally render features grid only if `features` prop provided

3. **Icon Import Strategy**:
   - **Issue**: Should `icon` prop accept string name or React component?
   - **Resolution**: Accept `LucideIcon` type (React component) for type safety
   - **Implementation**: Consumer imports icon: `import { PackagePlus } from 'lucide-react'`

## Testing Checklist

- [ ] Visual regression tests pass (pixel-perfect match)
- [ ] Storybook stories render without console errors
- [ ] Keyboard navigation works (Tab to CTA, Enter to activate)
- [ ] Screen reader announces loading and empty states
- [ ] All colors use design tokens (no hardcoded values)
- [ ] Responsive behavior matches original (mobile, tablet, desktop)
- [ ] Dark mode rendering works (if applicable)
- [ ] Focus indicators visible and styled appropriately
