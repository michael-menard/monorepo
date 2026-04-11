import { useDroppable } from '@dnd-kit/core'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from '@repo/app-component-library'
import { Palette, X, Trash2 } from 'lucide-react'

interface BucketTag {
  tag: string
  mocCount: number
}

interface ThemeBucketProps {
  theme: string
  tags: BucketTag[]
  onRemoveTag: (tag: string, theme: string) => void
  onDeleteTheme: (name: string) => void
}

export function ThemeBucket({ theme, tags, onRemoveTag, onDeleteTheme }: ThemeBucketProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `theme:${theme}`,
    data: { theme },
  })

  return (
    <Card
      ref={setNodeRef}
      className={`transition-all duration-150 ${
        isOver
          ? 'ring-2 ring-primary border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/30'
      }`}
    >
      <CardHeader className="pb-2 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            {theme}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs tabular-nums">
              {tags.length}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => onDeleteTheme(theme)}
              title={`Delete ${theme} theme`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {tags.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">Drop tags here</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => (
              <span
                key={t.tag}
                className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs"
              >
                {t.tag}
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-3.5">
                  {t.mocCount}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-destructive/10"
                  onClick={() => onRemoveTag(t.tag, theme)}
                  title={`Remove ${t.tag} from ${theme}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
