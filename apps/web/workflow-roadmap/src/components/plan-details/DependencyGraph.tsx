import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, CheckCheck } from 'lucide-react'
import { getStoryStateColor, getPriorityColor } from '@repo/app-component-library'
import type { PlanStory } from '../../store/roadmapApi'

const STATE_BADGE: Record<string, string> = {
  backlog: 'bg-slate-700/40 border-slate-600/40 text-slate-300',
  created: 'bg-slate-600/30 border-slate-500/40 text-slate-300',
  elab: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
  ready: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300',
  ready_to_work: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300',
  in_progress: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
  needs_code_review: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300',
  ready_for_review: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300',
  in_review: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300',
  ready_for_qa: 'bg-amber-500/20 border-amber-500/30 text-amber-300',
  in_qa: 'bg-amber-500/20 border-amber-500/30 text-amber-300',
  uat: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
  completed: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
  cancelled: 'bg-red-500/20 border-red-500/30 text-red-300',
  blocked: 'bg-red-500/20 border-red-500/30 text-red-300',
  failed_qa: 'bg-red-500/20 border-red-500/30 text-red-300',
  failed_code_review: 'bg-red-500/20 border-red-500/30 text-red-300',
  deferred: 'bg-slate-600/30 border-slate-500/40 text-slate-300',
}
const DEFAULT_BADGE = 'bg-slate-700/40 border-slate-600/40 text-slate-300'

export function DependencyGraph({ stories }: { stories: PlanStory[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyStoryId = (e: React.MouseEvent, storyId: string) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(storyId)
    setCopiedId(storyId)
    setTimeout(() => setCopiedId(prev => (prev === storyId ? null : prev)), 1500)
  }
  // Stories that belong to this plan (not external) — used to detect cross-plan blockers
  const planStoryIds = new Set(stories.filter(s => !s.isExternal).map(s => s.storyId))

  // Group by wave (from API, fallback to 0)
  const waveGroups = new Map<number, PlanStory[]>()
  stories.forEach(s => {
    const w = s.wave ?? 0
    if (!waveGroups.has(w)) waveGroups.set(w, [])
    waveGroups.get(w)!.push(s)
  })
  // Sort stories within each wave: by priority then storyId
  waveGroups.forEach(group =>
    group.sort((a, b) => {
      const pa = a.priority ?? 'P9'
      const pb = b.priority ?? 'P9'
      if (pa !== pb) return pa.localeCompare(pb)
      return a.storyId.localeCompare(b.storyId)
    }),
  )
  const waves = [...waveGroups.keys()].sort((a, b) => a - b)

  const isComplete = (state?: string | null) =>
    state === 'completed' || state === 'uat' || state === 'cancelled'

  const stateColor = (s?: string | null) => getStoryStateColor(s, 'dot')
  const stateBorderColor = (s?: string | null) => {
    // Map dot color to border: bg-X -> border-X/30
    const dot = getStoryStateColor(s, 'dot')
    return dot.replace('bg-', 'border-').replace(/\/\d+$/, '') + '/30'
  }
  const priorityColor = (p?: string | null) => getPriorityColor(p, 'text')

  if (stories.length === 0) {
    return <p className="text-slate-500">No stories match the current filters.</p>
  }

  // Find first wave with incomplete work
  const firstActionableWave = waves.find(w => waveGroups.get(w)!.some(s => !isComplete(s.state)))

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500 px-1 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-500/80" />
          Actionable
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500/80" />
          In Progress
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
          Done
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-500/80" />
          Waiting
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500/80" />
          Cross-plan / External
        </span>
      </div>

      {waves.map(wave => {
        const group = waveGroups.get(wave)!
        const allDone = group.every(s => isComplete(s.state))
        const isActionable = wave === firstActionableWave

        return (
          <div
            key={wave}
            className={`rounded-lg border ${allDone ? 'border-slate-800/40 bg-black/10' : isActionable ? 'border-cyan-500/20 bg-cyan-950/10' : 'border-slate-800/60 bg-black/20'}`}
          >
            {/* Wave header */}
            <div
              className={`flex items-center gap-2 px-4 py-2 border-b ${allDone ? 'border-slate-800/30' : 'border-slate-800/50'}`}
            >
              <span
                className={`font-mono text-xs font-semibold ${isActionable ? 'text-cyan-400' : allDone ? 'text-emerald-500/60' : 'text-slate-500'}`}
              >
                Wave {wave}
              </span>
              {isActionable ? (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                  NEXT
                </span>
              ) : null}
              {allDone ? (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500/60">
                  DONE
                </span>
              ) : null}
              <span className="text-[10px] text-slate-600 ml-auto">
                {group.filter(s => isComplete(s.state)).length}/{group.length} complete
              </span>
            </div>

            {/* Story cards */}
            <div className="p-3 flex flex-wrap gap-2">
              {group.map(story => {
                const done = isComplete(story.state)
                const deps = story.dependencies ?? []

                // Only blocks/requires types count as blockers, exclude completed deps
                const blockingDeps = deps.filter(
                  d =>
                    (d.dependencyType === 'blocks' || d.dependencyType === 'requires') &&
                    !isComplete(d.dependsOnState),
                )
                const inPlanBlockers = blockingDeps.filter(d => planStoryIds.has(d.dependsOnId))
                // Cross-plan blockers only matter for plan-native stories
                const crossPlanBlockers = story.isExternal
                  ? []
                  : blockingDeps.filter(d => !planStoryIds.has(d.dependsOnId))
                const hasCrossPlan = crossPlanBlockers.length > 0

                // External stories get orange border; plan stories with cross-plan blockers too
                const cardBorder = story.isExternal
                  ? 'border-orange-500/40 ring-1 ring-orange-500/20'
                  : hasCrossPlan
                    ? 'border-orange-500/40 ring-1 ring-orange-500/20'
                    : stateBorderColor(story.state)

                return (
                  <Link
                    key={story.storyId}
                    to={`/story/${story.storyId}`}
                    className={`relative flex flex-col rounded-md ${story.isExternal ? 'border-dashed' : ''} border px-3 py-3 min-w-[200px] max-w-[280px] min-h-[120px] cursor-pointer transition-colors hover:bg-slate-800/40 no-underline ${done ? `opacity-50 ${cardBorder}` : cardBorder} bg-slate-900/60`}
                  >
                    {/* State indicator bar */}
                    <div
                      className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full ${stateColor(story.state)}`}
                    />

                    {/* Header: ID + Priority + EXT/CROSS-PLAN badges */}
                    <div className="flex items-center justify-between pl-2">
                      <div className="flex items-center gap-1.5">
                        <span className="group/sid flex items-center gap-1">
                          <span className="font-mono text-sm font-semibold text-cyan-400">
                            {story.storyId}
                          </span>
                          <button
                            type="button"
                            onClick={e => copyStoryId(e, story.storyId)}
                            className="opacity-0 group-hover/sid:opacity-100 transition-opacity text-cyan-500/50 hover:text-cyan-400 cursor-pointer"
                            aria-label={`Copy ${story.storyId} to clipboard`}
                          >
                            {copiedId === story.storyId ? (
                              <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </span>
                      </div>
                      {story.priority ? (
                        <span
                          className={`font-mono text-[10px] font-semibold ${priorityColor(story.priority)}`}
                        >
                          {story.priority}
                        </span>
                      ) : null}
                    </div>

                    {/* Title */}
                    <div className="pl-2 mt-1 text-[11px] text-slate-400 leading-snug line-clamp-4">
                      {story.title ?? '—'}
                    </div>

                    {/* State + blockers */}
                    <div className="mt-auto pt-2 flex items-end justify-between">
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold font-mono ${STATE_BADGE[story.state ?? 'backlog'] ?? DEFAULT_BADGE}`}
                      >
                        {(story.state ?? 'backlog').replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {inPlanBlockers.length > 0 && (
                          <span
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-[10px] font-semibold text-red-400 border border-red-500/30"
                            title={`Blocked by: ${inPlanBlockers.map(d => d.dependsOnId).join(', ')}`}
                          >
                            {inPlanBlockers.length}
                          </span>
                        )}
                        {crossPlanBlockers.length > 0 && (
                          <span
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/20 text-[10px] font-semibold text-orange-400 border border-orange-500/30"
                            title={`Cross-plan blockers: ${crossPlanBlockers.map(d => d.dependsOnId).join(', ')}`}
                          >
                            {crossPlanBlockers.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
