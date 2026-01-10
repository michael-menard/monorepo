/**
 * SetCard Component
 * Card display for sets in the grid view
 */
import { Card, CardContent, CardFooter, Badge } from '@repo/app-component-library'
import type { BrickSet } from '../api/mock-sets-api'

export type SetCardProps = {
  set: BrickSet
  onClick?: () => void
}

/**
 * Format build status for display
 */
const formatBuildStatus = (status?: string) => {
  if (!status) return 'Not Started'
  return status
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Build status variant mapping
 */
const buildStatusVariantMap: Record<string, 'default' | 'secondary' | 'outline'> = {
  complete: 'default',
  'in-progress': 'secondary',
  planned: 'outline',
}

/**
 * SetCard Component
 * Displays a set in a card format for grid view
 */
export function SetCard({ set, onClick }: SetCardProps) {
  const handleClick = () => {
    onClick?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${set.name}`}
    >
      {/* Thumbnail Image */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        {set.thumbnail ? (
          <img
            src={set.thumbnail}
            alt={set.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
        )}
        {/* Set Number Badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="font-mono">
            #{set.setNumber}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Set Name */}
        <h3 className="font-semibold text-base mb-2 line-clamp-2">{set.name}</h3>

        {/* Set Details */}
        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Pieces:</span>
            <span className="font-medium text-foreground tabular-nums">
              {set.pieceCount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Theme:</span>
            <span className="font-medium text-foreground">{set.theme}</span>
          </div>
        </div>

        {/* Tags */}
        {set.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {set.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {set.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{set.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="px-4 pb-4 pt-0">
        {/* Build Status */}
        <Badge
          variant={
            set.buildStatus ? buildStatusVariantMap[set.buildStatus] || 'outline' : 'outline'
          }
          className="w-full justify-center"
        >
          {formatBuildStatus(set.buildStatus)}
        </Badge>
      </CardFooter>
    </Card>
  )
}

export default SetCard
