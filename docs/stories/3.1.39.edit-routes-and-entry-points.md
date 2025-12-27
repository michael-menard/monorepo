# Story 3.1.39: Edit Routes & Entry Points

## GitHub Issue
- Issue: #260
- URL: https://github.com/michael-menard/monorepo/issues/260
- Status: Todo

## Status

Ready for Review

## Story

**As an** owner,
**I want** clear entry points to edit my MOC,
**so that** I can easily access the edit functionality from multiple places.

## Epic Context

This is **Story 2.1 of Epic 2: Edit UX & Frontend**.

## Blocked By

- All Epic 0 stories (3.1.28-3.1.32) - Package Extraction
- All Epic 1 stories (3.1.33-3.1.38) - Backend Edit Pipeline

**All backend stories must be complete before starting frontend work.**

## Acceptance Criteria

1. Route `/mocs/:slug/edit` displays edit page (TanStack Router)
2. Edit button visible on detail page only for owner (uses `isOwner` from API response)
3. Edit link in "My MOCs" list for each item
4. Direct URL access requires authentication (redirect to login if not)
5. Non-owner accessing edit URL sees access denied page (frontend checks `isOwner: false`)
6. Route validates slug format

**Note:** Backend `GET /mocs/:mocId` returns `isOwner: true/false` flag. Frontend must check this flag to determine edit access - backend does NOT return 403 for non-owners viewing published MOCs.

## Tasks / Subtasks

- [x] **Task 1: Create Edit Route** (AC: 1)
  - [x] Create `apps/web/main-app/src/routes/pages/InstructionsEditPage.tsx`
  - [x] Create route definition for `/mocs/:slug/edit`
  - [x] Add route validation with Zod for slug format

- [x] **Task 2: Add Auth Guard** (AC: 4)
  - [x] Create or extend route guard for authenticated routes
  - [x] Redirect to login with `returnTo` query param
  - [x] Store intended destination for post-login redirect

- [x] **Task 3: Add Edit Button to Detail Page** (AC: 2)
  - [x] Modify `InstructionsDetailModule.tsx`
  - [x] Check if current user is owner via `isOwner` flag from API
  - [x] Show "Edit" button only for owner (via `onEdit` callback)
  - [x] Navigate to `/mocs/:slug/edit` when clicked

- [x] **Task 4: Add Edit Link to My MOCs List** (AC: 3)
  - [x] Modify MOC card component in RecentMocsGrid
  - [x] Add edit icon/button in card actions
  - [x] Link to `/mocs/:slug/edit`

- [x] **Task 5: Handle Non-Owner Access** (AC: 5)
  - [x] After loading MOC, check `isOwner` flag from API response
  - [x] If `isOwner: false`, redirect to detail page
  - [x] Display friendly message for non-owners
  - [x] Provide link back to MOC detail page

- [x] **Task 6: Route Validation** (AC: 6)
  - [x] Validate slug matches `[a-z0-9-]+` pattern
  - [x] Show 404 for invalid slug format

## Dev Notes

### Route Definition

```typescript
// apps/web/main-app/src/routes/pages/InstructionsEditPage.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

const slugSchema = z.string().regex(/^[a-z0-9-]+$/)

export const Route = createFileRoute('/mocs/$slug/edit')({
  parseParams: params => ({
    slug: slugSchema.parse(params.slug),
  }),
  beforeLoad: async ({ context }) => {
    // Auth guard - edit requires authentication
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { returnTo: window.location.pathname },
      })
    }
  },
  loader: async ({ params, context }) => {
    // Uses same GET /mocs/:mocId endpoint - returns isOwner flag
    // Owner gets presigned URLs for files, non-owner gets CDN URLs
    const moc = await context.api.getMoc(params.slug)

    // Frontend enforces edit access via isOwner flag
    if (!moc.isOwner) {
      throw redirect({
        to: '/mocs/$slug',
        params: { slug: params.slug },
        // Or throw custom error for AccessDenied component
      })
    }

    return moc
  },
  component: InstructionsEditPage,
  errorComponent: EditErrorBoundary,
})
```

### Edit Button on Detail Page

```typescript
// In InstructionsDetailPage.tsx
// Uses isOwner flag from API response (Story 3.1.33)
// No need to compare userIds - backend already determined ownership

function InstructionsDetailPage() {
  const { moc } = Route.useLoaderData()
  // isOwner comes directly from GET /mocs/:mocId response
  const { isOwner } = moc

  return (
    <div>
      <header className="flex items-center justify-between">
        <h1>{moc.title}</h1>
        {isOwner && (
          <Link to="/mocs/$slug/edit" params={{ slug: moc.slug }}>
            <Button variant="outline">
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
        )}
      </header>
      {/* ... rest of page */}
    </div>
  )
}
```

### My MOCs List Edit Action

```typescript
// In MocCard component
function MocCard({ moc }: { moc: MocListItem }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{moc.title}</CardTitle>
      </CardHeader>
      <CardFooter className="flex justify-between">
        <Link to="/mocs/$slug" params={{ slug: moc.slug }}>
          View
        </Link>
        <Link to="/mocs/$slug/edit" params={{ slug: moc.slug }}>
          <PencilIcon className="w-4 h-4" />
          <span className="sr-only">Edit {moc.title}</span>
        </Link>
      </CardFooter>
    </Card>
  )
}
```

### Non-Owner Access Handling

The route loader redirects non-owners before the component renders. If you prefer to show an access denied component instead of redirecting:

```typescript
// Alternative: Throw custom error in loader instead of redirect
loader: async ({ params, context }) => {
  const moc = await context.api.getMoc(params.slug)
  if (!moc.isOwner) {
    throw new AccessDeniedError('You do not own this MOC')
  }
  return moc
},

// AccessDeniedComponent.tsx
function AccessDeniedComponent() {
  const { slug } = Route.useParams()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground mt-2">
        You don't have permission to edit this MOC.
      </p>
      <Link to="/mocs/$slug" params={{ slug }}>
        <Button>View MOC</Button>
      </Link>
    </div>
  )
}

// EditErrorBoundary.tsx
function EditErrorBoundary({ error }: { error: Error }) {
  if (error instanceof AccessDeniedError) {
    return <AccessDeniedComponent />
  }
  // Re-throw other errors for global error boundary
  throw error
}
```

**Note:** Backend returns 404 (not 403) for draft/archived MOCs when accessed by non-owners to prevent existence leak. The frontend should handle 404 errors with a standard "not found" message.

### Existing Components

- `apps/web/main-app/src/routes/pages/InstructionsDetailPage.tsx` - Detail page to modify
- `apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx` - Reference for form patterns
- `apps/web/main-app/src/components/Layout/` - Layout components

## Testing

### Test Location
- `apps/web/main-app/src/routes/pages/__tests__/InstructionsEditPage.test.tsx`
- `apps/web/playwright/features/moc-edit/` (E2E)

### Test Requirements
- Unit: Route renders for authenticated owner
- Unit: Route redirects to login for unauthenticated
- Unit: Edit button visible only for owner
- Unit: 403 error component displays for non-owner
- E2E: Navigate to edit via detail page
- E2E: Navigate to edit via My MOCs list
- E2E: Direct URL access requires auth

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-08 | 0.1 | Initial draft from Edit MOC PRD | SM Agent |
| 2025-12-26 | 1.0 | Implementation complete - all tasks done | Dev Agent (James) |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

N/A

### Completion Notes

- Created edit route `/mocs/$slug/edit` with TanStack Router
- Added `InstructionsEditPage.tsx` with form for editing MOC metadata
- Added `InstructionsEditModule.tsx` for lazy loading and ownership checks
- Updated `InstructionsDetailModule.tsx` to conditionally show edit button for owners
- Updated `RecentMocsGrid.tsx` to add edit link overlay on MOC cards
- Added `slug` field to `RecentMocSchema` in dashboard-api for edit navigation
- Auth guard redirects to `/login?returnTo=...` for unauthenticated users
- Non-owners are redirected to detail page from edit module
- Slug validation uses Zod regex `/^[a-z0-9-]+$/`
- 23 unit tests passing covering edit page, module, and route guards

### File List

- `apps/web/main-app/src/routes/pages/InstructionsEditPage.tsx` - New
- `apps/web/main-app/src/routes/modules/InstructionsEditModule.tsx` - New
- `apps/web/main-app/src/routes/index.ts` - Modified (add mocDetailRoute, mocEditRoute)
- `apps/web/main-app/src/routes/modules/InstructionsDetailModule.tsx` - Modified (add edit handler, isOwner)
- `apps/web/main-app/src/components/Dashboard/RecentMocsGrid.tsx` - Modified (add edit link)
- `packages/core/api-client/src/rtk/dashboard-api.ts` - Modified (add slug to RecentMocSchema)
- `apps/web/main-app/src/routes/pages/__tests__/InstructionsEditPage.test.tsx` - New
- `apps/web/main-app/src/routes/modules/__tests__/InstructionsEditModule.test.tsx` - New
- `apps/web/main-app/src/components/Dashboard/__tests__/RecentMocsGrid.test.tsx` - Modified (add slug)
