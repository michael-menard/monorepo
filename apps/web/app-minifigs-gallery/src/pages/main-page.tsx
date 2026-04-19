import { useState, useEffect, useRef, useCallback } from 'react'
import { PersonStanding, Trash2, X } from 'lucide-react'
import { Badge, Skeleton, Button, cn } from '@repo/app-component-library'
import { GalleryCard } from '@repo/gallery'
import {
  useGetMinifigsQuery,
  useBulkDeleteMinifigsMutation,
} from '@repo/api-client/rtk/minifigs-api'
import type { MinifigInstance } from '@repo/api-client/schemas/minifigs'

function formatCondition(condition: string | null | undefined): string {
  switch (condition) {
    case 'new_sealed':
      return 'New / Sealed'
    case 'built':
      return 'Built'
    case 'parted_out':
      return 'Parted Out'
    default:
      return ''
  }
}

function MinifigCard({
  minifig,
  onClick,
  selectionMode,
  selected,
  onToggleSelect,
}: {
  minifig: MinifigInstance
  onClick: () => void
  selectionMode: boolean
  selected: boolean
  onToggleSelect: () => void
}) {
  const imageUrl = minifig.imageUrl || minifig.variant?.imageUrl
  const statusLabel =
    minifig.status === 'owned' ? 'Owned' : minifig.status === 'wanted' ? 'Wanted' : 'Cataloged'

  return (
    <div className="relative">
      {/* Selection checkbox overlay */}
      {selectionMode && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onToggleSelect()
          }}
          className={cn(
            'absolute top-1 left-1 z-10 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors',
            selected
              ? 'bg-primary border-primary text-primary-foreground'
              : 'bg-background/80 border-muted-foreground/50 hover:border-primary',
          )}
        >
          {selected && (
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      )}
      <GalleryCard
        image={
          imageUrl ? { src: imageUrl, alt: minifig.displayName, aspectRatio: 'auto' } : undefined
        }
        imageFallback={
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <PersonStanding className="h-8 w-8 text-muted-foreground" />
          </div>
        }
        contentDrawer={true}
        title={minifig.displayName}
        subtitle={minifig.variant?.legoNumber ?? undefined}
        onClick={selectionMode ? onToggleSelect : onClick}
        data-testid={`minifig-card-${minifig.id}`}
        className={cn(selected && 'ring-2 ring-primary ring-offset-1')}
        metadata={
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 flex-wrap">
              <Badge
                variant={
                  minifig.status === 'owned'
                    ? 'default'
                    : minifig.status === 'wanted'
                      ? 'outline'
                      : 'secondary'
                }
                className="text-xs"
              >
                {statusLabel}
              </Badge>
              {minifig.condition ? (
                <Badge variant="outline" className="text-xs">
                  {formatCondition(minifig.condition)}
                </Badge>
              ) : null}
            </div>
            {minifig.variant?.theme ? (
              <span className="text-xs text-white/70">{minifig.variant.theme}</span>
            ) : null}
            {minifig.variant?.year ? (
              <span className="text-xs text-white/60">{minifig.variant.year}</span>
            ) : null}
            {minifig.tags && minifig.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {minifig.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs border-white/20 text-white/80"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        }
      />
    </div>
  )
}

export function MainPage({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const [status, setStatus] = useState<'owned' | 'wanted' | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [bulkDeleteMinifigs, { isLoading: isDeleting }] = useBulkDeleteMinifigsMutation()

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setSelectionMode(false)
  }, [])

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    await bulkDeleteMinifigs({ ids })
    setSelectedIds(new Set())
    setSelectionMode(false)
    setPage(1)
    setAllItems([])
  }, [selectedIds, bulkDeleteMinifigs])

  const { data, isLoading, isFetching } = useGetMinifigsQuery(
    {
      status,
      search: search || undefined,
      page,
      limit: 48,
      sort: 'createdAt',
      order: 'desc',
    },
    { pollingInterval: 10000 },
  )

  const [allItems, setAllItems] = useState<MinifigInstance[]>(data?.items ?? [])

  // Sync items when data changes (pagination, filters, cache updates)
  useEffect(() => {
    if (!data?.items) return
    if (page === 1) {
      setAllItems(data.items)
    } else {
      setAllItems(prev => {
        const existingIds = new Set(prev.map(i => i.id))
        const newItems = data.items.filter(i => !existingIds.has(i.id))
        return [...prev, ...newItems]
      })
    }
  }, [data, page])

  // Reset when filters change
  const resetFilters = useCallback(() => {
    setPage(1)
    setAllItems([])
  }, [])

  const hasMore = data ? page < data.pagination.totalPages : false

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isFetching) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isFetching) {
          setPage(p => p + 1)
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, isFetching])

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="minifigs-main-page">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Minifig Collection</h1>
        {!selectionMode && allItems.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)}>
            Select
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search minifigs..."
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            resetFilters()
          }}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-64"
          data-testid="minifig-search-input"
        />
        <div className="flex gap-1">
          {(['all', 'none', 'owned', 'wanted'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(s === 'all' ? undefined : s)
                resetFilters()
              }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors',
                (s === 'all' && !status) || s === status
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-input hover:bg-accent',
              )}
              data-testid={`minifig-filter-${s}`}
            >
              {s === 'all'
                ? 'All'
                : s === 'none'
                  ? 'Cataloged'
                  : s === 'owned'
                    ? 'Owned'
                    : 'Wanted'}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectionMode && (
        <div className="sticky top-0 z-20 flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2 backdrop-blur-sm">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isDeleting}>
            <Trash2 className="h-4 w-4 mr-1" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      )}

      {/* Grid */}
      {isLoading && allItems.length === 0 ? (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="min-w-0 overflow-hidden space-y-2">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : allItems.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">
            {data?.pagination.total ?? allItems.length} minifigs
          </p>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
            {allItems.map(minifig => (
              <div key={minifig.id} className="min-w-0 overflow-hidden">
                <MinifigCard
                  minifig={minifig}
                  onClick={() => onNavigate?.(`/minifigs/${minifig.id}`)}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(minifig.id)}
                  onToggleSelect={() => toggleSelect(minifig.id)}
                />
              </div>
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          {hasMore ? (
            <div ref={sentinelRef} className="flex justify-center py-8">
              {isFetching ? (
                <div className="grid grid-cols-10 gap-2 w-full">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-[3/4] rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Scroll for more...</span>
              )}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">All minifigs loaded</p>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-3">
          <PersonStanding className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No minifigs found</p>
          <p className="text-sm text-muted-foreground">
            Add minifigs via the scraper to get started.
          </p>
        </div>
      )}
    </div>
  )
}
