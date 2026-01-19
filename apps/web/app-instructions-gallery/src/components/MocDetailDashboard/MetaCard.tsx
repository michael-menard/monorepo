import { useState, useCallback } from 'react'
import { Card, CardContent, AppBadge as Badge } from '@repo/app-component-library'
import { ExternalLink, Calendar, User } from 'lucide-react'
import type { Moc } from './__types__/moc'

interface MetaCardProps {
  moc: Pick<
    Moc,
    'title' | 'author' | 'description' | 'tags' | 'updatedAt' | 'publishDate' | 'purchasedDate'
  >
}

const DESCRIPTION_CLAMP_LENGTH = 200

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return isoDate
  }
}

export function MetaCard({ moc }: MetaCardProps) {
  const { title, author, description, tags, updatedAt, publishDate, purchasedDate } = moc
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const safeTags = tags ?? []

  const shouldClamp = description && description.length > DESCRIPTION_CLAMP_LENGTH && !isExpanded
  const displayDescription = shouldClamp
    ? `${description.slice(0, DESCRIPTION_CLAMP_LENGTH)}…`
    : description

  return (
    <Card className="border-border shadow-sm transition-all duration-300 hover:shadow-md">
      <CardContent className="p-4 space-y-4">
        <h1 className="text-2xl font-bold leading-tight text-balance text-foreground">{title}</h1>

        {author ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" aria-hidden="true" />
            <span>By</span>
            {author.url ? (
              <a
                href={author.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded transition-colors group"
              >
                {author.displayName}
                <ExternalLink
                  className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
                <span className="sr-only">(opens in new tab)</span>
              </a>
            ) : (
              <span className="font-medium text-foreground">{author.displayName}</span>
            )}
          </div>
        ) : null}

        <dl className="space-y-2 text-sm">
          {publishDate ? (
            <div className="flex items-center gap-2 p-1.5 -mx-1.5 rounded-md transition-colors hover:bg-muted/50">
              <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <dt className="text-muted-foreground">Published</dt>
              <dd className="text-foreground font-medium">{formatDate(publishDate)}</dd>
            </div>
          ) : null}
          {updatedAt ? (
            <div className="flex items-center gap-2 p-1.5 -mx-1.5 rounded-md transition-colors hover:bg-muted/50">
              <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <dt className="text-muted-foreground">Updated</dt>
              <dd className="text-foreground font-medium">{formatDate(updatedAt)}</dd>
            </div>
          ) : null}
          {purchasedDate ? (
            <div className="flex items-center gap-2 p-1.5 -mx-1.5 rounded-md transition-colors hover:bg-muted/50">
              <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <dt className="text-muted-foreground">Purchased</dt>
              <dd className="text-foreground font-medium">{formatDate(purchasedDate)}</dd>
            </div>
          ) : null}
        </dl>

        {safeTags.length > 0 && (
          <div className="flex flex-wrap gap-2" role="list" aria-label="Tags">
            {safeTags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                role="listitem"
                className="bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 border-0 transition-all duration-200 hover:scale-105 cursor-default"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {description ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed transition-all duration-300">
              {displayDescription}
            </p>
            {description.length > DESCRIPTION_CLAMP_LENGTH && (
              <button
                type="button"
                className="h-auto p-0 text-xs text-primary transition-all hover:translate-x-0.5 underline-offset-2 hover:underline"
                onClick={toggleExpanded}
                aria-expanded={isExpanded}
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
