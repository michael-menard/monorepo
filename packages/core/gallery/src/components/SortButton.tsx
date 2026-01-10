import { ArrowUpDown } from 'lucide-react'
import { Button, Badge, Popover, PopoverContent, PopoverTrigger } from '@repo/app-component-library'
import { useSortContext } from '../contexts/SortContext'
import { SortPopover } from './SortPopover'

interface SortButtonProps<TItem extends Record<string, unknown>> {
  sortableFields: {
    field: keyof TItem
    label: string
    type?: 'text' | 'number' | 'date'
  }[]
}

export function SortButton<TItem extends Record<string, unknown>>({
  sortableFields,
}: SortButtonProps<TItem>) {
  const { sorts } = useSortContext<TItem>()

  const activeCount = sorts.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          aria-label={
            activeCount > 0 ? `Sort, ${activeCount} columns active` : 'Sort, no columns active'
          }
        >
          <ArrowUpDown className="h-4 w-4" />
          Sort
          {activeCount > 0 ? (
            <Badge
              variant="secondary"
              className="ml-1 px-1.5"
              aria-live="polite"
              aria-atomic="true"
            >
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <SortPopover sortableFields={sortableFields} />
      </PopoverContent>
    </Popover>
  )
}
