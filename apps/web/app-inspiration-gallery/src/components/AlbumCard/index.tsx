/**
 * AlbumCard Component
 *
 * Displays an album with an OrganicPile of preview images stacked together.
 * On hover, ExpandableStack shows a grid preview of the album contents.
 * Falls back to a folder icon for empty albums.
 *
 * REPA-009: Refactored to use GalleryCard
 * INSP-028: Replaced CSS faux-stack with OrganicPile + ExpandableStack
 */

import { z } from 'zod'
import { OrganicPile, ExpandableStack } from '@repo/app-component-library'
import { GalleryCard } from '@repo/gallery'
import { Folder, MoreVertical, FolderOpen } from 'lucide-react'
import { MiniInspirationCard } from './MiniInspirationCard'

/**
 * Preview image shape matching the API response
 */
const PreviewImageSchema = z.object({
  id: z.string().uuid(),
  imageUrl: z.string(),
  thumbnailUrl: z.string().nullable(),
})

/**
 * Album card props schema (data fields only)
 */
const AlbumCardPropsSchema = z.object({
  /** Unique identifier */
  id: z.string().uuid(),
  /** Display title */
  title: z.string(),
  /** Description */
  description: z.string().nullable().optional(),
  /** Cover image URL */
  coverImageUrl: z.string().nullable().optional(),
  /** Preview images for stack display (first 4 items) */
  previewImages: z.array(PreviewImageSchema).optional(),
  /** Number of items in the album */
  itemCount: z.number().int().optional(),
  /** Number of child albums */
  childAlbumCount: z.number().int().optional(),
  /** Tags for categorization */
  tags: z.array(z.string()).nullable().optional(),
  /** Whether the card is currently selected */
  isSelected: z.boolean().optional(),
  /** Whether selection mode is active */
  selectionMode: z.boolean().optional(),
})

export type AlbumCardProps = z.infer<typeof AlbumCardPropsSchema> & {
  /** Called when card is clicked */
  onClick?: () => void
  /** Called when card is selected/deselected */
  onSelect?: (selected: boolean) => void
  /** Called when more menu is opened */
  onMenuClick?: (event: React.MouseEvent) => void
}

/**
 * AlbumCard Component
 *
 * Displays an album in a card format with:
 * - OrganicPile of preview images (replacing CSS faux-stack)
 * - ExpandableStack hover preview grid
 * - Folder icon fallback for empty albums
 * - Item count badge
 * - Selection checkbox in selection mode (via GalleryCard)
 * - More menu for additional actions
 */
export function AlbumCard({
  id,
  title,
  description,
  coverImageUrl,
  previewImages = [],
  itemCount = 0,
  childAlbumCount = 0,
  tags,
  isSelected = false,
  selectionMode = false,
  onClick,
  onSelect,
  onMenuClick,
}: AlbumCardProps) {
  const handleMenuClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    onMenuClick?.(event)
  }

  const hasPreviewImages = previewImages.length > 0

  // Map preview images to StackItem format
  const stackItems = previewImages.map(img => ({ id: img.id }))

  // Build a lookup for rendering
  const imageById = new Map(previewImages.map(img => [img.id, img]))

  const renderStackItem = (item: { id: string }) => {
    const img = imageById.get(item.id)
    if (!img) return null
    return <MiniInspirationCard imageUrl={img.thumbnailUrl ?? img.imageUrl} alt={title} />
  }

  const hoverOverlay = (
    <>
      {/* Top actions */}
      <div className="absolute top-2 right-2 flex gap-1 z-20">
        <button
          onClick={handleMenuClick}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          aria-label="More options"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Item count badge */}
      <div className="absolute bottom-2 right-2 z-20">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-black/60 text-white">
          {itemCount} item{itemCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-white/80" />
          <h3 className="text-white font-medium text-sm truncate flex-1">{title}</h3>
        </div>

        {description ? (
          <p className="text-white/70 text-xs mt-1 line-clamp-2">{description}</p>
        ) : null}

        {/* Sub-info row */}
        <div className="flex items-center gap-2 mt-2">
          {childAlbumCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-white/80">
              <Folder className="h-3 w-3" />
              {childAlbumCount} sub-album{childAlbumCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Tags (show first 2) */}
        {tags && tags.length > 0 ? (
          <div className="flex items-center gap-1 mt-2">
            {tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white/20 text-white"
              >
                {tag}
              </span>
            ))}
            {tags.length > 2 && <span className="text-xs text-white/70">+{tags.length - 2}</span>}
          </div>
        ) : null}
      </div>
    </>
  )

  // Empty album — use GalleryCard with folder icon fallback
  if (!hasPreviewImages) {
    return (
      <GalleryCard
        image={coverImageUrl ? { src: coverImageUrl, alt: title, aspectRatio: '1/1' } : undefined}
        imageFallback={
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <Folder className="h-16 w-16 text-primary/40" />
          </div>
        }
        title={title}
        onClick={onClick}
        selected={isSelected}
        selectable={selectionMode}
        onSelect={onSelect}
        showContent={false}
        data-testid={`album-card-${id}`}
        hoverOverlay={hoverOverlay}
      />
    )
  }

  // Album with preview images — OrganicPile wrapped in ExpandableStack
  return (
    <ExpandableStack
      items={stackItems}
      renderPreviewItem={renderStackItem}
      onItemClick={onClick ? () => onClick() : undefined}
      hoverDelayMs={300}
      columns={2}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') onClick?.()
        }}
        className="relative cursor-pointer"
        data-testid={`album-card-${id}`}
      >
        <OrganicPile
          items={stackItems}
          renderItem={renderStackItem}
          maxVisible={4}
          className="aspect-square"
        />

        {/* Selection overlay */}
        {selectionMode && onSelect ? (
          <div className="absolute top-2 left-2 z-30">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={e => {
                e.stopPropagation()
                onSelect(!isSelected)
              }}
              onClick={e => e.stopPropagation()}
              className="h-5 w-5 rounded border-2 border-white/80 bg-black/30"
              aria-label={`Select album ${title}`}
            />
          </div>
        ) : null}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity rounded-lg">
          {hoverOverlay}
        </div>
      </div>
    </ExpandableStack>
  )
}

export default AlbumCard
