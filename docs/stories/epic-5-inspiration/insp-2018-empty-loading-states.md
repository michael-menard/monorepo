# Story insp-2018: Empty & Loading States

## Status

Draft

## Consolidates

- insp-1043.empty-states
- insp-1044.loading-states
- insp-1045.error-handling

## Story

**As a** user,
**I want** clear feedback when content is loading, empty, or has errors,
**so that** I understand the state of the application.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - User Interface > Empty States, Loading & Error States

## Dependencies

- **insp-2002**: Inspiration Gallery MVP
- **insp-2007**: Album Gallery & View

## Acceptance Criteria

### Empty States

1. **Empty gallery (new user)**: Welcoming illustration, "Start your inspiration collection" headline, prominent "Upload your first image" CTA
2. **Empty gallery (all deleted)**: "No inspirations yet. Upload images to start collecting ideas."
3. **Empty album**: "This album is empty. Drag images here or click to upload." with drop zone highlight
4. **No search/filter results**: "No inspirations match your filters. Try adjusting your search or clearing filters." with clear filters button

### Loading States

5. **Gallery loading**: Skeleton cards matching grid layout
6. **Image loading**: Blurred placeholder or skeleton, lazy-load on scroll
7. **Album loading**: Skeleton for album header and content
8. **Detail view loading**: Skeleton for image and metadata panel
9. **Modal loading**: Spinner or skeleton while fetching data

### Error States

10. **Gallery fetch error**: "Failed to load inspirations. Retry?" with retry button
11. **Upload failure**: Toast with error message and retry option
12. **Save failure**: Toast "Couldn't save changes. Retry?" with retry action
13. **Delete failure**: Toast "Couldn't delete. Please try again."
14. **Network offline**: Banner indicating offline status

## Tasks / Subtasks

### Task 1: Create Empty State Components (AC: 1-4)

- [ ] Create `GalleryEmptyState` component with variants
- [ ] New user welcome state with illustration
- [ ] All deleted state
- [ ] Empty album state with drop zone
- [ ] No results state with clear filters

### Task 2: Create Loading Skeletons (AC: 5-9)

- [ ] Create `InspirationCardSkeleton` component
- [ ] Create `GalleryGridSkeleton` for full grid
- [ ] Create `AlbumHeaderSkeleton`
- [ ] Create `DetailViewSkeleton`
- [ ] Add blur placeholder for images

### Task 3: Create Error States (AC: 10-14)

- [ ] Create `GalleryErrorState` component
- [ ] Create toast configurations for errors
- [ ] Add retry handlers
- [ ] Create offline banner component

### Task 4: Integrate States into Pages

- [ ] Update gallery page with all states
- [ ] Update album view with states
- [ ] Update detail views with states
- [ ] Add error toasts to mutations

## Dev Notes

### Empty State Component

```typescript
// apps/web/main-app/src/routes/inspiration/-components/EmptyState/index.tsx
import { Button } from '@repo/ui'
import { Image, Upload, Search, Folder } from 'lucide-react'

type EmptyStateVariant = 'new-user' | 'all-deleted' | 'empty-album' | 'no-results'

interface EmptyStateProps {
  variant: EmptyStateVariant
  onAction?: () => void
  onClearFilters?: () => void
}

export function EmptyState({ variant, onAction, onClearFilters }: EmptyStateProps) {
  switch (variant) {
    case 'new-user':
      return (
        <div className="text-center py-16 px-4">
          <div className="w-24 h-24 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
            <Image className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Start your inspiration collection</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Collect images that inspire your LEGO builds. Upload photos, screenshots,
            or artwork to reference later.
          </p>
          <Button size="lg" onClick={onAction}>
            <Upload className="w-5 h-5 mr-2" />
            Upload your first image
          </Button>
        </div>
      )

    case 'all-deleted':
      return (
        <div className="text-center py-12">
          <Image className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No inspirations yet</h3>
          <p className="text-muted-foreground mb-4">
            Upload images to start collecting ideas.
          </p>
          <Button onClick={onAction}>
            <Upload className="w-4 h-4 mr-2" />
            Upload images
          </Button>
        </div>
      )

    case 'empty-album':
      return (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Folder className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">This album is empty</h3>
          <p className="text-muted-foreground mb-4">
            Drag images here or click to upload.
          </p>
          <Button onClick={onAction}>
            <Upload className="w-4 h-4 mr-2" />
            Add images
          </Button>
        </div>
      )

    case 'no-results':
      return (
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No inspirations match your filters</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search or clearing filters.
          </p>
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        </div>
      )
  }
}
```

### Loading Skeletons

```typescript
// apps/web/main-app/src/routes/inspiration/-components/Skeletons/index.tsx
import { Card, CardContent, Skeleton } from '@repo/ui'

export function InspirationCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-square" />
      <CardContent className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export function GalleryGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <InspirationCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function AlbumHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

export function DetailViewSkeleton() {
  return (
    <div className="container mx-auto py-6">
      <Skeleton className="h-6 w-32 mb-6" />
      <div className="grid md:grid-cols-2 gap-8">
        <Skeleton className="aspect-square rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Blur placeholder for images
export function ImageWithPlaceholder({ src, alt, className }: {
  src: string
  alt: string
  className?: string
}) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className={`relative ${className}`}>
      {!loaded && (
        <Skeleton className="absolute inset-0" />
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}
```

### Error State Component

```typescript
// apps/web/main-app/src/routes/inspiration/-components/ErrorState/index.tsx
import { Button } from '@repo/ui'
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function GalleryErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="text-center py-12">
      <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
      <h3 className="text-lg font-medium mb-2">Something went wrong</h3>
      <p className="text-muted-foreground mb-4">
        {message || 'Failed to load inspirations.'}
      </p>
      {onRetry && (
        <Button onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try again
        </Button>
      )}
    </div>
  )
}

export function OfflineBanner() {
  return (
    <div className="bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 px-4 py-2 flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm">You're offline. Some features may not work.</span>
    </div>
  )
}
```

### Toast Configurations

```typescript
// apps/web/main-app/src/lib/toasts.ts
import { toast } from '@repo/ui'

export const toasts = {
  uploadError: (fileName: string, retry?: () => void) => {
    toast({
      variant: 'destructive',
      title: 'Upload failed',
      description: `Could not upload "${fileName}".`,
      action: retry ? (
        <Button variant="outline" size="sm" onClick={retry}>
          Retry
        </Button>
      ) : undefined,
    })
  },

  saveError: (retry?: () => void) => {
    toast({
      variant: 'destructive',
      title: "Couldn't save changes",
      description: 'Please try again.',
      action: retry ? (
        <Button variant="outline" size="sm" onClick={retry}>
          Retry
        </Button>
      ) : undefined,
    })
  },

  deleteError: () => {
    toast({
      variant: 'destructive',
      title: "Couldn't delete",
      description: 'Please try again.',
    })
  },

  deleteSuccess: (itemName?: string) => {
    toast({
      title: 'Deleted',
      description: itemName ? `"${itemName}" has been deleted.` : 'Item deleted.',
    })
  },

  uploadSuccess: (count: number) => {
    toast({
      title: 'Upload complete',
      description: `${count} image${count !== 1 ? 's' : ''} uploaded successfully.`,
    })
  },
}
```

### Gallery Page with All States

```typescript
// Updated gallery page
function InspirationGalleryPage() {
  const { data, isLoading, error, refetch } = useGetInspirationsQuery(params)
  const isNewUser = !isLoading && !error && data?.pagination.total === 0 && !hasFilters
  const hasNoResults = !isLoading && !error && data?.items.length === 0 && hasFilters

  if (error) {
    return <GalleryErrorState message="Failed to load inspirations" onRetry={refetch} />
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <GalleryGridSkeleton count={12} />
      </div>
    )
  }

  if (isNewUser) {
    return (
      <div className="container mx-auto py-6">
        <EmptyState variant="new-user" onAction={() => setUploadModalOpen(true)} />
      </div>
    )
  }

  if (hasNoResults) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        {/* Header and filters */}
        <EmptyState variant="no-results" onClearFilters={clearFilters} />
      </div>
    )
  }

  return (
    // Normal gallery content
  )
}
```

## Testing

### Empty State Tests

- [ ] New user sees welcome state
- [ ] After all deleted, appropriate message shown
- [ ] Empty album shows drop zone hint
- [ ] No results shows filter clear option

### Loading State Tests

- [ ] Skeleton grid shows during fetch
- [ ] Album header skeleton shows
- [ ] Detail view skeleton shows
- [ ] Images show blur placeholder until loaded

### Error State Tests

- [ ] Error state shows with retry button
- [ ] Retry button triggers refetch
- [ ] Toast shows for mutation errors
- [ ] Retry in toast works

## Definition of Done

- [ ] All empty state variants implemented
- [ ] Loading skeletons for all views
- [ ] Error states with retry options
- [ ] Toast notifications for errors
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1043-1045               | Claude   |
