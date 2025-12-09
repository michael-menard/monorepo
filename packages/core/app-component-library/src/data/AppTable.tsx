/**
 * AppTable Component
 * Application wrapper for Table component with consistent styling
 */

import * as React from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  type TableProps,
} from '../_primitives/table'
import { cn } from '../_lib/utils'

export type TableVariant = 'default' | 'striped' | 'bordered'

export interface AppTableProps extends TableProps {
  /** Visual variant of the table */
  variant?: TableVariant
}

const variantStyles: Record<TableVariant, string> = {
  default: '',
  striped: '[&_tbody_tr:nth-child(even)]:bg-muted/50',
  bordered: '[&_th]:border [&_td]:border',
}

export function AppTable({ variant = 'default', className, ...props }: AppTableProps) {
  return <Table className={cn(variantStyles[variant], className)} {...props} />
}

export function AppTableHeader({ className, ...props }: React.ComponentProps<typeof TableHeader>) {
  return <TableHeader className={className} {...props} />
}

export function AppTableBody({ className, ...props }: React.ComponentProps<typeof TableBody>) {
  return <TableBody className={className} {...props} />
}

export function AppTableFooter({ className, ...props }: React.ComponentProps<typeof TableFooter>) {
  return <TableFooter className={className} {...props} />
}

export function AppTableHead({ className, ...props }: React.ComponentProps<typeof TableHead>) {
  return <TableHead className={className} {...props} />
}

export function AppTableRow({ className, ...props }: React.ComponentProps<typeof TableRow>) {
  return <TableRow className={className} {...props} />
}

export function AppTableCell({ className, ...props }: React.ComponentProps<typeof TableCell>) {
  return <TableCell className={className} {...props} />
}

export function AppTableCaption({
  className,
  ...props
}: React.ComponentProps<typeof TableCaption>) {
  return <TableCaption className={className} {...props} />
}

// Re-export primitives for advanced usage
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
export type { TableProps }
