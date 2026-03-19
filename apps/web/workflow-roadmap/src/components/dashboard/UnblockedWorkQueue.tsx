import { Link } from '@tanstack/react-router'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  PriorityTag,
} from '@repo/app-component-library'
import type { DashboardResponse } from '../../store/roadmapApi'

type QueueItem = DashboardResponse['unblockedQueue'][number]

const col = createColumnHelper<QueueItem>()

const columns = [
  col.accessor('storyId', {
    header: 'Story',
    size: 130,
    cell: info => (
      <Link
        to="/story/$storyId"
        params={{ storyId: info.getValue() }}
        className="font-mono text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  col.accessor('title', {
    header: 'Title',
    size: 300,
    cell: info => (
      <span className="text-sm text-slate-300 truncate block max-w-[300px]" title={info.getValue()}>
        {info.getValue()}
      </span>
    ),
  }),
  col.accessor('plans', {
    header: 'Plan(s)',
    size: 160,
    cell: info => {
      const plans = info.getValue()
      if (plans.length === 0) return <span className="text-xs text-slate-500">--</span>
      return (
        <div className="flex flex-wrap gap-1">
          {plans.slice(0, 2).map(p => (
            <Link
              key={p.planSlug}
              to="/plan/$slug"
              params={{ slug: p.planSlug }}
              className="text-xs text-slate-400 hover:text-cyan-400 truncate max-w-[140px]"
              title={p.title}
            >
              {p.planSlug}
            </Link>
          ))}
          {plans.length > 2 && <span className="text-xs text-slate-500">+{plans.length - 2}</span>}
        </div>
      )
    },
  }),
  col.accessor('priority', {
    header: 'Pri',
    size: 60,
    cell: info => {
      const v = info.getValue()
      return v ? <PriorityTag priority={v} /> : null
    },
  }),
  col.accessor('fanOut', {
    header: 'Fan-out',
    size: 70,
    cell: info => {
      const v = info.getValue()
      return (
        <span className={`text-xs font-mono ${v > 5 ? 'text-amber-400' : 'text-slate-400'}`}>
          {v}
        </span>
      )
    },
  }),
  col.accessor('daysInState', {
    header: 'Age',
    size: 60,
    cell: info => {
      const d = info.getValue()
      let label: string
      if (d === 0) label = 'today'
      else if (d < 7) label = `${d}d`
      else if (d < 30) label = `${Math.floor(d / 7)}w`
      else label = `${Math.floor(d / 30)}mo`
      return (
        <span className={`text-xs font-mono ${d > 14 ? 'text-red-400' : 'text-slate-400'}`}>
          {label}
        </span>
      )
    },
  }),
]

export function UnblockedWorkQueue({ queue }: { queue: DashboardResponse['unblockedQueue'] }) {
  const table = useReactTable({
    data: queue,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Unblocked Work Queue
      </h2>
      <div className="rounded-lg border border-slate-700/50 overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="border-slate-700/50">
                {hg.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="text-xs text-slate-400 font-medium bg-slate-800/50"
                    style={{ width: header.getSize() }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-slate-500 py-8">
                  No unblocked stories
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className="border-slate-700/30 hover:bg-slate-800/30">
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
