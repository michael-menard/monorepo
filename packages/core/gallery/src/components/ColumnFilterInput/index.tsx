import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/app-component-library'
import type { ColumnFilter, ColumnType, FilterOperator } from '../../__types__/columnFilter'

export interface ColumnFilterInputProps<TItem extends Record<string, unknown>> {
  field: keyof TItem
  label: string
  type: ColumnType
  currentFilter?: ColumnFilter<TItem>
  onChange: (filter: ColumnFilter<TItem> | null) => void
  operators: FilterOperator[]
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: 'Equals',
  contains: 'Contains',
  gt: 'Greater than',
  lt: 'Less than',
  gte: 'Greater than or equal',
  lte: 'Less than or equal',
  in: 'In',
}

export function ColumnFilterInput<TItem extends Record<string, unknown>>({
  field,
  label,
  type,
  currentFilter,
  onChange,
  operators,
}: ColumnFilterInputProps<TItem>) {
  const [open, setOpen] = useState(false)
  const [operator, setOperator] = useState<FilterOperator>(currentFilter?.operator ?? operators[0])
  const [value, setValue] = useState<string>(
    currentFilter?.value != null ? String(currentFilter.value) : '',
  )

  const isActive = !!currentFilter

  const handleApply = () => {
    if (!value.trim()) {
      onChange(null)
      setOpen(false)
      return
    }

    let parsedValue: unknown = value

    if (type === 'number') {
      parsedValue = Number(value)
    } else if (type === 'date') {
      parsedValue = value
    } else if (type === 'enum' && operator === 'in') {
      parsedValue = value
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)
    }

    onChange({
      field,
      operator,
      value: parsedValue,
    } as ColumnFilter<TItem>)
    setOpen(false)
  }

  const handleClear = () => {
    setValue('')
    onChange(null)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label={`Filter ${label}`}
        >
          <Filter className={isActive ? 'h-4 w-4 text-primary' : 'h-4 w-4 text-muted-foreground'} />
          {isActive ? (
            <span className="absolute -top-1 -right-1 inline-flex h-2 w-2 rounded-full bg-primary" />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Filter {label}</h3>
            {isActive ? (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Operator</p>
            <Select value={operator} onValueChange={val => setOperator(val as FilterOperator)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operators.map(op => (
                  <SelectItem key={op} value={op}>
                    {OPERATOR_LABELS[op]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Value</p>
            <Input
              type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}...`}
            />
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleApply}>
              Apply
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
