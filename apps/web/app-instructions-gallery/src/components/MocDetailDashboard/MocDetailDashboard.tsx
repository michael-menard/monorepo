import { useCallback, useEffect, useState } from 'react'
import type React from 'react'
import { ThumbnailUpload } from '../ThumbnailUpload'
import type { Moc } from './__types__/moc'
import { CoverCard } from './CoverCard'
import { MetaCard } from './MetaCard'
import { StatsCard } from './StatsCard'
import { PartsGauge } from './PartsGauge'
import { OrdersCard } from './OrdersCard'
import { PartsListsCard } from './PartsListsCard'
import { InstructionsCard } from './InstructionsCard'
import { GalleryCard } from './GalleryCard'

const DASHBOARD_CARD_ORDER_STORAGE_KEY = 'mocDetailDashboard.cardOrder.v1'

type DashboardCardId = 'orders' | 'partsLists' | 'instructions' | 'gallery'

const DEFAULT_CARD_ORDER: DashboardCardId[] = ['orders', 'partsLists', 'instructions', 'gallery']

interface MocDetailDashboardProps {
  moc: Moc
  onThumbnailUpdated?: (newUrl: string) => void
}

export function MocDetailDashboard({ moc, onThumbnailUpdated }: MocDetailDashboardProps) {
  const [cardOrder, setCardOrder] = useState<DashboardCardId[]>(DEFAULT_CARD_ORDER)
  const [currentThumbnailUrl, setCurrentThumbnailUrl] = useState(moc.coverImageUrl)

  // Update local state when thumbnail is uploaded
  const handleThumbnailSuccess = useCallback(
    (newUrl: string) => {
      setCurrentThumbnailUrl(newUrl)
      onThumbnailUpdated?.(newUrl)
    },
    [onThumbnailUpdated],
  )
  const [draggedCardId, setDraggedCardId] = useState<DashboardCardId | null>(null)
  const [dragOverCardId, setDragOverCardId] = useState<DashboardCardId | null>(null)

  useEffect(() => {
    const savedOrder =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(DASHBOARD_CARD_ORDER_STORAGE_KEY)
        : null

    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder) as DashboardCardId[]
        if (
          Array.isArray(parsed) &&
          parsed.length === DEFAULT_CARD_ORDER.length &&
          parsed.every(id => DEFAULT_CARD_ORDER.includes(id))
        ) {
          setCardOrder(parsed)
        }
      } catch {
        // ignore invalid JSON
      }
    }
  }, [])

  const persistOrder = useCallback((order: DashboardCardId[]) => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(DASHBOARD_CARD_ORDER_STORAGE_KEY, JSON.stringify(order))
    } catch {
      // ignore storage failures (e.g. private mode)
    }
  }, [])

  const handleDragStart = useCallback(
    (cardId: DashboardCardId) => (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move'
      setDraggedCardId(cardId)
    },
    [],
  )

  const handleDragEnd = useCallback(() => {
    setDraggedCardId(null)
    setDragOverCardId(null)
  }, [])

  const handleDragOver = useCallback(
    (cardId: DashboardCardId) => (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverCardId(cardId)
    },
    [],
  )

  const handleDrop = useCallback(
    (dropCardId: DashboardCardId) => (e: React.DragEvent) => {
      e.preventDefault()
      if (!draggedCardId || draggedCardId === dropCardId) {
        setDragOverCardId(null)
        return
      }

      setCardOrder(prev => {
        const newOrder = [...prev]
        const draggedIndex = newOrder.indexOf(draggedCardId)
        const dropIndex = newOrder.indexOf(dropCardId)
        if (draggedIndex === -1 || dropIndex === -1) return prev
        newOrder.splice(draggedIndex, 1)
        newOrder.splice(dropIndex, 0, draggedCardId)
        persistOrder(newOrder)
        return newOrder
      })

      setDraggedCardId(null)
      setDragOverCardId(null)
    },
    [draggedCardId, persistOrder],
  )

  // Handle successful file upload - refresh data
  const handleFilesUploaded = useCallback(() => {
    // In a real app, this would trigger a refetch of MOC data
    // For now, we just show success - the data will refresh on next page load
    // Future: Add RTK Query invalidation here
  }, [])

  const renderCard = (cardId: DashboardCardId) => {
    switch (cardId) {
      case 'orders':
        return <OrdersCard orders={moc.orders} />
      case 'partsLists':
        return <PartsListsCard partsLists={moc.partsLists} />
      case 'instructions':
        return (
          <InstructionsCard
            mocId={moc.id}
            instructionsPdfUrls={moc.instructionsPdfUrls}
            onFilesUploaded={handleFilesUploaded}
          />
        )
      case 'gallery':
        return <GalleryCard galleryImages={moc.galleryImages} />
    }
  }

  const wrapWithDrag = (cardId: DashboardCardId, node: React.ReactNode) => {
    return (
      <div
        key={cardId}
        role="listitem"
        aria-roledescription="Draggable dashboard card"
        aria-grabbed={draggedCardId === cardId}
        tabIndex={0}
        draggable
        onDragStart={handleDragStart(cardId)}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver(cardId)}
        onDrop={handleDrop(cardId)}
        className={`animate-in fade-in slide-in-from-bottom-2 duration-300 ${
          draggedCardId === cardId ? 'opacity-50' : ''
        } ${dragOverCardId === cardId ? 'ring-2 ring-primary/50 rounded-lg' : ''}`}
      >
        {node}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 xl:py-8" data-testid="moc-detail-dashboard">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8">
        <aside className="xl:col-span-4 2xl:col-span-3 space-y-6 xl:sticky xl:top-20 xl:self-start">
          <CoverCard moc={{ title: moc.title, coverImageUrl: currentThumbnailUrl }} />
          <ThumbnailUpload
            mocId={moc.id}
            existingThumbnailUrl={currentThumbnailUrl}
            onSuccess={handleThumbnailSuccess}
          />
          <MetaCard
            moc={{
              title: moc.title,
              author: moc.author,
              description: moc.description,
              tags: moc.tags,
              updatedAt: moc.updatedAt,
              publishDate: moc.publishDate,
              purchasedDate: moc.purchasedDate,
            }}
          />
        </aside>

        <main className="xl:col-span-8 2xl:col-span-9 space-y-6">
          <StatsCard
            partsCount={moc.partsCount}
            galleryCount={moc.galleryImages.length}
            instructionsCount={moc.instructionsPdfUrls.length}
            partsListsCount={moc.partsLists.length}
          />
          <PartsGauge partsOwned={moc.partsOwned ?? 0} partsTotal={moc.partsCount ?? 0} />

          {cardOrder.map(cardId => wrapWithDrag(cardId, renderCard(cardId)))}
        </main>
      </div>
    </div>
  )
}
