import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'

/**
 * Creates a column helper for a specific data type
 *
 * @example
 * const columnHelper = createGalleryColumns<MyDataType>()
 * const columns = [
 *   columnHelper.accessor('name', { header: 'Name', size: 300 }),
 *   columnHelper.accessor('price', { header: 'Price', size: 150 }),
 * ]
 */
export function createGalleryColumns<TItem>() {
  return createColumnHelper<TItem>()
}

/**
 * Creates a text column with default formatting
 */
export function createTextColumn<TItem>(
  accessor: keyof TItem & string,
  header: string,
  size = 300,
): ColumnDef<TItem> {
  const helper = createColumnHelper<TItem>()
  return helper.accessor(accessor as any, {
    header,
    size,
    cell: info => {
      const value = info.getValue()
      return value != null ? String(value) : '-'
    },
  })
}

/**
 * Creates a number column with optional formatting
 */
export function createNumberColumn<TItem>(
  accessor: keyof TItem & string,
  header: string,
  formatter?: (value: number) => string,
): ColumnDef<TItem> {
  const helper = createColumnHelper<TItem>()
  return helper.accessor(accessor as any, {
    header,
    size: 150,
    cell: info => {
      const value = info.getValue() as number | null | undefined
      if (value == null) return '-'
      return formatter ? formatter(value) : value.toLocaleString()
    },
  })
}

/**
 * Creates a date column with customizable format
 * @param dateOptions - Intl.DateTimeFormatOptions for formatting (default: { year: 'numeric', month: 'short', day: 'numeric' })
 */
export function createDateColumn<TItem>(
  accessor: keyof TItem & string,
  header: string,
  dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
): ColumnDef<TItem> {
  const helper = createColumnHelper<TItem>()
  return helper.accessor(accessor as any, {
    header,
    size: 200,
    cell: info => {
      const value = info.getValue() as string | Date | null | undefined
      if (!value) return '-'
      try {
        const date = typeof value === 'string' ? new Date(value) : value
        return date.toLocaleDateString('en-US', dateOptions)
      } catch {
        return '-'
      }
    },
  })
}

/**
 * Creates a price column with currency formatting
 */
export function createPriceColumn<TItem>(
  accessor: keyof TItem & string,
  header = 'Price',
  currencyAccessor?: keyof TItem & string,
): ColumnDef<TItem> {
  const helper = createColumnHelper<TItem>()
  return helper.accessor(accessor as any, {
    header,
    size: 150,
    cell: info => {
      const price = info.getValue() as number | null | undefined
      if (price == null) return '-'

      const currency = currencyAccessor
        ? (info.row.original[currencyAccessor] as string | undefined)
        : 'USD'

      try {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency || 'USD',
        }).format(price)
      } catch {
        // Fallback for invalid currency codes
        return `$${price.toFixed(2)}`
      }
    },
  })
}

/**
 * Creates a badge column for status/enum values
 */
export function createBadgeColumn<TItem>(
  accessor: keyof TItem & string,
  header: string,
  options?: {
    size?: number
    colorMap?: Record<string, string>
    formatter?: (value: string) => string
  },
): ColumnDef<TItem> {
  const helper = createColumnHelper<TItem>()
  return helper.accessor(accessor as any, {
    header,
    size: options?.size || 150,
    cell: info => {
      const value = info.getValue() as string | null | undefined
      if (!value) return '-'

      const displayValue = options?.formatter
        ? options.formatter(value)
        : value.replace(/[-_]/g, ' ')

      const className = options?.colorMap?.[value] || ''

      return (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${className}`}
        >
          {displayValue}
        </span>
      )
    },
  })
}

/**
 * Creates an image column with thumbnail display
 */
export function createImageColumn<TItem>(
  accessor: keyof TItem & string,
  header: string,
  options?: {
    size?: number
    altAccessor?: keyof TItem & string
    fallback?: string
  },
): ColumnDef<TItem> {
  const helper = createColumnHelper<TItem>()
  return helper.accessor(accessor as any, {
    header,
    size: options?.size || 100,
    cell: info => {
      const src = info.getValue() as string | null | undefined
      const alt = options?.altAccessor
        ? (info.row.original[options.altAccessor] as string | undefined)
        : header

      if (!src) {
        return options?.fallback ? (
          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
            {options.fallback}
          </div>
        ) : (
          '-'
        )
      }

      return (
        <img src={src} alt={alt || ''} className="h-10 w-10 rounded object-cover" loading="lazy" />
      )
    },
  })
}
