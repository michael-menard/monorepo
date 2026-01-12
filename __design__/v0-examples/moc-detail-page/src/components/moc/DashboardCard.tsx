"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, GripVertical } from "lucide-react"

interface DashboardCardProps {
  id: string
  title: string
  titleIcon?: React.ReactNode
  badge?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
  // Drag handlers passed from parent
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
    setIsExpanded((prev) => !prev)
  }, [])

  return (
    <Card
      data-card-id={id}
      className={`
        border-border shadow-sm overflow-hidden
        transition-all duration-300 ease-out
        ${isDragging ? "opacity-50 scale-[0.98] ring-2 ring-primary shadow-lg" : ""}
        ${isDragOver ? "ring-2 ring-primary/50 bg-primary/5" : ""}
        hover:shadow-md
      `}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 cursor-grab active:cursor-grabbing select-none">
        {/* Drag handle */}
        <div className="flex-shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          <GripVertical className="h-5 w-5" aria-hidden="true" />
        </div>

        {/* Title area */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {titleIcon}
          <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
          {badge}
        </div>

        {/* Actions */}
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
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? "" : "-rotate-90"}`}
              aria-hidden="true"
            />
          </Button>
        </div>
      </CardHeader>

      {/* Collapsible content with animation */}
      <div
        className={`
          grid transition-all duration-300 ease-out
          ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}
        `}
      >
        <div className="overflow-hidden">
          <CardContent className="pt-0 space-y-4">{children}</CardContent>
        </div>
      </div>
    </Card>
  )
}
