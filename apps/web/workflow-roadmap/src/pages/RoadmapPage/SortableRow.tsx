import { flexRender, type useReactTable } from '@tanstack/react-table'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { TableRow, TableCell } from '@repo/app-component-library'
import type { Plan } from '../../store/roadmapApi'
import { responsiveClass } from './utils'

export function SortableRow({
  row,
  onClick,
}: {
  row: ReturnType<ReturnType<typeof useReactTable<Plan>>['getRowModel']>['rows'][number]
  onClick: (plan: Plan) => void
}) {
  const plan = row.original
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: plan.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition || 'transform 150ms ease',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : ('auto' as const),
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      onClick={() => onClick(plan)}
      className={`cursor-pointer hover:bg-muted/50 ${isDragging ? 'bg-muted' : ''}`}
    >
      {row.getVisibleCells().map(cell => {
        const meta = cell.column.columnDef.meta as Record<string, unknown> | undefined
        if (cell.column.id === 'drag') {
          return (
            <TableCell key={cell.id} className="py-6">
              <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                onClick={e => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </TableCell>
          )
        }
        return (
          <TableCell key={cell.id} className={`py-3 ${responsiveClass(meta)}`}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        )
      })}
    </TableRow>
  )
}
