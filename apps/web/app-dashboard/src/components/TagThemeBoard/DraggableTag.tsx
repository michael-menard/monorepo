import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@repo/app-component-library'
import { GripVertical } from 'lucide-react'

interface DraggableTagProps {
  tag: string
  mocCount: number
  isDragOverlay?: boolean
  themeCount?: number
}

export function DraggableTag({ tag, mocCount, isDragOverlay, themeCount }: DraggableTagProps) {
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
      className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors select-none ${
        isDragging
          ? 'opacity-40 border-dashed border-primary'
          : isMapped
            ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
            : 'border-border bg-background hover:bg-accent/50'
      } ${isDragOverlay ? 'shadow-lg border-primary bg-background' : ''}`}
      {...(isDragOverlay ? {} : { ...listeners, ...attributes })}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-grab" />
      <span className="truncate flex-1">{tag}</span>
      {themeCount !== undefined && themeCount > 0 ? (
        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
          {themeCount}
        </Badge>
      ) : null}
      <Badge variant="secondary" className="text-xs tabular-nums shrink-0">
        {mocCount}
      </Badge>
    </div>
  )
}
