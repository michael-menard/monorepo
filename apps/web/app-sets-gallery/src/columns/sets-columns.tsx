/**
 * Column definitions for the Sets Gallery datatable view
 */
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@repo/app-component-library'
import type { Set } from '@repo/api-client/schemas/sets'

const columnHelper = createColumnHelper<Set>()

/**
 * Build status variant mapping for Badge component
 */
const buildStatusVariantMap: Record<string, 'default' | 'secondary' | 'outline'> = {
  completed: 'default',
  parted_out: 'default',
  in_progress: 'secondary',
  not_started: 'outline',
}

/**
 * Format build status for display
 */
const formatBuildStatus = (status?: string | null) => {
  switch (status) {
    case 'completed':
      return 'Built'
    case 'in_progress':
      return 'In Progress'
    case 'parted_out':
      return 'Parted Out'
    default:
      return 'Not Started'
  }
}

/**
 * Column definitions for the Sets datatable
 */
export const setsColumns: ColumnDef<Set, any>[] = [
  columnHelper.accessor('setNumber', {
    header: 'Set #',
    size: 150,
    cell: info => <span className="font-mono text-sm text-foreground">{info.getValue()}</span>,
    enableSorting: true,
  }) as ColumnDef<Set, any>,

  columnHelper.accessor('title', {
    header: 'Name',
    size: 400,
    cell: info => <div className="font-medium text-sm">{info.getValue()}</div>,
    enableSorting: true,
  }) as ColumnDef<Set, any>,

  columnHelper.accessor('pieceCount', {
    header: 'Pieces',
    size: 150,
    cell: info => {
      const count = info.getValue()
      return count ? (
        <span className="text-sm tabular-nums">{count.toLocaleString()}</span>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      )
    },
    enableSorting: true,
  }) as ColumnDef<Set, any>,

  columnHelper.accessor('buildStatus', {
    header: 'Build Status',
    size: 200,
    cell: info => {
      const status = info.getValue()
      const variant = buildStatusVariantMap[status ?? 'not_started'] || 'outline'
      return <Badge variant={variant}>{formatBuildStatus(status)}</Badge>
    },
    enableSorting: true,
  }) as ColumnDef<Set, any>,
]
