import { Link } from 'react-router-dom'
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
  ThrashIcon,
  StateTag,
  PriorityTag,
} from '@repo/app-component-library'
import type { ActiveAgent, PlanStory } from '../store/roadmapApi'
import { useGetActiveAgentsQuery } from '../store/roadmapApi'
import { getConfig } from '../config'
import { AgentActiveBadge } from './AgentActiveBadge'

const col = createColumnHelper<PlanStory>()

type FromPlanInfo = { slug: string; title: string }

function relativeTime(iso: string | null) {
  if (!iso) return <span className="text-xs text-slate-500 font-mono">&mdash;</span>
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  let label: string
  if (days === 0) label = 'today'
  else if (days === 1) label = '1d ago'
  else if (days < 7) label = `${days}d ago`
  else if (days < 30) label = `${Math.floor(days / 7)}w ago`
  else label = `${Math.floor(days / 30)}mo ago`
  return <span className="text-xs text-slate-400 font-mono">{label}</span>
}

function createColumns(activeAgentMap: Map<string, ActiveAgent>, fromPlan?: FromPlanInfo) {
  const linkState = fromPlan ? { fromPlan } : undefined
  return [
    col.accessor('storyId', {
      header: 'Story ID',
      size: 120,
      cell: info => (
        <Link
          to={`/story/${info.getValue()}`}
          state={linkState}
          className="font-mono text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
        >
          {info.getValue()}
        </Link>
      ),
    }),
    col.accessor('title', {
      header: 'Title',
      size: 300,
      cell: info => {
        const row = info.row.original
        return (
          <Link
            to={`/story/${row.storyId}`}
            state={linkState}
            className="block no-underline transition-colors group/title"
          >
            <div className="line-clamp-2 group-hover/title:text-cyan-400 group-hover/title:underline">
              {row.title ?? '-'}
            </div>
            {row.description ? (
              <div className="text-xs text-slate-500 mt-0.5 break-words line-clamp-2">
                {row.description}
              </div>
            ) : null}
          </Link>
        )
      },
    }),
    col.accessor('state', {
      header: 'State',
      size: 160,
      cell: info => {
        const row = info.row.original
        const activeAgent = activeAgentMap.get(row.storyId)
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <StateTag state={row.state ?? '-'} />
            {activeAgent ? (
              <AgentActiveBadge agentName={activeAgent.agentName} phase={activeAgent.phase} />
            ) : null}
            {row.isBlocked || row.hasBlockers ? (
              <span title="Has blockers" className="text-destructive">
                ⚠️
              </span>
            ) : null}
            {row.thrashCount >= getConfig().thrashThreshold ? (
              <span
                title={`Thrashing: ${row.thrashCount} status regression${row.thrashCount === 1 ? '' : 's'}`}
              >
                <ThrashIcon size={16} className="text-amber-500" />
              </span>
            ) : null}
          </div>
        )
      },
    }),
    col.accessor('blockedByStory', {
      header: 'Blocked By',
      size: 130,
      cell: info => {
        const val = info.getValue()
        return val ? (
          <Link
            to={`/story/${val}`}
            state={linkState}
            className="font-mono text-sm text-red-400 hover:text-red-300 hover:underline"
          >
            {val}
          </Link>
        ) : (
          <span className="text-slate-600">&mdash;</span>
        )
      },
    }),
    col.accessor('priority', {
      header: 'Priority',
      size: 90,
      cell: info => {
        const v = info.getValue()
        return v ? <PriorityTag priority={v} /> : <span className="text-slate-500">-</span>
      },
    }),
    col.accessor('updatedAt', {
      header: 'Last Activity',
      size: 110,
      cell: info => relativeTime(info.getValue()),
    }),
  ]
}

export function StoriesTable({
  data,
  planSlug,
  planTitle,
}: {
  data: PlanStory[]
  planSlug?: string
  planTitle?: string
}) {
  const { data: activeAgents } = useGetActiveAgentsQuery(undefined, { pollingInterval: 30_000 })
  const activeAgentMap = new Map((activeAgents ?? []).map(a => [a.storyId, a]))

  const columns = createColumns(
    activeAgentMap,
    planSlug ? { slug: planSlug, title: planTitle ?? planSlug } : undefined,
  )
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (data.length === 0) {
    return <p className="text-slate-500 py-8 text-center">No stories match the current filters.</p>
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <Table className="table-fixed">
        <colgroup>
          {table.getAllColumns().map(column => (
            <col
              key={column.id}
              style={
                column.id === 'title'
                  ? undefined // title gets remaining space via auto
                  : { width: column.getSize() }
              }
            />
          ))}
        </colgroup>
        <TableHeader>
          {table.getHeaderGroups().map(hg => (
            <TableRow key={hg.id}>
              {hg.headers.map(header => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
