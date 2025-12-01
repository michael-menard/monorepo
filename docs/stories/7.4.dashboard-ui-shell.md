# Story 7.4: Dashboard UI Shell & Layout

## Status

Draft

## Story

**As a** user,
**I want** a dashboard page with a clear layout structure,
**so that** I can see my collection status at a glance with consistent navigation.

## Acceptance Criteria

1. ✅ Dashboard page accessible at `/dashboard` route
2. ✅ Page uses existing app shell (Header, Sidebar, Footer)
3. ✅ Dashboard layout has defined grid/flex areas for cards
4. ✅ Quick Actions card displays with static buttons: "Add New MOC", "Browse Gallery", "View Wishlist"
5. ✅ Quick Actions buttons navigate to correct routes
6. ✅ Responsive layout works on mobile (single column) and desktop (multi-column grid)
7. ✅ Dashboard module lazy-loaded for code splitting
8. ✅ Loading skeleton displays while dashboard data loads
9. ✅ Unit tests verify layout and navigation

## Tasks / Subtasks

- [ ] **Task 1: Create Dashboard App Structure** (AC: 1, 7)
  - [ ] Create `apps/web/dashboard-app/` directory
  - [ ] Create `package.json` with `@repo/dashboard-app` name
  - [ ] Add dependencies: react, @repo/ui, @repo/dashboard-types
  - [ ] Create `src/index.ts` entry point
  - [ ] Configure lazy loading in main-app routes

- [ ] **Task 2: Create Dashboard Page Layout** (AC: 2, 3, 6)
  - [ ] Create `src/pages/DashboardPage.tsx`
  - [ ] Use existing layout components from main-app
  - [ ] Create responsive grid layout:
    - Desktop: 3-column grid
    - Tablet: 2-column grid
    - Mobile: single column stack
  - [ ] Define card placement areas

- [ ] **Task 3: Create Dashboard Layout Component** (AC: 3)
  - [ ] Create `src/components/DashboardLayout.tsx`
  - [ ] Define grid areas: summary, themes, recent, quickActions, partialParts
  - [ ] Use CSS Grid with Tailwind classes
  - [ ] Ensure proper spacing and gaps

- [ ] **Task 4: Create Quick Actions Card** (AC: 4, 5)
  - [ ] Create `src/components/QuickActionsCard.tsx`
  - [ ] Add "Add New MOC" button → navigates to `/mocs/new`
  - [ ] Add "Browse Gallery" button → navigates to `/gallery`
  - [ ] Add "View Wishlist" button → navigates to `/wishlist`
  - [ ] Use `@repo/ui` Button and Card components
  - [ ] Style with LEGO-inspired theme (sky/teal gradients)

- [ ] **Task 5: Configure Route in Main App** (AC: 1, 7)
  - [ ] Add `/dashboard` route to `main-app/src/routes/`
  - [ ] Configure lazy loading with `React.lazy()`
  - [ ] Protect route with auth guard
  - [ ] Set as default redirect after login

- [ ] **Task 6: Create Loading Skeleton** (AC: 8)
  - [ ] Create `src/components/DashboardSkeleton.tsx`
  - [ ] Use Skeleton components from `@repo/ui`
  - [ ] Match layout structure of actual dashboard
  - [ ] Animate with pulse effect

- [ ] **Task 7: Write Unit Tests** (AC: 9)
  - [ ] Test dashboard page renders
  - [ ] Test quick actions buttons navigate correctly
  - [ ] Test responsive layout breakpoints
  - [ ] Test loading skeleton displays

## Dev Notes

### Source Tree Location
[Source: architecture/source-tree.md#frontend-application]

```
apps/web/dashboard-app/
├── src/
│   ├── pages/
│   │   └── DashboardPage.tsx
│   ├── components/
│   │   ├── DashboardLayout.tsx
│   │   ├── DashboardSkeleton.tsx
│   │   └── QuickActionsCard.tsx
│   ├── index.ts
│   └── __tests__/
│       ├── DashboardPage.test.tsx
│       └── QuickActionsCard.test.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Package.json

```json
{
  "name": "@repo/dashboard-app",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "dependencies": {
    "react": "^19.0.0",
    "@repo/ui": "workspace:*",
    "@repo/dashboard-types": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^3.0.5",
    "@testing-library/react": "^16.0.0"
  }
}
```

### Dashboard Page Component
[Source: architecture/coding-standards.md#react-standards]

```typescript
// apps/web/dashboard-app/src/pages/DashboardPage.tsx
import { Suspense } from 'react'
import { DashboardLayout } from '../components/DashboardLayout'
import { DashboardSkeleton } from '../components/DashboardSkeleton'
import { QuickActionsCard } from '../components/QuickActionsCard'
// Card components will be added in Story 7.5
// import { CollectionSummaryCard } from '../components/CollectionSummaryCard'
// import { ThemeBreakdownCard } from '../components/ThemeBreakdownCard'
// import { RecentMocsCard } from '../components/RecentMocsCard'
// import { PartialPartsTable } from '../components/PartialPartsTable'

export function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardLayout>
        {/* Summary card slot - Story 7.5 */}
        <div data-slot="summary">
          {/* <CollectionSummaryCard /> */}
          <div className="h-48 bg-muted rounded-lg" /> {/* Placeholder */}
        </div>

        {/* Theme breakdown slot - Story 7.5 */}
        <div data-slot="themes">
          {/* <ThemeBreakdownCard /> */}
          <div className="h-64 bg-muted rounded-lg" /> {/* Placeholder */}
        </div>

        {/* Recent MOCs slot - Story 7.5 */}
        <div data-slot="recent">
          {/* <RecentMocsCard /> */}
          <div className="h-80 bg-muted rounded-lg" /> {/* Placeholder */}
        </div>

        {/* Quick Actions - implemented this story */}
        <div data-slot="quickActions">
          <QuickActionsCard />
        </div>

        {/* Partial parts table slot - Story 7.5 */}
        <div data-slot="partialParts">
          {/* <PartialPartsTable /> */}
          <div className="h-64 bg-muted rounded-lg" /> {/* Placeholder */}
        </div>
      </DashboardLayout>
    </Suspense>
  )
}
```

### Dashboard Layout Component

```typescript
// apps/web/dashboard-app/src/components/DashboardLayout.tsx
import { ReactNode } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-sky-500 to-teal-500 bg-clip-text text-transparent">
        Dashboard
      </h1>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </div>
  )
}
```

### Quick Actions Card Component
[Source: docs/prd/dashboard-realtime-prd.md#D-FR-12]

```typescript
// apps/web/dashboard-app/src/components/QuickActionsCard.tsx
import { useNavigate } from '@tanstack/react-router'
import { Card, Button } from '@repo/ui'
import { Plus, Image, Heart } from 'lucide-react'

export function QuickActionsCard() {
  const navigate = useNavigate()

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>

      <div className="flex flex-col gap-3">
        <Button
          onClick={() => navigate({ to: '/mocs/new' })}
          className="w-full justify-start bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New MOC
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate({ to: '/gallery' })}
          className="w-full justify-start"
        >
          <Image className="mr-2 h-4 w-4" />
          Browse Gallery
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate({ to: '/wishlist' })}
          className="w-full justify-start"
        >
          <Heart className="mr-2 h-4 w-4" />
          View Wishlist
        </Button>
      </div>
    </Card>
  )
}
```

### Route Configuration in Main App
[Source: architecture/coding-standards.md#routing-with-tanstack-router]

```typescript
// apps/web/main-app/src/routes/dashboard.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

// Lazy load the dashboard app
const DashboardPage = lazy(() =>
  import('@repo/dashboard-app').then(m => ({ default: m.DashboardPage }))
)

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    // Auth guard
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: () => (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPage />
    </Suspense>
  ),
})
```

### Loading Skeleton Component

```typescript
// apps/web/dashboard-app/src/components/DashboardSkeleton.tsx
import { Skeleton } from '@repo/ui'

export function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Title skeleton */}
      <Skeleton className="h-9 w-48 mb-6" />

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Summary card skeleton */}
        <Skeleton className="h-48 rounded-lg" />

        {/* Theme breakdown skeleton */}
        <Skeleton className="h-64 rounded-lg" />

        {/* Recent MOCs skeleton */}
        <Skeleton className="h-80 rounded-lg md:col-span-2 lg:col-span-1" />

        {/* Quick actions skeleton */}
        <Skeleton className="h-48 rounded-lg" />

        {/* Partial parts table skeleton */}
        <Skeleton className="h-64 rounded-lg md:col-span-2 lg:col-span-3" />
      </div>
    </div>
  )
}
```

### PRD Requirements Reference
[Source: docs/prd/dashboard-realtime-prd.md]

- D-FR-12: Show buttons for "Add New MOC", "Browse Gallery", "View Wishlist"
- D-FR-13: Quick Actions are static; no backend data required

### Responsive Breakpoints

| Breakpoint | Columns | Card Layout |
|------------|---------|-------------|
| Mobile (`< 768px`) | 1 | Stacked |
| Tablet (`768px - 1024px`) | 2 | 2-column grid |
| Desktop (`> 1024px`) | 3 | 3-column grid |

### Import Pattern

```typescript
// ✅ Correct - Import from package
import { Button, Card, Skeleton } from '@repo/ui'

// ❌ Wrong - Individual imports
import { Button } from '@repo/ui/button'
```

## Testing

### Test File Location
`apps/web/dashboard-app/src/__tests__/`

### Test Standards
[Source: architecture/testing-strategy.md#frontend-components]

```typescript
// __tests__/QuickActionsCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuickActionsCard } from '../components/QuickActionsCard'

// Mock TanStack Router
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

describe('QuickActionsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all three action buttons', () => {
    render(<QuickActionsCard />)

    expect(screen.getByText('Add New MOC')).toBeInTheDocument()
    expect(screen.getByText('Browse Gallery')).toBeInTheDocument()
    expect(screen.getByText('View Wishlist')).toBeInTheDocument()
  })

  it('navigates to /mocs/new when Add New MOC clicked', () => {
    render(<QuickActionsCard />)

    fireEvent.click(screen.getByText('Add New MOC'))

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/mocs/new' })
  })

  it('navigates to /gallery when Browse Gallery clicked', () => {
    render(<QuickActionsCard />)

    fireEvent.click(screen.getByText('Browse Gallery'))

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/gallery' })
  })

  it('navigates to /wishlist when View Wishlist clicked', () => {
    render(<QuickActionsCard />)

    fireEvent.click(screen.getByText('View Wishlist'))

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/wishlist' })
  })
})
```

```typescript
// __tests__/DashboardPage.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardPage } from '../pages/DashboardPage'

describe('DashboardPage', () => {
  it('renders dashboard title', () => {
    render(<DashboardPage />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders quick actions card', () => {
    render(<DashboardPage />)

    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
  })
})
```

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-30 | 0.1 | Initial draft | SM Agent (Bob) |
