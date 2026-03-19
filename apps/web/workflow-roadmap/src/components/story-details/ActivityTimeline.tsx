import { Activity } from 'lucide-react'
import { DetailCard } from '../shared/DetailCard'
import { relativeTime } from '../../utils/formatters'
import type { StoryDetails } from '../../store/roadmapApi'

export function ActivityTimeline({ stateHistory }: { stateHistory: StoryDetails['stateHistory'] }) {
  if (stateHistory.length === 0) return null

  return (
    <DetailCard>
      <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
        <Activity className="h-4 w-4 text-slate-400" />
        Activity
        <span className="text-xs text-slate-600 font-normal font-mono ml-1">
          last {stateHistory.length}
        </span>
      </h2>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-800" />
        <div className="space-y-3">
          {stateHistory.map((entry, i) => {
            const isTransition =
              entry.eventType === 'state_transition' || (entry.fromState && entry.toState)
            const dotColor =
              entry.toState === 'completed'
                ? 'bg-emerald-500'
                : entry.toState === 'blocked'
                  ? 'bg-red-500'
                  : entry.toState === 'in_progress'
                    ? 'bg-blue-400'
                    : entry.toState === 'in_qa'
                      ? 'bg-amber-400'
                      : 'bg-slate-600'
            return (
              <div key={i} className="flex items-start gap-3 pl-1">
                <div
                  className={`h-3.5 w-3.5 rounded-full shrink-0 mt-0.5 border-2 border-slate-900 ${dotColor}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isTransition && entry.fromState && entry.toState ? (
                      <span className="text-xs text-slate-300">
                        <span className="text-slate-500">{entry.fromState.replace(/_/g, ' ')}</span>
                        {' → '}
                        <span className="font-medium">{entry.toState.replace(/_/g, ' ')}</span>
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-slate-400">
                        {entry.eventType.replace(/_/g, ' ')}
                      </span>
                    )}
                    <span className="text-xs text-slate-600 ml-auto shrink-0">
                      {relativeTime(entry.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </DetailCard>
  )
}
