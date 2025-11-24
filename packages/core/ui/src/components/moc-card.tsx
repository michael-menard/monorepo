import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'

const mocCardVariants = cva(
  'transition-all duration-200 hover:shadow-lg group cursor-pointer',
  {
    variants: {
      variant: {
        default: 'hover:scale-[1.02] hover:shadow-md',
        interactive: 'hover:scale-[1.02] hover:shadow-lg hover:border-primary/50',
        compact: 'hover:shadow-md',
        featured: 'border-2 border-primary/20 hover:border-primary/40 hover:scale-[1.01] shadow-md hover:shadow-xl',
      },
      size: {
        default: 'min-h-[200px]',
        sm: 'min-h-[150px]',
        lg: 'min-h-[250px]',
        compact: 'min-h-[120px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

interface MocCardProps extends React.ComponentProps<typeof Card>, VariantProps<typeof mocCardVariants> {
  imageUrl?: string
  imageAlt?: string
  title: string
  description?: string
  metadata?: {
    pieces?: number
    difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Expert'
    category?: string
    author?: string
  }
  actions?: React.ReactNode
  onCardClick?: () => void
}

function MocCard({
  className,
  variant,
  size,
  imageUrl,
  imageAlt,
  title,
  description,
  metadata,
  actions,
  onCardClick,
  children,
  ...props
}: MocCardProps) {
  return (
    <Card
      className={cn(mocCardVariants({ variant, size }), className)}
      onClick={onCardClick}
      {...props}
    >
      {imageUrl && (
        <div className="relative overflow-hidden rounded-t-xl">
          <img
            src={imageUrl}
            alt={imageAlt || title}
            className="w-full h-48 object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
          {metadata?.difficulty && (
            <div className="absolute top-2 right-2">
              <DifficultyBadge difficulty={metadata.difficulty} />
            </div>
          )}
        </div>
      )}
      
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </CardDescription>
        )}
      </CardHeader>

      {metadata && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {metadata.pieces && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                {metadata.pieces} pieces
              </span>
            )}
            {metadata.category && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-accent rounded-full"></span>
                {metadata.category}
              </span>
            )}
            {metadata.author && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-secondary rounded-full"></span>
                by {metadata.author}
              </span>
            )}
          </div>
        </CardContent>
      )}

      {children}

      {actions && (
        <CardFooter className="pt-3">
          <div className="flex gap-2 w-full">
            {actions}
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

interface DifficultyBadgeProps {
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert'
}

function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const badgeVariants = {
    Easy: 'bg-success/90 text-success-foreground',
    Medium: 'bg-warning/90 text-warning-foreground',
    Hard: 'bg-destructive/90 text-destructive-foreground',
    Expert: 'bg-primary/90 text-primary-foreground',
  }

  return (
    <span className={cn(
      'px-2 py-1 rounded-full text-xs font-medium shadow-sm',
      badgeVariants[difficulty]
    )}>
      {difficulty}
    </span>
  )
}

// Compact variant for list views
function MocCardCompact({
  className,
  imageUrl,
  imageAlt,
  title,
  description,
  metadata,
  actions,
  onCardClick,
  ...props
}: MocCardProps) {
  return (
    <Card
      className={cn(
        'flex flex-row items-center gap-4 p-4 hover:shadow-md transition-all duration-200 cursor-pointer hover:bg-accent/5',
        className
      )}
      onClick={onCardClick}
      {...props}
    >
      {imageUrl && (
        <div className="flex-shrink-0">
          <img
            src={imageUrl}
            alt={imageAlt || title}
            className="w-16 h-16 object-cover rounded-lg"
            loading="lazy"
          />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground truncate">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground truncate">{description}</p>
        )}
        {metadata && (
          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
            {metadata.pieces && <span>{metadata.pieces} pieces</span>}
            {metadata.difficulty && <DifficultyBadge difficulty={metadata.difficulty} />}
          </div>
        )}
      </div>

      {actions && (
        <div className="flex-shrink-0">
          {actions}
        </div>
      )}
    </Card>
  )
}

export { MocCard, MocCardCompact, DifficultyBadge, mocCardVariants }
