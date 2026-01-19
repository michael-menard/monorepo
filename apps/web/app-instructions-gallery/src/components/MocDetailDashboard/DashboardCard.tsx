import type React from 'react'
import { useState, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@repo/app-component-library'

interface DashboardCardProps {
  id: string
  title: string
  titleIcon?: React.ReactNode
  badge?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isDragging?: boolean
  isDragOver?: boolean
}

export function DashboardCard({
  id,
  title,
  titleIcon,
  badge,
  actions,
  children,
  defaultExpanded = true,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging = false,
  isDragOver = false,
}: DashboardCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  return (
    <Card
      data-card-id={id}
      className={`border-border shadow-sm overflow-hidden transition-all duration-300 ease-out hover:shadow-md ${
        isDragging ? 'opacity-50 scale-[0.98] ring-2 ring-primary shadow-lg' : ''
      } ${isDragOver ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 cursor-grab active:cursor-grabbing select-none">
        <div className="flex-shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 16 16" focusable="false">
            <circle cx="3" cy="4" r="1" className="fill-current" />
            <circle cx="3" cy="8" r="1" className="fill-current" />
            <circle cx="3" cy="12" r="1" className="fill-current" />
            <circle cx="8" cy="4" r="1" className="fill-current" />
            <circle cx="8" cy="8" r="1" className="fill-current" />
            <circle cx="8" cy="12" r="1" className="fill-current" />
          </svg>
        </div>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          {titleIcon}
          <CardTitle className="text-lg font-semibold text-foreground truncate">{title}</CardTitle>
          {badge}
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleExpanded}
            className="h-8 w-8 transition-transform duration-200"
            aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
            aria-expanded={isExpanded}
          >
            <span
              aria-hidden="true"
              className={`inline-block h-4 w-4 border-b-2 border-r-2 border-current transform transition-transform duration-300 ${
                isExpanded ? 'rotate-45 translate-y-[-1px]' : '-rotate-45'
              }`}
            />
          </Button>
        </div>
      </CardHeader>

      <div
        className={`grid transition-all duration-300 ease-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <CardContent className="pt-0 space-y-4">{children}</CardContent>
        </div>
      </div>
    </Card>
  )
}
