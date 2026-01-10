/**
 * Column definitions for the Sets Gallery datatable view
 */
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@repo/app-component-library'
import type { BrickSet } from '../api/mock-sets-api'

const columnHelper = createColumnHelper<BrickSet>()

/**
 * Build status variant mapping for Badge component
 */
const buildStatusVariantMap: Record<string, 'default' | 'secondary' | 'outline'> = {
  complete: 'default',
  'in-progress': 'secondary',
  planned: 'outline',
}

/**
 * Format build status for display
 */
const formatBuildStatus = (status?: string) => {
  if (!status) return 'Not Started'
  return status
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Column definitions for the Sets datatable
 */
export const setsColumns: ColumnDef<BrickSet, any>[] = [
  columnHelper.accessor('setNumber', {
    header: 'Set #',
    size: 150,
    cell: info => <span className="font-mono text-sm text-foreground">{info.getValue()}</span>,
    enableSorting: true,
  }) as ColumnDef<BrickSet, any>,

  columnHelper.accessor('name', {
    header: 'Name',
    size: 400,
    cell: info => <div className="font-medium text-sm">{info.getValue()}</div>,
    enableSorting: true,
  }) as ColumnDef<BrickSet, any>,

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
  }) as ColumnDef<BrickSet, any>,

  columnHelper.accessor('buildStatus', {
    header: 'Build Status',
    size: 200,
    cell: info => {
      const status = info.getValue()
      const variant = status ? buildStatusVariantMap[status] || 'outline' : 'outline'
      return <Badge variant={variant}>{formatBuildStatus(status)}</Badge>
    },
    enableSorting: true,
  }) as ColumnDef<BrickSet, any>,
]
