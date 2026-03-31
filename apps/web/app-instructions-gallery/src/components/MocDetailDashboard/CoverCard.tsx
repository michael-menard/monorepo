import { Card, CardContent } from '@repo/app-component-library'
import type { Moc } from './__types__/moc'

interface CoverCardProps {
  moc: Pick<Moc, 'title' | 'coverImageUrl'>
}

export function CoverCard({ moc }: CoverCardProps) {
  return (
    <Card className="overflow-hidden border-border shadow-sm transition-all duration-300 hover:shadow-md">
      <CardContent className="p-4">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
          {moc.coverImageUrl ? (
            <img
              src={moc.coverImageUrl}
              alt={`Cover image for ${moc.title}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
              No image
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
