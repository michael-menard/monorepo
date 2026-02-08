/**
 * EmptyState Component
 *
 * Displays when there are no inspirations or albums to show.
 * Provides helpful guidance and a call-to-action.
 *
 * INSP-018: Empty States & Onboarding
 */

import { z } from 'zod'
import { Button, cn } from '@repo/app-component-library'
import { ImagePlus, FolderPlus, Sparkles, Upload } from 'lucide-react'

/**
 * Empty state variant type
 */
const EmptyStateVariantSchema = z.enum([
  'no-inspirations', // No inspirations in gallery
  'no-albums', // No albums created
  'empty-album', // Album has no items
  'no-search-results', // Search returned no results
  'first-time', // First-time user experience
])

export type EmptyStateVariant = z.infer<typeof EmptyStateVariantSchema>

/**
 * Empty state props schema
 */
const EmptyStatePropsSchema = z.object({
  /** Variant determines the message and icon */
  variant: EmptyStateVariantSchema.default('no-inspirations'),
  /** Album name for empty-album variant */
  albumName: z.string().optional(),
  /** Search query for no-search-results variant */
  searchQuery: z.string().optional(),
})

export type EmptyStateProps = z.infer<typeof EmptyStatePropsSchema> & {
  /** Called when primary action is clicked */
  onPrimaryAction?: () => void
  /** Called when secondary action is clicked */
  onSecondaryAction?: () => void
  /** Optional custom class name */
  className?: string
}

const VARIANT_CONFIG: Record<
  EmptyStateVariant,
  {
    icon: React.ElementType
    title: string
    description: string
    primaryLabel?: string
    secondaryLabel?: string
  }
> = {
  'no-inspirations': {
    icon: ImagePlus,
    title: 'Start collecting inspiration',
    description:
      'Upload images that inspire your LEGO MOC builds. Save photos from Pinterest, Instagram, or your own creations.',
    primaryLabel: 'Upload Inspiration',
    secondaryLabel: 'Create Album',
  },
  'no-albums': {
    icon: FolderPlus,
    title: 'Organize with albums',
    description:
      'Create albums to group your inspirations by theme, project, or technique. Stack images together to quickly create an album.',
    primaryLabel: 'Create Album',
  },
  'empty-album': {
    icon: ImagePlus,
    title: 'This album is empty',
    description: 'Add inspirations to this album to keep your ideas organized.',
    primaryLabel: 'Add Inspirations',
  },
  'no-search-results': {
    icon: Sparkles,
    title: 'No results found',
    description: "Try adjusting your search or filters to find what you're looking for.",
    primaryLabel: 'Clear Search',
  },
  'first-time': {
    icon: Upload,
    title: 'Welcome to your Inspiration Gallery',
    description:
      'This is where you collect and organize visual inspiration for your LEGO MOC builds. Get started by uploading your first inspiration image.',
    primaryLabel: 'Upload Your First Inspiration',
    secondaryLabel: 'Learn More',
  },
}

/**
 * EmptyState Component
 *
 * Displays contextual empty states for the inspiration gallery:
 * - No inspirations: Encourage first upload
 * - No albums: Explain album organization
 * - Empty album: Prompt to add items
 * - No search results: Suggest clearing filters
 * - First-time: Welcome and onboarding
 */
export function EmptyState({
  variant = 'no-inspirations',
  albumName,
  searchQuery,
  onPrimaryAction,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant]
  const Icon = config.icon

  // Customize description for context
  let description = config.description
  if (variant === 'empty-album' && albumName) {
    description = `Add inspirations to "${albumName}" to keep your ideas organized.`
  }
  if (variant === 'no-search-results' && searchQuery) {
    description = `No results found for "${searchQuery}". Try adjusting your search or filters.`
  }

  return (
    <div
      className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}
      role="status"
      aria-label={config.title}
    >
      {/* Icon */}
      <div className="mb-6 p-4 rounded-full bg-muted">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-foreground mb-2">{config.title}</h3>

      {/* Description */}
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {config.primaryLabel && onPrimaryAction ? (
          <Button onClick={onPrimaryAction}>
            {variant === 'no-inspirations' || variant === 'first-time' ? (
              <Upload className="h-4 w-4 mr-2" />
            ) : variant === 'no-albums' || variant === 'empty-album' ? (
              <FolderPlus className="h-4 w-4 mr-2" />
            ) : null}
            {config.primaryLabel}
          </Button>
        ) : null}

        {config.secondaryLabel && onSecondaryAction ? (
          <Button variant="outline" onClick={onSecondaryAction}>
            {config.secondaryLabel}
          </Button>
        ) : null}
      </div>

      {/* Onboarding tips for first-time users */}
      {variant === 'first-time' && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
            <ImagePlus className="h-6 w-6 text-primary mb-2" />
            <span className="text-sm font-medium">Upload Images</span>
            <span className="text-xs text-muted-foreground">PNG, JPG, WebP, GIF</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
            <FolderPlus className="h-6 w-6 text-primary mb-2" />
            <span className="text-sm font-medium">Create Albums</span>
            <span className="text-xs text-muted-foreground">Organize by project</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
            <Sparkles className="h-6 w-6 text-primary mb-2" />
            <span className="text-sm font-medium">Link to MOCs</span>
            <span className="text-xs text-muted-foreground">Connect inspiration to builds</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmptyState
