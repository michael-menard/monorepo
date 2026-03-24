import { Link } from '@tanstack/react-router'
import type { DashboardResponse } from '../../store/roadmapApi'

type PlanProgressItem = DashboardResponse['planProgress'][number]

const healthBorder: Record<string, string> = {
  green: 'border-l-emerald-500',
  yellow: 'border-l-amber-400',
  red: 'border-l-red-500',
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  )
}

function PlanCard({ plan }: { plan: PlanProgressItem }) {
  return (
    <Link
      to="/plan/$slug"
      params={{ slug: plan.planSlug }}
      className={`block rounded-lg border border-slate-700/50 border-l-4 ${healthBorder[plan.health]} bg-slate-800/30 p-4 hover:bg-slate-800/50 transition-colors`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-slate-200 truncate" title={plan.title}>
          {plan.title}
        </h3>
        {plan.priority ? (
          <span className="text-xs font-mono text-slate-500 shrink-0">{plan.priority}</span>
        ) : null}
      </div>

      <ProgressBar completed={plan.completedStories} total={plan.totalStories} />

      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
        <span>
          {plan.completedStories}/{plan.totalStories} done
        </span>
        {plan.activeStories > 0 && (
          <span className="text-cyan-400">{plan.activeStories} active</span>
        )}
        {plan.blockedStories > 0 && (
          <span className="text-red-400">{plan.blockedStories} blocked</span>
        )}
        {plan.daysSinceActivity !== null && (
          <span className={plan.daysSinceActivity > 7 ? 'text-amber-400' : ''}>
            {plan.daysSinceActivity === 0 ? 'active today' : `${plan.daysSinceActivity}d idle`}
          </span>
        )}
      </div>
    </Link>
  )
}

export function PlanProgressGrid({ plans }: { plans: DashboardResponse['planProgress'] }) {
  if (plans.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Plan Progress
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {plans.map(plan => (
          <PlanCard key={plan.planSlug} plan={plan} />
        ))}
      </div>
    </div>
  )
}
