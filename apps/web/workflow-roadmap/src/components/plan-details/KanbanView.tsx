import { Link } from '@tanstack/react-router'
import { AppBadge, PriorityTag } from '@repo/app-component-library'
import type { PlanStory } from '../../store/roadmapApi'

const KANBAN_COLUMNS = [
  { id: 'ready_to_work', label: 'Ready to Work', states: ['ready_to_work'], color: 'bg-cyan-500' },
  { id: 'in_progress', label: 'In Progress', states: ['in_progress'], color: 'bg-blue-500' },
  {
    id: 'code_review',
    label: 'Code Review',
    states: ['needs_code_review', 'ready_for_review', 'failed_code_review'],
    color: 'bg-violet-500',
  },
  { id: 'qa', label: 'QA', states: ['ready_for_qa', 'in_qa'], color: 'bg-amber-500' },
  { id: 'uat', label: 'UAT', states: ['uat'], color: 'bg-emerald-500' },
]

export function KanbanView({ stories }: { stories: PlanStory[] }) {
  const totalOnBoard = KANBAN_COLUMNS.reduce(
    (sum, col) => sum + stories.filter(s => col.states.includes(s.state ?? '')).length,
    0,
  )

  if (totalOnBoard === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3">✓</div>
        <p className="text-slate-400 font-medium">All clear</p>
        <p className="text-slate-600 text-sm mt-1">
          No stories are currently active in the pipeline.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-5 gap-4">
      {KANBAN_COLUMNS.map(col => {
        const cards = stories.filter(s => col.states.includes(s.state ?? ''))
        return (
          <div key={col.id} className="flex flex-col gap-2 min-w-0">
            <div className="sticky top-4 z-10 bg-slate-900/95 backdrop-blur-sm rounded-lg py-1.5 px-1 -mx-1 mb-1">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${col.color} inline-block shrink-0`} />
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider truncate">
                  {col.label}
                </span>
                <span className="ml-auto text-xs font-mono text-slate-500 shrink-0">
                  {cards.length}
                </span>
              </div>
              <div className="mt-1.5 h-0.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${col.color} opacity-50 transition-all duration-500`}
                  style={{
                    width: `${totalOnBoard > 0 ? (cards.length / totalOnBoard) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 min-h-[4rem]">
              {cards.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-700/50 h-16 flex items-center justify-center">
                  <span className="text-xs text-slate-600 font-mono">empty</span>
                </div>
              ) : (
                cards.map(story => (
                  <Link
                    key={story.storyId}
                    to="/story/$storyId"
                    params={{ storyId: story.storyId }}
                    className={`block ${story.isExternal ? 'border-dashed' : ''} bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 hover:border-cyan-500/40 hover:bg-slate-800 transition-colors`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-cyan-400">{story.storyId}</span>
                        {story.isExternal && (
                          <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-slate-700/60 text-slate-400 border border-slate-600/40">
                            EXT
                          </span>
                        )}
                      </div>
                      {(story.isBlocked || story.hasBlockers) && (
                        <span title="Has blockers" className="text-xs">
                          ⚠️
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-200 leading-snug line-clamp-2 mb-2">
                      {story.title ?? '—'}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {story.priority && <PriorityTag priority={story.priority} />}
                      {story.state && story.state !== col.states[0] && (
                        <AppBadge variant="secondary">{story.state}</AppBadge>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
