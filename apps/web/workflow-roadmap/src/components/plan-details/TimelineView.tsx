import { Link } from 'react-router-dom'
import { PIPELINE_STAGES, getPriorityColor } from '@repo/app-component-library'
import type { PlanStory } from '../../store/roadmapApi'

// TimelineView uses dotColor on stages — map from the shared PIPELINE_STAGES
const TIMELINE_STAGES = PIPELINE_STAGES.map(s => ({
  ...s,
  dotColor: s.color,
}))

export function TimelineView({ stories }: { stories: PlanStory[] }) {
  const getStageIndex = (state?: string | null): number => {
    const idx = TIMELINE_STAGES.findIndex(s => s.states.includes(state ?? ''))
    return idx === -1 ? 0 : idx
  }

  const totalStages = TIMELINE_STAGES.length - 1

  // Group stories by their current pipeline stage, preserving stage order
  const groups = TIMELINE_STAGES.map(stage => ({
    ...stage,
    stories: stories.filter(s => stage.states.includes(s.state ?? '')),
  })).filter(g => g.stories.length > 0)

  if (stories.length === 0) {
    return <p className="text-slate-500">No stories match the current filters.</p>
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-slate-400 font-medium">No pipeline activity</p>
        <p className="text-slate-600 text-sm mt-1">Stories may be in backlog or completed.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Stage axis */}
      <div className="flex mb-6">
        <div className="w-52 shrink-0" />
        <div className="flex-1 relative h-8">
          {/* Baseline */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-slate-700/40" />
          {TIMELINE_STAGES.map((stage, idx) => {
            const pct = (idx / totalStages) * 100
            return (
              <div
                key={stage.id}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
              >
                <span className="text-xs text-slate-500 font-mono whitespace-nowrap mb-1.5">
                  {stage.label}
                </span>
                <div className={`h-2 w-px ${stage.dotColor} opacity-60`} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Phase groups */}
      <div className="space-y-5">
        {groups.map(group => (
          <div key={group.id}>
            {/* Group header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-52 shrink-0 flex items-center gap-1.5 pl-1">
                <div className={`h-1.5 w-1.5 rounded-full ${group.dotColor}`} />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {group.label}
                </span>
                <span className="text-xs text-slate-600 font-mono">({group.stories.length})</span>
              </div>
              <div className="flex-1 border-t border-slate-800" />
            </div>

            {/* Story rows */}
            <div className="space-y-1.5">
              {group.stories.map(story => {
                const stageIdx = getStageIndex(story.state)
                const pct = (stageIdx / totalStages) * 100
                const barColor = getPriorityColor(story.priority, 'bar')

                return (
                  <div key={story.storyId} className="flex items-center gap-0">
                    {/* Name */}
                    <Link
                      to={`/story/${story.storyId}`}
                      className="w-52 shrink-0 flex flex-col px-2 py-1 hover:bg-slate-800/50 rounded transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        {story.priority ? (
                          <span
                            className={`text-xs font-mono font-bold ${getPriorityColor(story.priority, 'text')}`}
                          >
                            {story.priority}
                          </span>
                        ) : null}
                        <span className="font-mono text-xs text-cyan-400/80">{story.storyId}</span>
                        {story.isExternal ? (
                          <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-slate-700/60 text-slate-400 border border-slate-600/40">
                            EXT
                          </span>
                        ) : null}
                        {story.isBlocked || story.hasBlockers ? (
                          <span title="Has blockers" className="text-xs leading-none">
                            ⚠️
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-slate-500 truncate leading-tight">
                        {story.title ?? '—'}
                      </span>
                    </Link>

                    {/* Bar track */}
                    <div className="flex-1 relative h-6">
                      {/* Track */}
                      <div className="absolute inset-0 flex items-center">
                        <div className="h-px w-full bg-slate-800" />
                      </div>
                      {/* Stage tick marks */}
                      {TIMELINE_STAGES.map((stage, idx) => (
                        <div
                          key={stage.id}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2 w-px bg-slate-700/60"
                          style={{ left: `${(idx / totalStages) * 100}%` }}
                        />
                      ))}
                      {/* Progress bar */}
                      {pct > 0 && (
                        <div
                          className={`absolute top-1/2 left-0 -translate-y-1/2 h-2 rounded-full ${barColor} opacity-60`}
                          style={{ width: `${pct}%` }}
                        />
                      )}
                      {/* Current position dot */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full ${barColor} ring-2 ring-slate-900 shadow-lg`}
                        style={{ left: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
