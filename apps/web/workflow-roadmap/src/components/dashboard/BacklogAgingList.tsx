import type { DashboardResponse } from '../../store/roadmapApi'

type BacklogAging = DashboardResponse['backlogAging']

const BUCKET_COLOR: Record<string, string> = {
  '<7d': 'bg-slate-400',
  '7-14d': 'bg-amber-400',
  '14-30d': 'bg-amber-500',
  '30+d': 'bg-red-400',
}

const BUCKET_TEXT_COLOR: Record<string, string> = {
  '<7d': 'text-slate-400',
  '7-14d': 'text-amber-400',
  '14-30d': 'text-amber-500',
  '30+d': 'text-red-400',
}

export function BacklogAgingList({ backlogAging }: { backlogAging: BacklogAging }) {
  const totalCount = backlogAging.reduce((sum, b) => sum + b.count, 0)
  if (totalCount === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Backlog Aging
      </h2>

      <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 space-y-3">
        {backlogAging.map(({ bucket, count }) => {
          const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
          const barColor = BUCKET_COLOR[bucket] ?? 'bg-slate-400'
          const textColor = BUCKET_TEXT_COLOR[bucket] ?? 'text-slate-400'
          return (
            <div key={bucket} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono ${textColor}`}>{bucket}</span>
                <span className="text-xs font-mono text-slate-400">
                  {count} ({pct}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
