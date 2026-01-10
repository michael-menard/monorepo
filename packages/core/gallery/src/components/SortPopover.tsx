import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/app-component-library'
import { useSortContext } from '../contexts/SortContext'

interface SortPopoverProps<TItem extends Record<string, unknown>> {
  sortableFields: {
    field: keyof TItem
    label: string
  }[]
}

interface SortRowProps<TItem extends Record<string, unknown>> {
  index: number
  field: keyof TItem
  direction: 'asc' | 'desc'
  sortableFields: { field: keyof TItem; label: string }[]
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onUpdate: (index: number, updates: any) => void
  onRemove: (index: number) => void
}

function SortRow<TItem extends Record<string, unknown>>({
  index,
  field,
  direction,
  sortableFields,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onUpdate,
  onRemove,
}: SortRowProps<TItem>) {
  const priorityLabels = ['Primary', 'Secondary', 'Tertiary']

  return (
    <div className="flex flex-col gap-2 p-2 border rounded-lg bg-background">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground min-w-[4rem]">
          {priorityLabels[index]}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={!canMoveUp}
            onClick={() => onMoveUp(index)}
            aria-label="Move sort up"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!canMoveDown}
            onClick={() => onMoveDown(index)}
            aria-label="Move sort down"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={String(field)}
          onValueChange={val => onUpdate(index, { field: val })}
        >
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortableFields.map(f => (
              <SelectItem
                key={String(f.field)}
                value={String(f.field)}
                disabled={String(f.field) === String(field)}
              >
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onUpdate(index, { direction: direction === 'asc' ? 'desc' : 'asc' })
            }
            aria-pressed={direction === 'desc'}
            aria-label={direction === 'asc' ? 'Sort ascending' : 'Sort descending'}
          >
            {direction === 'asc' ? (
              <>
                <ArrowUp className="mr-1 h-4 w-4" />
                Asc
              </>
            ) : (
              <>
                <ArrowDown className="mr-1 h-4 w-4" />
                Desc
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
            aria-label="Remove sort"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SortPopover<TItem extends Record<string, unknown>>({
  sortableFields,
}: SortPopoverProps<TItem>) {
  const { sorts, addSort, updateSort, removeSort, reorderSorts, clearSorts } =
    useSortContext<TItem>()

  const canAddSort = sorts.length < 3

  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    reorderSorts(index, index - 1)
  }

  const handleMoveDown = (index: number) => {
    if (index >= sorts.length - 1) return
    reorderSorts(index, index + 1)
  }

  return (
    <div className="space-y-4" role="dialog" aria-labelledby="gallery-sort-title">
      <div className="flex items-center justify-between">
        <h3 id="gallery-sort-title" className="text-sm font-semibold">
          Sort by
        </h3>
        {sorts.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={clearSorts}>
            Clear all
          </Button>
        ) : null}
      </div>

      {sorts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sort applied</p>
      ) : (
        <div className="space-y-2">
          {sorts.map((sort, index) => (
            <SortRow
              key={index}
              index={index}
              field={sort.field}
              direction={sort.direction}
              sortableFields={sortableFields}
              canMoveUp={index > 0}
              canMoveDown={index < sorts.length - 1}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onUpdate={updateSort}
              onRemove={removeSort}
            />
          ))}
        </div>
      )}

      {canAddSort ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            addSort({ field: sortableFields[0]?.field as keyof TItem, direction: 'asc' })
          }
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add sort column
        </Button>
      ) : null}
    </div>
  )
}
