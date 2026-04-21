/**
 * InstructionCard Component
 * Story 3.1.2: Instructions Card Component
 *
 * Displays an instruction item in the gallery using the shared GalleryCard component.
 */
import { useCallback } from 'react'
import { Heart, Pencil, Hammer } from 'lucide-react'
import { GalleryCard } from '@repo/gallery'
import { Badge, Button, cn } from '@repo/app-component-library'
import type { Instruction } from '../../__types__'

export interface InstructionCardProps {
  /** The instruction data to display */
  instruction: Instruction
  /** Handler for favorite action */
  onFavorite?: (id: string) => void
  /** Handler for want-to-build toggle (procurement) */
  onWantToBuild?: (id: string) => void
  /** Handler for edit action */
  onEdit?: (id: string) => void
  /** Handler for click/navigation */
  onClick?: (id: string) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * InstructionCard - Displays an instruction item with thumbnail, metadata, and actions
 *
 * @example
 * ```tsx
 * <InstructionCard
 *   instruction={instruction}
 *   onClick={(id) => navigate(`/instructions/${id}`)}
 *   onFavorite={(id) => toggleFavorite(id)}
 *   onEdit={(id) => openEditModal(id)}
 * />
 * ```
 */
export const InstructionCard = ({
  instruction,
  onFavorite,
  onWantToBuild,
  onEdit,
  onClick,
  className,
}: InstructionCardProps) => {
  const handleClick = useCallback(() => {
    onClick?.(instruction.id)
  }, [onClick, instruction.id])

  const handleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onFavorite?.(instruction.id)
    },
    [onFavorite, instruction.id],
  )

  const handleWantToBuild = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onWantToBuild?.(instruction.id)
    },
    [onWantToBuild, instruction.id],
  )

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onEdit?.(instruction.id)
    },
    [onEdit, instruction.id],
  )

  return (
    <GalleryCard
      image={
        instruction.thumbnail
          ? { src: instruction.thumbnail, alt: instruction.name, aspectRatio: '1/1' }
          : undefined
      }
      imageFallback={
        <div className="flex h-full w-full items-center justify-center pb-12 bg-gradient-to-br from-primary/10 to-primary/5">
          <span className="text-4xl font-bold text-muted-foreground/70">{instruction.name}</span>
        </div>
      }
      contentDrawer={true}
      title={instruction.name}
      onClick={handleClick}
      className={className}
      data-testid={`instruction-card-${instruction.id}`}
      metadata={
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" data-testid="piece-count-badge">
              {instruction.pieceCount.toLocaleString()} pieces
            </Badge>
            {instruction.wantToBuild && (
              <Badge
                className="bg-amber-500/15 text-amber-600 border-amber-500/30"
                data-testid="want-to-build-badge"
              >
                <Hammer className="mr-1 h-3 w-3" />
                Build Plan
              </Badge>
            )}
            <span className="text-sm text-muted-foreground" data-testid="theme-tag">
              {instruction.theme}
            </span>
          </div>
          {instruction.tags.length > 0 && (
            <div className="flex flex-wrap gap-1" data-testid="tags">
              {instruction.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      }
      hoverOverlay={
        <div className="absolute inset-0 flex items-end p-4">
          <div className="flex gap-1">
            {onFavorite ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFavorite}
                aria-label={instruction.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                data-testid="favorite-button"
                className="text-white hover:text-white hover:bg-white/20"
              >
                <Heart
                  className={cn('h-4 w-4', instruction.isFavorite && 'fill-current text-red-500')}
                />
              </Button>
            ) : null}
            {onWantToBuild ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleWantToBuild}
                aria-label={
                  instruction.wantToBuild ? 'Remove from build plan' : 'Add to build plan'
                }
                data-testid="want-to-build-button"
                className="text-white hover:text-white hover:bg-white/20"
              >
                <Hammer
                  className={cn(
                    'h-4 w-4',
                    instruction.wantToBuild && 'fill-current text-amber-400',
                  )}
                />
              </Button>
            ) : null}
            {onEdit ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEdit}
                aria-label="Edit instruction"
                data-testid="edit-button"
                className="text-white hover:text-white hover:bg-white/20"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      }
    />
  )
}

export default InstructionCard
