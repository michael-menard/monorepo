# Story 7.5: Dashboard Cards & Data Display

## Status

Draft

## Story

**As a** user,
**I want** to see my collection summary, theme breakdown, recent MOCs, and partial parts status,
**so that** I can understand my collection at a glance and track build progress.

## Acceptance Criteria

1. ✅ Collection Summary Card shows `totalMocs`, `totalWishlistItems`
2. ✅ Collection Summary Card shows MOCs by build status (ADDED, IN_PROGRESS, BUILT)
3. ✅ Collection Summary Card shows MOCs by coverage status (FULL_INVENTORY, PARTIAL_ORDERED, NONE)
4. ✅ Theme Breakdown Card shows per-theme `mocCount` and `setCount`
5. ✅ Recent MOCs Card shows last 10 MOCs with title, theme, status, cover image, date
6. ✅ Recent MOCs Card items are clickable and navigate to MOC detail
7. ✅ Partial Parts Table shows MOCs with PARTIAL_ORDERED status
8. ✅ Partial Parts Table shows coverage percentage and last updated timestamp
9. ✅ All cards fetch data from `GET /api/dashboard` on mount
10. ✅ RTK Query used for data fetching with caching
11. ✅ Empty states displayed when no data available
12. ✅ Unit tests for all card components

## Tasks / Subtasks

- [ ] **Task 1: Create Dashboard API Slice** (AC: 9, 10)
  - [ ] Create `src/store/dashboardApi.ts`
  - [ ] Define `getDashboard` query endpoint
  - [ ] Configure cache tags for invalidation
  - [ ] Export hooks: `useGetDashboardQuery`

- [ ] **Task 2: Create Collection Summary Card** (AC: 1, 2, 3)
  - [ ] Create `src/components/CollectionSummaryCard.tsx`
  - [ ] Display total MOCs count with icon
  - [ ] Display total wishlist items count with icon
  - [ ] Create status breakdown section with colored badges
  - [ ] Create coverage breakdown section with progress indicators

- [ ] **Task 3: Create Theme Breakdown Card** (AC: 4)
  - [ ] Create `src/components/ThemeBreakdownCard.tsx`
  - [ ] Display list of themes with MOC and set counts
  - [ ] Sort by MOC count descending
  - [ ] Limit to top 10 themes with "Show more" option
  - [ ] Use horizontal bar chart or table layout

- [ ] **Task 4: Create Recent MOCs Card** (AC: 5, 6)
  - [ ] Create `src/components/RecentMocsCard.tsx`
  - [ ] Display MOC cards in a grid/list
  - [ ] Show cover image with fallback placeholder
  - [ ] Show title, theme badge, build status badge
  - [ ] Show relative date (e.g., "2 days ago")
  - [ ] Make cards clickable → navigate to `/mocs/:id`

- [ ] **Task 5: Create Partial Parts Table** (AC: 7, 8)
  - [ ] Create `src/components/PartialPartsTable.tsx`
  - [ ] Use Table component from `@repo/ui`
  - [ ] Columns: Title, Theme, Build Status, Coverage %, Last Updated, Actions
  - [ ] Coverage percentage shown as progress bar
  - [ ] Actions column with link to MOC/parts view
  - [ ] Sort by coverage percentage ascending

- [ ] **Task 6: Create Empty States** (AC: 11)
  - [ ] Create `src/components/EmptyState.tsx` reusable component
  - [ ] Empty state for "No MOCs yet" with CTA to add
  - [ ] Empty state for "No partial orders" (positive message)
  - [ ] Use appropriate icons and LEGO-themed messaging

- [ ] **Task 7: Integrate Cards with Dashboard Page**
  - [ ] Update `DashboardPage.tsx` to use actual components
  - [ ] Wire up `useGetDashboardQuery` hook
  - [ ] Pass data to each card component
  - [ ] Handle loading and error states

- [ ] **Task 8: Write Unit Tests** (AC: 12)
  - [ ] Test CollectionSummaryCard with mock data
  - [ ] Test ThemeBreakdownCard with mock data
  - [ ] Test RecentMocsCard with mock data
  - [ ] Test PartialPartsTable with mock data
  - [ ] Test empty states render correctly
  - [ ] Test navigation on MOC click

## Dev Notes

### Source Tree Location
[Source: architecture/source-tree.md#frontend-application]

```
apps/web/dashboard-app/src/
├── components/
│   ├── CollectionSummaryCard.tsx
│   ├── ThemeBreakdownCard.tsx
│   ├── RecentMocsCard.tsx
│   ├── PartialPartsTable.tsx
│   └── EmptyState.tsx
├── store/
│   └── dashboardApi.ts
└── __tests__/
    ├── CollectionSummaryCard.test.tsx
    ├── ThemeBreakdownCard.test.tsx
    ├── RecentMocsCard.test.tsx
    └── PartialPartsTable.test.tsx
```

### RTK Query Dashboard API Slice
[Source: architecture/coding-standards.md#data-fetching-with-rtk-query]

```typescript
// apps/web/dashboard-app/src/store/dashboardApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { DashboardView, DashboardViewSchema } from '@repo/dashboard-types'

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['Dashboard'],
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardView, void>({
      query: () => '/dashboard',
      transformResponse: (response: unknown) => {
        // Validate response with Zod
        return DashboardViewSchema.parse(response)
      },
      providesTags: ['Dashboard'],
    }),
  }),
})

export const { useGetDashboardQuery } = dashboardApi
```

### Collection Summary Card
[Source: docs/prd/dashboard-realtime-prd.md#6.1-collection-summary-card]

```typescript
// apps/web/dashboard-app/src/components/CollectionSummaryCard.tsx
import { Card } from '@repo/ui'
import { Box, Heart, Hammer, CheckCircle, Clock, Package } from 'lucide-react'
import { DashboardSummary } from '@repo/dashboard-types'

interface CollectionSummaryCardProps {
  summary: DashboardSummary
}

export function CollectionSummaryCard({ summary }: CollectionSummaryCardProps) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Collection Summary</h2>

      {/* Total counts */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 rounded-lg">
            <Box className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{summary.totalMocs}</p>
            <p className="text-sm text-muted-foreground">Total MOCs</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-100 rounded-lg">
            <Heart className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{summary.totalWishlistItems}</p>
            <p className="text-sm text-muted-foreground">Wishlist Items</p>
          </div>
        </div>
      </div>

      {/* Build Status Breakdown */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">Build Status</h3>
        <div className="flex gap-2">
          <StatusBadge
            icon={<Clock className="h-3 w-3" />}
            label="Added"
            count={summary.mocsByBuildStatus.ADDED}
            color="gray"
          />
          <StatusBadge
            icon={<Hammer className="h-3 w-3" />}
            label="In Progress"
            count={summary.mocsByBuildStatus.IN_PROGRESS}
            color="amber"
          />
          <StatusBadge
            icon={<CheckCircle className="h-3 w-3" />}
            label="Built"
            count={summary.mocsByBuildStatus.BUILT}
            color="green"
          />
        </div>
      </div>

      {/* Coverage Status Breakdown */}
      <div>
        <h3 className="text-sm font-medium mb-2">Parts Coverage</h3>
        <div className="flex gap-2">
          <StatusBadge
            icon={<Package className="h-3 w-3" />}
            label="Full"
            count={summary.mocsByCoverageStatus.FULL_INVENTORY}
            color="green"
          />
          <StatusBadge
            icon={<Package className="h-3 w-3" />}
            label="Partial"
            count={summary.mocsByCoverageStatus.PARTIAL_ORDERED}
            color="amber"
          />
          <StatusBadge
            icon={<Package className="h-3 w-3" />}
            label="None"
            count={summary.mocsByCoverageStatus.NONE}
            color="red"
          />
        </div>
      </div>
    </Card>
  )
}

interface StatusBadgeProps {
  icon: React.ReactNode
  label: string
  count: number
  color: 'gray' | 'amber' | 'green' | 'red'
}

const colorClasses = {
  gray: 'bg-gray-100 text-gray-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
}

function StatusBadge({ icon, label, count, color }: StatusBadgeProps) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${colorClasses[color]}`}>
      {icon}
      <span>{label}</span>
      <span className="font-semibold">{count}</span>
    </div>
  )
}
```

### Recent MOCs Card
[Source: docs/prd/dashboard-realtime-prd.md#6.3-recently-added-mocs-card]

```typescript
// apps/web/dashboard-app/src/components/RecentMocsCard.tsx
import { useNavigate } from '@tanstack/react-router'
import { Card } from '@repo/ui'
import { formatDistanceToNow } from 'date-fns'
import { RecentMoc } from '@repo/dashboard-types'

interface RecentMocsCardProps {
  mocs: RecentMoc[]
}

export function RecentMocsCard({ mocs }: RecentMocsCardProps) {
  const navigate = useNavigate()

  if (mocs.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Recently Added MOCs</h2>
        <EmptyState
          icon={<Box />}
          title="No MOCs yet"
          description="Start building your collection!"
          action={{ label: 'Add MOC', to: '/mocs/new' }}
        />
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Recently Added MOCs</h2>

      <div className="space-y-3">
        {mocs.map((moc) => (
          <div
            key={moc.id}
            onClick={() => navigate({ to: '/mocs/$mocId', params: { mocId: moc.id } })}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
          >
            {/* Cover image */}
            <div className="h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
              {moc.coverImageUrl ? (
                <img
                  src={moc.coverImageUrl}
                  alt={moc.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Box className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{moc.title}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{moc.theme}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(moc.createdAt), { addSuffix: true })}</span>
              </div>
            </div>

            {/* Status badge */}
            <BuildStatusBadge status={moc.buildStatus} />
          </div>
        ))}
      </div>
    </Card>
  )
}
```

### Partial Parts Table
[Source: docs/prd/dashboard-realtime-prd.md#6.5-mocs-with-partial-parts-ordered-table]

```typescript
// apps/web/dashboard-app/src/components/PartialPartsTable.tsx
import { useNavigate } from '@tanstack/react-router'
import { Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Progress } from '@repo/ui'
import { formatDistanceToNow } from 'date-fns'
import { ExternalLink } from 'lucide-react'
import { PartialPartsMoc } from '@repo/dashboard-types'

interface PartialPartsTableProps {
  mocs: PartialPartsMoc[]
}

export function PartialPartsTable({ mocs }: PartialPartsTableProps) {
  const navigate = useNavigate()

  if (mocs.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">MOCs with Partial Parts Ordered</h2>
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="text-muted-foreground">No partial orders - all parts accounted for!</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">MOCs with Partial Parts Ordered</h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Theme</TableHead>
            <TableHead>Build Status</TableHead>
            <TableHead>Coverage</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mocs.map((moc) => (
            <TableRow key={moc.id}>
              <TableCell className="font-medium">{moc.title}</TableCell>
              <TableCell>{moc.theme}</TableCell>
              <TableCell>
                <BuildStatusBadge status={moc.buildStatus} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={moc.coveragePercentage} className="w-20" />
                  <span className="text-sm">{moc.coveragePercentage}%</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDistanceToNow(new Date(moc.lastUpdatedAt), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <button
                  onClick={() => navigate({ to: '/mocs/$mocId/parts', params: { mocId: moc.id } })}
                  className="p-1 hover:bg-muted rounded"
                  aria-label="View parts"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
```

### Updated Dashboard Page with Data Fetching

```typescript
// apps/web/dashboard-app/src/pages/DashboardPage.tsx
import { useGetDashboardQuery } from '../store/dashboardApi'
import { DashboardLayout } from '../components/DashboardLayout'
import { DashboardSkeleton } from '../components/DashboardSkeleton'
import { CollectionSummaryCard } from '../components/CollectionSummaryCard'
import { ThemeBreakdownCard } from '../components/ThemeBreakdownCard'
import { RecentMocsCard } from '../components/RecentMocsCard'
import { PartialPartsTable } from '../components/PartialPartsTable'
import { QuickActionsCard } from '../components/QuickActionsCard'

export function DashboardPage() {
  const { data: dashboard, isLoading, error } = useGetDashboardQuery()

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error || !dashboard) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p className="text-red-500">Failed to load dashboard. Please try again.</p>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div data-slot="summary">
        <CollectionSummaryCard summary={dashboard.summary} />
      </div>

      <div data-slot="themes">
        <ThemeBreakdownCard themes={dashboard.themeBreakdown} />
      </div>

      <div data-slot="recent">
        <RecentMocsCard mocs={dashboard.recentMocs} />
      </div>

      <div data-slot="quickActions">
        <QuickActionsCard />
      </div>

      <div data-slot="partialParts" className="lg:col-span-3">
        <PartialPartsTable mocs={dashboard.partialPartsMocs} />
      </div>
    </DashboardLayout>
  )
}
```

### PRD Requirements Reference
[Source: docs/prd/dashboard-realtime-prd.md#6-functional-requirements]

- D-FR-1: Show `totalMocs` and `totalWishlistItems`
- D-FR-2: Show MOCs by build status
- D-FR-3: Show MOCs by parts coverage status
- D-FR-6: Show per theme `mocCount` and `setCount`
- D-FR-9: Show last N MOCs ordered by created_at DESC
- D-FR-14: Show all MOCs where parts_coverage_status = PARTIAL_ORDERED
- D-FR-15: Row fields for partial parts table

## Testing

### Test File Location
`apps/web/dashboard-app/src/__tests__/`

### Test Standards
[Source: architecture/testing-strategy.md#frontend-components]

```typescript
// __tests__/CollectionSummaryCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CollectionSummaryCard } from '../components/CollectionSummaryCard'

const mockSummary = {
  totalMocs: 42,
  totalWishlistItems: 15,
  mocsByBuildStatus: { ADDED: 10, IN_PROGRESS: 20, BUILT: 12 },
  mocsByCoverageStatus: { FULL_INVENTORY: 8, PARTIAL_ORDERED: 25, NONE: 9 },
}

describe('CollectionSummaryCard', () => {
  it('displays total MOCs count', () => {
    render(<CollectionSummaryCard summary={mockSummary} />)

    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Total MOCs')).toBeInTheDocument()
  })

  it('displays total wishlist items count', () => {
    render(<CollectionSummaryCard summary={mockSummary} />)

    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('Wishlist Items')).toBeInTheDocument()
  })

  it('displays build status breakdown', () => {
    render(<CollectionSummaryCard summary={mockSummary} />)

    expect(screen.getByText('Added')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('Built')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })
})
```

```typescript
// __tests__/RecentMocsCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RecentMocsCard } from '../components/RecentMocsCard'

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

const mockMocs = [
  {
    id: 'moc-1',
    title: 'Star Destroyer',
    theme: 'Star Wars',
    buildStatus: 'IN_PROGRESS' as const,
    coverImageUrl: 'https://example.com/image.jpg',
    createdAt: new Date().toISOString(),
  },
]

describe('RecentMocsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders MOC list', () => {
    render(<RecentMocsCard mocs={mockMocs} />)

    expect(screen.getByText('Star Destroyer')).toBeInTheDocument()
    expect(screen.getByText('Star Wars')).toBeInTheDocument()
  })

  it('navigates to MOC detail on click', () => {
    render(<RecentMocsCard mocs={mockMocs} />)

    fireEvent.click(screen.getByText('Star Destroyer'))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/mocs/$mocId',
      params: { mocId: 'moc-1' },
    })
  })

  it('renders empty state when no MOCs', () => {
    render(<RecentMocsCard mocs={[]} />)

    expect(screen.getByText('No MOCs yet')).toBeInTheDocument()
  })
})
```

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-30 | 0.1 | Initial draft | SM Agent (Bob) |
