import * as React from 'react'
import { cn } from '../_lib/utils'
import { getAriaAttributes, useUniqueId } from '../_lib/keyboard-navigation'

export interface TableProps extends React.ComponentProps<'table'> {
  caption?: string
  summary?: string
  role?: string
}

function Table({ className, caption, role = 'table', ...props }: TableProps) {
  const uniqueId = useUniqueId('table')
  const tableId = uniqueId
  const captionId = `${tableId}-caption`

  const ariaAttributes = getAriaAttributes({
    describedBy: caption ? captionId : undefined,
  })

  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
      role="region"
      aria-label={caption || 'Data table'}
      tabIndex={0}
    >
      <table
        data-slot="table"
        id={tableId}
        className={cn('w-full caption-bottom text-sm', className)}
        role={role}
        aria-describedby={caption ? captionId : undefined}
        {...ariaAttributes}
        {...props}
      >
        {caption ? (
          <caption id={captionId} className="sr-only">
            {caption}
          </caption>
        ) : null}
        {props.children}
      </table>
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
}

function TableRow({
  className,
  selected,
  ...props
}: React.ComponentProps<'tr'> & { selected?: boolean }) {
  const ariaAttributes = getAriaAttributes({
    selected,
  })

  return (
    <tr
      data-slot="table-row"
      className={cn(
        'hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors',
        selected && 'bg-muted',
        className,
      )}
      aria-selected={selected}
      {...ariaAttributes}
      {...props}
    />
  )
}

function TableHead({
  className,
  sort,
  ...props
}: React.ComponentProps<'th'> & { sort?: 'ascending' | 'descending' | 'none' | 'other' }) {
  const ariaAttributes = getAriaAttributes({
    sort,
  })

  return (
    <th
      data-slot="table-head"
      className={cn(
        'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      scope="col"
      aria-sort={sort}
      {...ariaAttributes}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('text-muted-foreground mt-4 text-sm', className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
