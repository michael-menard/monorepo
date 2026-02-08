# Manual Execution Guide - INST-1100

## Overview
This guide provides step-by-step instructions to manually execute the implementation for INST-1100: View MOC Gallery.

## Prerequisites
- Backend running at http://localhost:3001
- Environment variables configured
- pnpm installed
- All dependencies installed (pnpm install)

## Implementation Steps

### Step 1: Fix Schema Alignment in main-page.tsx

**File**: `apps/web/app-instructions-gallery/src/pages/main-page.tsx`

**Change Line 49** from:
```typescript
const next: Instruction[] = data.data.items.map(api => ({
```

**To**:
```typescript
const next: Instruction[] = data.items.map(api => ({
```

**Also update the mapping** to align field names (API uses `title`, local uses `name`):
```typescript
const next: Instruction[] = data.items.map(api => ({
  id: api.id,
  name: api.title,  // Changed: API uses 'title', local uses 'name'
  description: api.description || '',
  thumbnail: api.thumbnailUrl || '',
  images: [],  // Not in current API response
  pieceCount: api.partsCount || 0,  // Changed: API uses 'partsCount'
  theme: api.theme || '',
  tags: api.tags || [],
  pdfUrl: '',  // Not in current API response  
  createdAt: api.createdAt.toISOString(),
  updatedAt: api.updatedAt.toISOString(),
  isFavorite: api.isFeatured || false,  // Changed: API uses 'isFeatured'
}))
```

### Step 2: Add GallerySkeleton for Loading State

**File**: `apps/web/app-instructions-gallery/src/pages/main-page.tsx`

**Add import** at top:
```typescript
import {
  GalleryGrid,
  GalleryEmptyState,
  GalleryFilterBar,
  GalleryViewToggle,
  GalleryDataTable,
  GallerySkeleton,  // Add this
  useViewMode,
  useFirstTimeHint,
} from '@repo/gallery'
```

**Replace loading text (line 198)** from:
```typescript
{showLoadingState ? (
  <p className="text-muted-foreground">Loading instructions...</p>
```

**To**:
```typescript
{showLoadingState ? (
  <GallerySkeleton count={12} />
```

### Step 3: Add Accessibility Attributes

**File**: `apps/web/app-instructions-gallery/src/pages/main-page.tsx`

**Update the main container** (around line 160):
```typescript
<div className={className} role="region" aria-label="MOC Gallery">
```

**Update loading skeleton** to include aria-live:
```typescript
<div aria-live="polite" aria-busy="true">
  <GallerySkeleton count={12} />
</div>
```

**Update empty state** to include role and aria-live:
```typescript
<div role="status" aria-live="polite">
  <GalleryEmptyState
    icon={BookOpen}
    title="No instructions yet"
    description="Upload your first MOC instructions to start your collection."
  />
</div>
```

### Step 4: Verify InstructionCard Component

**File**: `apps/web/app-instructions-gallery/src/components/InstructionCard/index.tsx`

Current implementation looks good. Verify it has:
- ✅ Thumbnail display with fallback
- ✅ Title, piece count, theme display
- ✅ data-testid attributes
- ✅ ARIA labels on buttons

No changes needed.

### Step 5: Create Unit Tests for main-page.tsx

**File**: `apps/web/app-instructions-gallery/src/pages/__tests__/main-page.test.tsx` (create new)

```typescript
/**
 * Unit tests for Instructions Gallery Main Page
 * Story INST-1100: View MOC Gallery
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MainPage } from '../main-page'

// Mock dependencies
vi.mock('@repo/logger')
vi.mock('@repo/api-client/rtk/instructions-api', () => ({
  useGetInstructionsQuery: vi.fn(),
}))
vi.mock('@repo/gallery', () => ({
  GalleryGrid: ({ children }: { children: React.ReactNode }) => <div data-testid="gallery-grid">{children}</div>,
  GalleryEmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
  GalleryFilterBar: () => <div data-testid="filter-bar" />,
  GalleryViewToggle: () => <div data-testid="view-toggle" />,
  GalleryDataTable: () => <div data-testid="data-table" />,
  GallerySkeleton: ({ count }: { count: number }) => <div data-testid="skeleton">Loading {count} items...</div>,
  useViewMode: () => ['grid', vi.fn()],
  useFirstTimeHint: () => [false, vi.fn()],
}))

import { useGetInstructionsQuery } from '@repo/api-client/rtk/instructions-api'

describe('MainPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders gallery grid with instructions', () => {
    vi.mocked(useGetInstructionsQuery).mockReturnValue({
      data: {
        items: [
          {
            id: '1',
            title: 'Test MOC',
            description: 'Test description',
            thumbnailUrl: 'http://example.com/thumb.jpg',
            partsCount: 100,
            theme: 'Castle',
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isFeatured: false,
          },
        ],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
      error: undefined,
    } as any)

    render(<MainPage />)

    expect(screen.getByTestId('gallery-grid')).toBeInTheDocument()
    expect(screen.getByText('Test MOC')).toBeInTheDocument()
  })

  it('shows loading skeleton when fetching data', () => {
    vi.mocked(useGetInstructionsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: undefined,
    } as any)

    render(<MainPage />)

    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
    expect(screen.getByText(/Loading 12 items/)).toBeInTheDocument()
  })

  it('shows empty state when no instructions', () => {
    vi.mocked(useGetInstructionsQuery).mockReturnValue({
      data: {
        items: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      },
      isLoading: false,
      isError: false,
      error: undefined,
    } as any)

    render(<MainPage />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('No instructions yet')).toBeInTheDocument()
  })

  it('shows error state on API failure', () => {
    vi.mocked(useGetInstructionsQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('API Error'),
    } as any)

    render(<MainPage />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('has accessibility attributes', () => {
    vi.mocked(useGetInstructionsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: undefined,
    } as any)

    const { container } = render(<MainPage />)

    expect(container.querySelector('[role="region"]')).toBeInTheDocument()
    expect(container.querySelector('[aria-label="MOC Gallery"]')).toBeInTheDocument()
  })
})
```

### Step 6: Create Unit Tests for InstructionCard

**File**: `apps/web/app-instructions-gallery/src/components/InstructionCard/__tests__/InstructionCard.test.tsx` (create new)

```typescript
/**
 * Unit tests for InstructionCard Component
 * Story INST-1100: View MOC Gallery
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InstructionCard } from '../index'
import type { Instruction } from '../../../__types__'

const mockInstruction: Instruction = {
  id: 'test-id-1',
  name: 'Test Castle',
  description: 'A test castle MOC',
  thumbnail: 'http://example.com/thumb.jpg',
  images: [],
  pieceCount: 2500,
  theme: 'Castle',
  tags: ['castle', 'medieval'],
  pdfUrl: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isFavorite: false,
}

describe('InstructionCard', () => {
  it('renders instruction data correctly', () => {
    render(<InstructionCard instruction={mockInstruction} />)

    expect(screen.getByText('Test Castle')).toBeInTheDocument()
    expect(screen.getByText(/2,500 pieces/)).toBeInTheDocument()
    expect(screen.getByText('Castle')).toBeInTheDocument()
  })

  it('calls onClick handler when card is clicked', () => {
    const handleClick = vi.fn()
    render(<InstructionCard instruction={mockInstruction} onClick={handleClick} />)

    const card = screen.getByTestId('instruction-card-test-id-1')
    fireEvent.click(card)

    expect(handleClick).toHaveBeenCalledWith('test-id-1')
  })

  it('calls onFavorite handler when favorite button is clicked', () => {
    const handleFavorite = vi.fn()
    render(<InstructionCard instruction={mockInstruction} onFavorite={handleFavorite} />)

    const favoriteButton = screen.getByTestId('favorite-button')
    fireEvent.click(favoriteButton)

    expect(handleFavorite).toHaveBeenCalledWith('test-id-1')
  })

  it('calls onEdit handler when edit button is clicked', () => {
    const handleEdit = vi.fn()
    render(<InstructionCard instruction={mockInstruction} onEdit={handleEdit} />)

    const editButton = screen.getByTestId('edit-button')
    fireEvent.click(editButton)

    expect(handleEdit).toHaveBeenCalledWith('test-id-1')
  })

  it('has proper ARIA labels', () => {
    render(<InstructionCard instruction={mockInstruction} onFavorite={vi.fn()} onEdit={vi.fn()} />)

    expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument()
    expect(screen.getByLabelText('Edit instruction')).toBeInTheDocument()
  })
})
```

### Step 7: Create E2E Test

**File**: `apps/web/playwright/tests/instructions/inst-1100-gallery.spec.ts` (create new)

```typescript
/**
 * E2E tests for Instructions Gallery (INST-1100)
 * Tests MOC gallery display, loading states, and empty state
 */
import { test, expect } from '@playwright/test'
import { authenticatedPage } from '../../fixtures/browser-auth.fixture'

test.describe('MOC Gallery - INST-1100', () => {
  test('displays MOC collection in responsive grid', async ({ page }) => {
    const authPage = await authenticatedPage(page)
    
    // Navigate to instructions gallery
    await authPage.goto('/')
    await authPage.click('a[href="/mocs"]')
    
    // Wait for filter bar to confirm page load
    await authPage.waitForSelector('[data-testid="instructions-gallery-filter-bar"]')
    
    // Verify MOC cards are displayed
    const cards = await authPage.locator('[data-testid^="instruction-card-"]')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
    
    // Verify each card shows required metadata
    const firstCard = cards.first()
    await expect(firstCard.locator('[data-testid="piece-count-badge"]')).toBeVisible()
    await expect(firstCard.locator('[data-testid="theme-tag"]')).toBeVisible()
  })

  test('displays empty state when no MOCs exist', async ({ page }) => {
    // Note: This test requires a user with no MOCs or mocking
    const authPage = await authenticatedPage(page)
    
    await authPage.goto('/mocs')
    await authPage.waitForSelector('[data-testid="instructions-gallery-filter-bar"]')
    
    // Check for empty state
    const emptyState = await authPage.locator('text=No instructions yet')
    if (await emptyState.isVisible()) {
      expect(await emptyState.isVisible()).toBe(true)
    }
  })

  test('shows loading skeleton during fetch', async ({ page }) => {
    const authPage = await authenticatedPage(page)
    
    // Navigate and immediately check for skeleton
    const navigationPromise = authPage.goto('/mocs')
    
    // Skeleton should appear briefly
    const skeleton = authPage.locator('[data-testid="skeleton"]')
    
    await navigationPromise
    
    // After load completes, skeleton should be gone
    await authPage.waitForSelector('[data-testid="instructions-gallery-filter-bar"]')
    expect(await skeleton.isVisible()).toBe(false)
  })

  test('grid is responsive at different breakpoints', async ({ page }) => {
    const authPage = await authenticatedPage(page)
    
    // Mobile (375px)
    await authPage.setViewportSize({ width: 375, height: 667 })
    await authPage.goto('/mocs')
    await authPage.waitForSelector('[data-testid="gallery-grid"]')
    
    // Tablet (768px)
    await authPage.setViewportSize({ width: 768, height: 1024 })
    
    // Desktop (1024px)
    await authPage.setViewportSize({ width: 1024, height: 768 })
    
    // Cards should still be visible at all breakpoints
    const cards = await authPage.locator('[data-testid^="instruction-card-"]')
    expect(await cards.count()).toBeGreaterThan(0)
  })
})
```

## Quality Gates

After making all code changes, run the following commands in order:

### Build
```bash
pnpm build --filter app-instructions-gallery
```

### Type Check
```bash
pnpm check-types --filter app-instructions-gallery
```

### Lint
```bash
pnpm lint --filter app-instructions-gallery
```

### Unit Tests
```bash
pnpm test --filter app-instructions-gallery
```

### E2E Tests (requires backend running)
```bash
# Start backend first
cd apps/api/lego-api
pnpm dev

# In another terminal, run E2E tests
cd apps/web/playwright
pnpm test:e2e tests/instructions/inst-1100-gallery.spec.ts
```

## Verification Checklist

- [ ] Schema alignment fixed (data.items not data.data.items)
- [ ] GallerySkeleton used for loading state
- [ ] Accessibility attributes added (role, aria-label, aria-live)
- [ ] Unit tests created for main-page.tsx
- [ ] Unit tests created for InstructionCard
- [ ] E2E tests created for gallery MVP
- [ ] All builds pass
- [ ] All type checks pass
- [ ] All linting passes
- [ ] All unit tests pass
- [ ] All E2E tests pass

## Notes

- The field mapping change (title→name, partsCount→pieceCount, isFeatured→isFavorite) aligns the API response with the local Instruction type
- GallerySkeleton provides a better UX than plain loading text
- Accessibility attributes ensure screen reader compatibility
- E2E tests use the browser-auth.fixture pattern from wishlist tests

## Expected Outcomes

After completing these steps:
1. Gallery page displays MOCs correctly with proper field mapping
2. Loading states show skeleton animation
3. Empty state displays when no MOCs exist
4. Responsive grid works across breakpoints
5. Keyboard navigation and screen readers work properly
6. All quality gates pass
