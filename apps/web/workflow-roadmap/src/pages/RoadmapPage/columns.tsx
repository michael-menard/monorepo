import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { Copy, Check } from 'lucide-react'
import { PriorityTag, GenericTag } from '@repo/app-component-library'
import type { Plan } from '../../store/roadmapApi'
import { StoryGauge } from './StoryGauge'
import { relativeTime } from './utils'

function PlanTitleCell({ plan, onTagClick }: { plan: Plan; onTagClick?: (tag: string) => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopySlug = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(plan.planSlug)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 group/title">
        <Link
          to="/plan/$slug"
          params={{ slug: plan.planSlug }}
          className="flex items-center gap-1.5 no-underline min-w-0"
          onClick={e => e.stopPropagation()}
        >
          <span className="text-base font-semibold text-slate-100/70 hover:text-cyan-400 transition-colors truncate">
            {plan.title}
          </span>
          {plan.churnDepth > 0 && (
            <span
              className="text-xs text-amber-400 font-mono shrink-0"
              aria-label={`Supersedes ${plan.churnDepth} prior plan${plan.churnDepth > 1 ? 's' : ''}${plan.supersedesPlanSlug ? ` (replaces ${plan.supersedesPlanSlug})` : ''}`}
            >
              {'\u21BA'}
              {plan.churnDepth}
            </span>
          )}
          {plan.hasRegression ? (
            <span
              className="text-xs text-orange-500 font-mono shrink-0"
              aria-label="Status has regressed"
            >
              {'\u26A0'}
            </span>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={handleCopySlug}
          className="opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0 p-0.5 text-slate-500 hover:text-cyan-400"
          title={`Copy slug: ${plan.planSlug}`}
          aria-label={`Copy plan slug ${plan.planSlug}`}
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      {plan.tags && plan.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1 mt-1 ml-3" aria-label="Tags">
          {plan.tags.map(tag => (
            <li key={tag}>
              <button
                type="button"
                className="cursor-pointer"
                onClick={e => {
                  e.stopPropagation()
                  onTagClick?.(tag)
                }}
                aria-label={`Filter by tag: ${tag}`}
              >
                <GenericTag label={tag} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

const col = createColumnHelper<Plan>()

export const createTableColumns = (onTagClick?: (tag: string) => void) => [
  col.display({
    id: 'drag',
    header: () => null,
    cell: () => null, // overridden in SortableRow
    meta: { width: 'w-10' },
  }),
  col.accessor('title', {
    header: 'Title',
    cell: info => <PlanTitleCell plan={info.row.original} onTagClick={onTagClick} />,
    enableSorting: true,
  }),
  col.accessor('priority', {
    header: 'Priority',
    cell: info => {
      const plan = info.row.original
      if (!plan.priority) return null
      return <PriorityTag priority={plan.priority} />
    },
    enableSorting: true,
    meta: { hideAt: 'md', width: 'w-20' },
  }),
  col.accessor('totalStories', {
    header: 'Stories',
    cell: info => <StoryGauge plan={info.row.original} />,
    enableSorting: true,
    meta: { hideAt: 'sm', width: 'w-[15%]' },
  }),
  col.display({
    id: 'spacer',
    header: () => null,
    cell: () => null,
    meta: { hideAt: 'lg', width: 'w-8' },
  }),
  col.accessor('lastStoryActivityAt', {
    header: 'Last Activity',
    cell: info => {
      const val = info.getValue()
      return (
        <time className="text-xs text-slate-400 font-mono" dateTime={val ?? undefined}>
          {relativeTime(val)}
        </time>
      )
    },
    enableSorting: true,
    meta: { hideAt: 'lg', width: 'w-24' },
  }),
]
