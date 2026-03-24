import { Tooltip, TooltipTrigger, TooltipContent } from '@repo/app-component-library'
import type { Plan } from '../../store/roadmapApi'

export function StoryGauge({ plan }: { plan: Plan }) {
  const total = plan.totalStories
  if (total === 0) return <span className="text-xs text-slate-500 font-mono">{'\u2014'}</span>

  const completedPct = Math.round((plan.completedStories / total) * 100)
  const activePct = Math.round((plan.activeStories / total) * 100)
  const blockedPct = Math.round((plan.blockedStories / total) * 100)
  const backlogPct = 100 - completedPct - activePct - blockedPct
  const backlogCount = total - plan.completedStories - plan.activeStories - plan.blockedStories

  const label = `${plan.completedStories} of ${total} stories complete`

  const bar = (
    <div
      role="progressbar"
      aria-valuenow={completedPct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="flex h-2 rounded-full overflow-hidden bg-slate-700 w-full min-w-[80px]"
    >
      {completedPct > 0 && <div className="bg-emerald-500" style={{ width: `${completedPct}%` }} />}
      {activePct > 0 && <div className="bg-blue-400" style={{ width: `${activePct}%` }} />}
      {blockedPct > 0 && <div className="bg-red-500" style={{ width: `${blockedPct}%` }} />}
      {backlogPct > 0 && <div className="bg-slate-600" style={{ width: `${backlogPct}%` }} />}
    </div>
  )

  return (
    <Tooltip>
      <TooltipTrigger className="w-full">{bar}</TooltipTrigger>
      <TooltipContent
        side="top"
        className="bg-slate-800 border border-slate-600 text-slate-100 p-3 max-w-xs font-mono text-xs space-y-2"
      >
        <div className="flex gap-3 flex-wrap">
          <span className="text-emerald-400">{plan.completedStories} done</span>
          {plan.activeStories > 0 && (
            <span className="text-blue-400">{plan.activeStories} active</span>
          )}
          {plan.blockedStories > 0 && (
            <span className="text-red-400">{plan.blockedStories} blocked</span>
          )}
          {backlogCount > 0 && <span className="text-slate-400">{backlogCount} backlog</span>}
          <span className="text-slate-500">/ {total}</span>
        </div>

        {plan.nextStory ? (
          <div>
            <div className="text-slate-500 uppercase text-[10px] tracking-wider mb-0.5">
              Next up
            </div>
            <div className="text-cyan-400">{plan.nextStory.storyId}</div>
            <div className="text-slate-300 truncate">{plan.nextStory.title}</div>
          </div>
        ) : null}

        {plan.blockedStoryList?.length > 0 && (
          <div>
            <div className="text-slate-500 uppercase text-[10px] tracking-wider mb-0.5">
              Blocked
            </div>
            {plan.blockedStoryList.map(s => (
              <div key={s.storyId} className="flex gap-1.5">
                <span className="text-red-400">{s.storyId}</span>
                <span className="text-slate-300 truncate">{s.title}</span>
              </div>
            ))}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
