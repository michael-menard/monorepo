/**
 * InstructionCard Component
 * Story 3.1.2: Instructions Card Component
 *
 * Displays an instruction item in the gallery using the shared GalleryCard component.
 */
import { useCallback } from 'react'
import { Heart, Pencil } from 'lucide-react'
import { GalleryCard } from '@repo/gallery'
import { Badge, Button, cn } from '@repo/app-component-library'
import type { Instruction } from '../../__types__'

export interface InstructionCardProps {
  /** The instruction data to display */
  instruction: Instruction
  /** Handler for favorite action */
  onFavorite?: (id: string) => void
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

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onEdit?.(instruction.id)
    },
    [onEdit, instruction.id],
  )

  return (
    <GalleryCard
      image={{
        src: instruction.thumbnail,
        alt: instruction.name,
        aspectRatio: '4/3',
      }}
      title={instruction.name}
      onClick={handleClick}
      className={className}
      data-testid={`instruction-card-${instruction.id}`}
      metadata={
        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="piece-count-badge">
            {instruction.pieceCount.toLocaleString()} pieces
          </Badge>
          <span className="text-sm text-muted-foreground" data-testid="theme-tag">
            {instruction.theme}
          </span>
        </div>
      }
      actions={
        <div className="flex gap-1">
          {onFavorite ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFavorite}
              aria-label={instruction.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              data-testid="favorite-button"
            >
              <Heart
                className={cn('h-4 w-4', instruction.isFavorite && 'fill-current text-red-500')}
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
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      }
    />
  )
}

export default InstructionCard
