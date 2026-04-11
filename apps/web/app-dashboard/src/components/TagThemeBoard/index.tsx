import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Button, Input } from '@repo/app-component-library'
import { Plus } from 'lucide-react'
import { logger } from '@repo/logger'
import type { TagWithThemes } from '@repo/api-client/rtk/dashboard-api'
import { UnmappedPanel } from './UnmappedPanel'
import { ThemeBucket } from './ThemeBucket'
import { DraggableTag } from './DraggableTag'

interface TagThemeBoardProps {
  tags: TagWithThemes[]
  themes: string[]
  onAssign: (mappings: { tag: string; theme: string }[]) => void
  onRemove: (tag: string, theme: string) => void
}

export function TagThemeBoard({ tags, themes, onAssign, onRemove }: TagThemeBoardProps) {
  const [activeTag, setActiveTag] = useState<TagWithThemes | null>(null)
  const [newThemeName, setNewThemeName] = useState('')
  const [localThemes, setLocalThemes] = useState<string[]>([])

  const allThemes = useMemo(() => {
    const combined = new Set([...themes, ...localThemes])
    return Array.from(combined).sort()
  }, [themes, localThemes])

  // Build per-theme tag lists from the many-to-many data
  const tagsByTheme = useMemo(() => {
    const map = new Map<string, { tag: string; mocCount: number }[]>()
    for (const theme of allThemes) {
      map.set(theme, [])
    }
    for (const t of tags) {
      for (const theme of t.themes) {
        const existing = map.get(theme) ?? []
        existing.push({ tag: t.tag, mocCount: t.mocCount })
        map.set(theme, existing)
      }
    }
    return map
  }, [tags, allThemes])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const tagName = event.active.data.current?.tag as string | undefined
      if (tagName) {
        const found = tags.find(t => t.tag === tagName)
        setActiveTag(found ?? null)
      }
    },
    [tags],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTag(null)
      const { active, over } = event
      if (!over) return

      const tagName = active.data.current?.tag as string | undefined
      if (!tagName) return

      const overId = String(over.id)

      if (overId.startsWith('theme:')) {
        const theme = overId.slice('theme:'.length)
        // Check if already in this theme
        const tagData = tags.find(t => t.tag === tagName)
        if (tagData && !tagData.themes.includes(theme)) {
          onAssign([{ tag: tagName, theme }])
        }
      }
    },
    [tags, onAssign],
  )

  const handleAddTheme = useCallback(() => {
    const name = newThemeName.trim()
    if (!name) return
    if (allThemes.includes(name)) {
      logger.warn('Theme already exists', undefined, { name })
      return
    }
    setLocalThemes(prev => [...prev, name])
    setNewThemeName('')
  }, [newThemeName, allThemes])

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
        {/* Left panel — all tags */}
        <div className="lg:col-span-4">
          <UnmappedPanel tags={tags} showAll />
        </div>

        {/* Right panel — theme buckets */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="New theme name..."
              value={newThemeName}
              onChange={e => setNewThemeName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddTheme()
              }}
              className="h-8 text-sm max-w-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddTheme}
              disabled={!newThemeName.trim()}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Theme
            </Button>
          </div>

          {allThemes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Create a theme to get started, then drag tags into it.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allThemes.map(theme => (
                <ThemeBucket
                  key={theme}
                  theme={theme}
                  tags={tagsByTheme.get(theme) ?? []}
                  onRemoveTag={onRemove}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeTag ? (
          <DraggableTag
            tag={activeTag.tag}
            mocCount={activeTag.mocCount}
            isDragOverlay
            themeCount={activeTag.themes.length}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
