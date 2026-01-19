# Story insp-2019: Tag Management & Onboarding

## Status

Draft

## Consolidates

- insp-1048.tag-management-integration
- insp-1049.onboarding-tooltips

## Story

**As a** user,
**I want** intuitive tag management and helpful onboarding,
**so that** I can organize my inspirations and learn features easily.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - User Interface, Interaction Patterns

## Dependencies

- **insp-2002**: Inspiration Gallery MVP
- **insp-2004**: Edit Inspiration

## Acceptance Criteria

### Tag Autocomplete

1. Tag input shows autocomplete suggestions
2. Suggestions come from user's existing tags
3. Suggestions filtered as user types
4. Can select suggestion with click or Enter
5. Can still create new tags not in suggestions
6. Maximum 10 tags per item enforced

### Tag Filtering

7. Filter bar shows available tags as chips
8. Click tag chip to filter by that tag
9. Multiple tags filter with AND logic
10. Active filters shown with clear option
11. Tag counts shown next to each tag

### Onboarding Tooltips

12. First visit shows stack gesture tooltip: "Tip: Drag images onto each other to create albums"
13. Tooltip dismissible with "Got it" button
14. "Don't show again" option persisted
15. Tooltip positioned near relevant action area
16. Additional tooltips for other discoverable features (optional)

## Tasks / Subtasks

### Task 1: Create Tag Autocomplete (AC: 1-6)

- [ ] Create `TagInput` component with autocomplete
- [ ] Fetch user's existing tags
- [ ] Filter suggestions as user types
- [ ] Handle selection and creation
- [ ] Enforce max 10 limit

### Task 2: Implement Tag Filtering (AC: 7-11)

- [ ] Create `TagFilterBar` component
- [ ] Fetch available tags with counts
- [ ] Toggle tag filter on click
- [ ] Support multiple active filters
- [ ] Clear filters functionality

### Task 3: Create Onboarding Tooltips (AC: 12-16)

- [ ] Create `OnboardingTooltip` component
- [ ] Check localStorage for dismissed state
- [ ] Position tooltip appropriately
- [ ] Handle dismiss and don't show again
- [ ] Stack gesture tooltip content

### Task 4: Integrate Components

- [ ] Add TagInput to upload/edit modals
- [ ] Add TagFilterBar to gallery
- [ ] Add onboarding to gallery page

## Dev Notes

### Tag Autocomplete Component

```typescript
// apps/web/main-app/src/routes/inspiration/-components/TagInput/index.tsx
import { useState, useRef, useEffect } from 'react'
import { Input, Badge, Command, CommandList, CommandItem } from '@repo/ui'
import { X } from 'lucide-react'
import { useGetUserTagsQuery } from '@repo/api-client/rtk/inspiration-api'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  disabled?: boolean
  maxTags?: number
}

export function TagInput({ value, onChange, disabled, maxTags = 10 }: TagInputProps) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: existingTags } = useGetUserTagsQuery()

  const suggestions = existingTags?.filter(
    tag => tag.toLowerCase().includes(input.toLowerCase()) && !value.includes(tag)
  ).slice(0, 5) || []

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !value.includes(trimmed) && value.length < maxTags) {
      onChange([...value, trimmed])
      setInput('')
      setShowSuggestions(false)
    }
  }

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions.length > 0) {
        addTag(suggestions[0])
      } else if (input.trim()) {
        addTag(input)
      }
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[42px]">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              disabled={disabled}
              className="hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setShowSuggestions(true)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={value.length < maxTags ? "Add tag..." : ""}
          disabled={disabled || value.length >= maxTags}
          className="border-0 shadow-none focus-visible:ring-0 flex-1 min-w-[100px] h-6 p-0"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <Command className="absolute z-50 w-full mt-1 border rounded-md shadow-md">
          <CommandList>
            {suggestions.map((suggestion) => (
              <CommandItem
                key={suggestion}
                onSelect={() => addTag(suggestion)}
                className="cursor-pointer"
              >
                {suggestion}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      )}

      <p className="text-xs text-muted-foreground mt-1">
        {value.length}/{maxTags} tags
      </p>
    </div>
  )
}
```

### Tag Filter Bar

```typescript
// apps/web/main-app/src/routes/inspiration/-components/TagFilterBar/index.tsx
import { Badge, Button } from '@repo/ui'
import { X } from 'lucide-react'
import { useGetTagsWithCountsQuery } from '@repo/api-client/rtk/inspiration-api'

interface TagFilterBarProps {
  activeTags: string[]
  onToggleTag: (tag: string) => void
  onClearTags: () => void
}

export function TagFilterBar({ activeTags, onToggleTag, onClearTags }: TagFilterBarProps) {
  const { data: tagsWithCounts } = useGetTagsWithCountsQuery()

  if (!tagsWithCounts || tagsWithCounts.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Filter by tags</span>
        {activeTags.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearTags}>
            Clear all
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {tagsWithCounts.map(({ tag, count }) => (
          <Badge
            key={tag}
            variant={activeTags.includes(tag) ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-accent"
            onClick={() => onToggleTag(tag)}
          >
            {tag}
            <span className="ml-1 text-xs opacity-70">{count}</span>
            {activeTags.includes(tag) && (
              <X className="w-3 h-3 ml-1" />
            )}
          </Badge>
        ))}
      </div>
    </div>
  )
}
```

### Onboarding Tooltip

```typescript
// apps/web/main-app/src/routes/inspiration/-components/OnboardingTooltip/index.tsx
import { useState, useEffect } from 'react'
import { Button, Card } from '@repo/ui'
import { X, Lightbulb } from 'lucide-react'

interface OnboardingTooltipProps {
  id: string
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function OnboardingTooltip({ id, title, description, position = 'bottom' }: OnboardingTooltipProps) {
  const [visible, setVisible] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const storageKey = `onboarding-dismissed-${id}`

  useEffect(() => {
    const isDismissed = localStorage.getItem(storageKey) === 'true'
    if (!isDismissed) {
      // Small delay to show after page loads
      const timer = setTimeout(() => setVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [storageKey])

  const handleDismiss = () => {
    setVisible(false)
    if (dontShowAgain) {
      localStorage.setItem(storageKey, 'true')
    }
  }

  if (!visible) return null

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  }

  return (
    <Card className={`absolute ${positionClasses[position]} z-50 p-4 max-w-xs shadow-lg animate-in fade-in slide-in-from-bottom-2`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-sm mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>

          <div className="mt-3 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded"
              />
              Don't show again
            </label>
            <Button size="sm" onClick={handleDismiss}>
              Got it
            </Button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </Card>
  )
}

// Specific tooltip for stack gesture
export function StackGestureTooltip() {
  return (
    <OnboardingTooltip
      id="stack-gesture"
      title="Tip: Create albums quickly"
      description="Drag images onto each other to create albums instantly."
      position="bottom"
    />
  )
}
```

### Tags API Endpoint

```typescript
// apps/api/endpoints/inspirations/tags/handler.ts
export async function handler(event: APIGatewayEvent) {
  const userId = event.requestContext.authorizer?.userId

  // Get all unique tags with counts
  const tags = await db
    .select({
      tag: sql<string>`unnest(tags)`,
    })
    .from(inspirations)
    .where(eq(inspirations.userId, userId))

  // Count occurrences
  const tagCounts = tags.reduce((acc, { tag }) => {
    acc[tag] = (acc[tag] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const result = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)

  return {
    statusCode: 200,
    body: JSON.stringify(result),
  }
}
```

## Testing

### Tag Autocomplete Tests

- [ ] Shows suggestions from existing tags
- [ ] Filters suggestions as user types
- [ ] Can select suggestion
- [ ] Can create new tag
- [ ] Enforces max 10 limit
- [ ] Backspace removes last tag

### Tag Filtering Tests

- [ ] Shows available tags with counts
- [ ] Click toggles tag filter
- [ ] Multiple tags filter correctly
- [ ] Clear removes all filters

### Onboarding Tests

- [ ] Tooltip shows on first visit
- [ ] "Got it" dismisses tooltip
- [ ] "Don't show again" persists
- [ ] Doesn't show if already dismissed

## Definition of Done

- [ ] Tag autocomplete working
- [ ] Tag filtering in gallery
- [ ] Onboarding tooltip for stack gesture
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1048, insp-1049         | Claude   |
