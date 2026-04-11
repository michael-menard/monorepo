import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Input } from '@repo/app-component-library'
import { Tag, Search } from 'lucide-react'
import { DraggableTag } from './DraggableTag'
import type { TagWithThemes } from '@repo/api-client/rtk/dashboard-api'

interface UnmappedPanelProps {
  tags: TagWithThemes[]
  showAll?: boolean
}

export function UnmappedPanel({ tags, showAll }: UnmappedPanelProps) {
  const [search, setSearch] = useState('')

  // Show all tags (they can belong to multiple themes) or filter to unmapped
  const displayTags = showAll ? tags : tags.filter(t => t.themes.length === 0)

  const filtered = search
    ? displayTags.filter(t => t.tag.toLowerCase().includes(search.toLowerCase()))
    : displayTags

  return (
    <Card className="h-full border-border">
      <CardHeader className="pb-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          All Tags
          <span className="text-xs font-normal text-muted-foreground">({displayTags.length})</span>
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter tags..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 overflow-y-auto max-h-[calc(100vh-280px)]">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            {search ? 'No matching tags' : 'No tags found'}
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map(t => (
              <DraggableTag
                key={t.tag}
                tag={t.tag}
                mocCount={t.mocCount}
                themeCount={t.themes.length}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
