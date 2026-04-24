import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Badge, Button } from '@repo/app-component-library'
import { GripVertical, Trash2 } from 'lucide-react'

interface DraggableTagProps {
  tag: string
  mocCount: number
  isDragOverlay?: boolean
  themeCount?: number
  onDelete?: (tag: string) => void
}

export function DraggableTag({
  tag,
  mocCount,
  isDragOverlay,
  themeCount,
  onDelete,
}: DraggableTagProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tag:${tag}`,
    data: { tag },
  })

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined

  const isMapped = themeCount !== undefined && themeCount > 0

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      className={`group flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors select-none ${
        isDragging
          ? 'opacity-40 border-dashed border-primary'
          : isMapped
            ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
            : 'border-border bg-background hover:bg-accent/50'
      } ${isDragOverlay ? 'shadow-lg border-primary bg-background' : ''}`}
    >
      <div
        className="shrink-0 cursor-grab"
        {...(isDragOverlay ? {} : { ...listeners, ...attributes })}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <span className="truncate flex-1">{tag}</span>
      {themeCount !== undefined && themeCount > 0 ? (
        <Badge
          variant="default"
          className="text-[10px] px-1.5 py-0 h-4 shrink-0"
          title={`Mapped to ${themeCount} theme${themeCount === 1 ? '' : 's'}`}
        >
          {themeCount}
        </Badge>
      ) : null}
      <Badge
        variant="secondary"
        className="text-xs tabular-nums shrink-0"
        title={`Used by ${mocCount} MOC${mocCount === 1 ? '' : 's'}`}
      >
        {mocCount}
      </Badge>
      {onDelete ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
          onClick={e => {
            e.stopPropagation()
            onDelete(tag)
          }}
          title={`Delete "${tag}" from all MOCs`}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      ) : null}
    </div>
  )
}
