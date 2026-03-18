import { motion } from 'framer-motion'
import { useParams, Link } from '@tanstack/react-router'
import {
  AppBadge,
  AppInput,
  AppTabs,
  AppTabsList,
  AppTabsTrigger,
  AppTabsContent,
  CustomButton,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
  Label,
  Textarea,
} from '@repo/app-component-library'
import { ArrowLeft, Pencil, Check, X, LayoutGrid, List, Copy, GanttChart } from 'lucide-react'
import { useState, useEffect, useRef, startTransition, useMemo } from 'react'
import {
  useGetPlanBySlugQuery,
  useGetStoriesByPlanSlugQuery,
  useUpdatePlanMutation,
  type PlanStory,
} from '../store/roadmapApi'
import { useStorySSE } from '../hooks/useStorySSE'
import { StoriesTable } from '../components/StoriesTable'

interface StoryStats {
  total: number
  completed: number
  active: number
  backlog: number
}

function ActivityRings({ stats }: { stats: StoryStats }) {
  const { total, completed, active, backlog } = stats
  const completedPct = total > 0 ? completed / total : 0
  const activePct = total > 0 ? active / total : 0
  const backlogPct = total > 0 ? backlog / total : 0

  const sw = 8
  const gap = 4
  const r1 = 44
  const r2 = r1 - sw - gap
  const r3 = r2 - sw - gap
  const c1 = 2 * Math.PI * r1
  const c2 = 2 * Math.PI * r2
  const c3 = 2 * Math.PI * r3

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-[200px] aspect-square cursor-default">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMin meet"
            className="-rotate-90 drop-shadow-lg"
            aria-hidden="true"
          >
            {/* Track rings */}
            <circle cx="50" cy="50" r={r1} fill="none" stroke="#060f1e" strokeWidth={sw} />
            <circle cx="50" cy="50" r={r2} fill="none" stroke="#060f1e" strokeWidth={sw} />
            <circle cx="50" cy="50" r={r3} fill="none" stroke="#060f1e" strokeWidth={sw} />
            {/* Completed — emerald outer */}
            <motion.circle
              cx="50"
              cy="50"
              r={r1}
              fill="none"
              stroke="#10b981"
              strokeWidth={sw}
              strokeDasharray={c1}
              strokeLinecap="round"
              initial={{ strokeDashoffset: c1 }}
              animate={{ strokeDashoffset: c1 * (1 - completedPct) }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0 }}
            />
            {/* Active — blue middle */}
            <motion.circle
              cx="50"
              cy="50"
              r={r2}
              fill="none"
              stroke="#60a5fa"
              strokeWidth={sw}
              strokeDasharray={c2}
              strokeLinecap="round"
              initial={{ strokeDashoffset: c2 }}
              animate={{ strokeDashoffset: c2 * (1 - activePct) }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.15 }}
            />
            {/* Created/backlog — cyan inner */}
            <motion.circle
              cx="50"
              cy="50"
              r={r3}
              fill="none"
              stroke="#22d3ee"
              strokeWidth={sw}
              strokeDasharray={c3}
              strokeLinecap="round"
              initial={{ strokeDashoffset: c3 }}
              animate={{ strokeDashoffset: c3 * (1 - backlogPct) }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            />
          </svg>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        className="bg-slate-800 border border-slate-600 text-slate-100 p-3 font-mono text-xs space-y-2"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
          <span className="text-slate-400">Completed</span>
          <span className="text-emerald-400 ml-4">
            {completed}/{total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />
          <span className="text-slate-400">Active</span>
          <span className="text-blue-400 ml-4">
            {active}/{total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" />
          <span className="text-slate-400">Created</span>
          <span className="text-cyan-400 ml-4">
            {backlog}/{total}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

interface EditableFieldProps {
  label: string
  value: string | number | null | undefined
  isEditing: boolean
  onStartEdit: () => void
  onSave: (value: string | number) => void
  onCancel: () => void
  type?: 'text' | 'number'
  editable: boolean
  multiline?: boolean
  options?: string[]
}

function EditableField({
  label,
  value,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  type = 'text',
  editable,
  multiline = false,
  options,
}: EditableFieldProps) {
  const [editValue, setEditValue] = useState(String(value ?? ''))
  const [isDebouncing, setIsDebouncing] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isEditing) {
      setEditValue(String(value ?? ''))
      setIsDebouncing(false)
    }
  }, [isEditing, value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setEditValue(newValue)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    setIsDebouncing(true)
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        if (type === 'number') {
          onSave(parseInt(newValue, 10) || 0)
        } else {
          onSave(newValue)
        }
        setIsDebouncing(false)
      })
    }, 500)
  }

  const handleSave = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (type === 'number') {
      onSave(parseInt(editValue, 10) || 0)
    } else {
      onSave(editValue)
    }
    setIsDebouncing(false)
  }

  if (!editable) {
    return (
      <div>
        <dt className="text-sm font-medium text-slate-400">{label}</dt>
        <dd className="text-slate-200">{value ?? '-'}</dd>
      </div>
    )
  }

  if (isEditing) {
    if (options) {
      return (
        <div>
          <dt className="text-sm font-medium text-slate-400 mb-1">{label}</dt>
          <dd className="flex items-center gap-2">
            <Select
              value={editValue}
              defaultOpen
              onValueChange={selected => {
                setEditValue(selected)
                onSave(selected)
              }}
            >
              <SelectTrigger className="h-8 text-sm bg-slate-800/50 border-slate-600/50 text-slate-100 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {options.map(opt => (
                  <SelectItem
                    key={opt}
                    value={opt}
                    className="focus:bg-slate-700 focus:text-slate-100 text-slate-200"
                  >
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CustomButton
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="h-8 w-8 text-red-400 hover:text-red-300 shrink-0"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </CustomButton>
          </dd>
        </div>
      )
    }

    return (
      <div>
        <dt className="text-sm font-medium text-slate-400 mb-1">{label}</dt>
        <dd className="flex flex-col gap-2">
          {multiline ? (
            <Textarea
              value={editValue}
              onChange={handleChange}
              rows={4}
              className="text-sm bg-slate-800/50 border-slate-600/50 text-slate-100 resize-y"
            />
          ) : (
            <AppInput
              type={type}
              value={editValue}
              onChange={handleChange}
              className="h-8 text-sm bg-slate-800/50 border-slate-600/50 text-slate-100"
            />
          )}
          <div className="flex items-center gap-2">
            {isDebouncing && <span className="text-xs text-slate-400 font-mono">saving...</span>}
            <CustomButton
              variant="ghost"
              size="icon"
              onClick={handleSave}
              className="h-8 w-8 text-green-400 hover:text-green-300"
              title="Save"
            >
              <Check className="h-4 w-4" />
            </CustomButton>
            <CustomButton
              variant="ghost"
              size="icon"
              onClick={() => {
                if (debounceRef.current) {
                  clearTimeout(debounceRef.current)
                }
                setIsDebouncing(false)
                onCancel()
              }}
              className="h-8 w-8 text-red-400 hover:text-red-300"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </CustomButton>
          </div>
        </dd>
      </div>
    )
  }

  if (multiline) {
    return (
      <div className="group">
        <div className="flex items-center gap-2 mb-1">
          <dt className="text-sm font-medium text-slate-400">{label}</dt>
          <CustomButton
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditValue(String(value ?? ''))
              onStartEdit()
            }}
            className="opacity-0 group-hover:opacity-100 h-5 w-5 text-slate-500 hover:text-cyan-400"
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </CustomButton>
        </div>
        <dd className="text-slate-300 text-sm leading-relaxed">{value ?? '-'}</dd>
      </div>
    )
  }

  return (
    <div>
      <dt className="text-sm font-medium text-slate-400">{label}</dt>
      <dd className="flex items-center gap-2 group">
        <span className="text-slate-200">{value ?? '-'}</span>
        <CustomButton
          variant="ghost"
          size="icon"
          onClick={() => {
            setEditValue(String(value ?? ''))
            onStartEdit()
          }}
          className="opacity-0 group-hover:opacity-100 h-6 w-6 text-slate-500 hover:text-cyan-400"
          title="Edit"
        >
          <Pencil className="h-3 w-3" />
        </CustomButton>
      </dd>
    </div>
  )
}

const PIPELINE_STAGES = [
  { id: 'backlog', label: 'Backlog', states: ['backlog', 'created'], dotColor: 'bg-slate-400' },
  { id: 'ready', label: 'Ready', states: ['ready_to_work'], dotColor: 'bg-cyan-400' },
  { id: 'progress', label: 'In Progress', states: ['in_progress'], dotColor: 'bg-blue-400' },
  {
    id: 'review',
    label: 'Review',
    states: ['needs_code_review', 'ready_for_review', 'failed_code_review'],
    dotColor: 'bg-violet-400',
  },
  { id: 'qa', label: 'QA', states: ['ready_for_qa', 'in_qa'], dotColor: 'bg-amber-400' },
  { id: 'uat', label: 'UAT', states: ['uat'], dotColor: 'bg-emerald-400' },
  { id: 'done', label: 'Done', states: ['completed'], dotColor: 'bg-emerald-500' },
]

const PRIORITY_TEXT: Record<string, string> = {
  P0: 'text-red-400',
  P1: 'text-red-400/70',
  P2: 'text-orange-400/70',
  P3: 'text-amber-400/70',
  P4: 'text-teal-400/70',
}

const PRIORITY_BAR: Record<string, string> = {
  P0: 'bg-red-600',
  P1: 'bg-red-500',
  P2: 'bg-orange-500',
  P3: 'bg-amber-400',
  P4: 'bg-teal-500',
}

function TimelineView({ stories }: { stories: PlanStory[] }) {
  const getStageIndex = (state?: string | null): number => {
    const idx = PIPELINE_STAGES.findIndex(s => s.states.includes(state ?? ''))
    return idx === -1 ? 0 : idx
  }

  const totalStages = PIPELINE_STAGES.length - 1

  // Group stories by their current pipeline stage, preserving stage order
  const groups = PIPELINE_STAGES.map(stage => ({
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
          {PIPELINE_STAGES.map((stage, idx) => {
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
                const barColor = PRIORITY_BAR[story.priority ?? ''] ?? 'bg-blue-500'

                return (
                  <div key={story.storyId} className="flex items-center gap-0">
                    {/* Name */}
                    <Link
                      to="/story/$storyId"
                      params={{ storyId: story.storyId }}
                      className="w-52 shrink-0 flex flex-col px-2 py-1 hover:bg-slate-800/50 rounded transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        {story.priority && (
                          <span
                            className={`text-xs font-mono font-bold ${PRIORITY_TEXT[story.priority] ?? 'text-slate-400'}`}
                          >
                            {story.priority}
                          </span>
                        )}
                        <span className="font-mono text-xs text-cyan-400/80">{story.storyId}</span>
                        {(story.isBlocked || story.hasBlockers) && (
                          <span title="Has blockers" className="text-xs leading-none">
                            ⚠️
                          </span>
                        )}
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
                      {PIPELINE_STAGES.map((stage, idx) => (
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

function DependencyGraph({ stories }: { stories: PlanStory[] }) {
  const storyMap = new Map(stories.map(s => [s.storyId, s]))

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

  const stateColor = (state?: string | null) => {
    if (state === 'completed' || state === 'uat') return 'bg-emerald-500/80'
    if (state === 'in_progress') return 'bg-blue-500/80'
    if (state === 'in_qa' || state === 'ready_for_qa') return 'bg-amber-500/80'
    if (state === 'needs_code_review' || state === 'ready_for_review') return 'bg-violet-500/80'
    if (state === 'failed_code_review' || state === 'failed_qa') return 'bg-red-500/80'
    if (state === 'blocked') return 'bg-red-500/80'
    if (state === 'ready' || state === 'ready_to_work') return 'bg-cyan-500/80'
    return 'bg-slate-500/80'
  }

  const stateBorderColor = (state?: string | null) => {
    if (state === 'completed' || state === 'uat') return 'border-emerald-500/30'
    if (state === 'in_progress') return 'border-blue-500/30'
    if (state === 'in_qa' || state === 'ready_for_qa') return 'border-amber-500/30'
    if (state === 'needs_code_review' || state === 'ready_for_review') return 'border-violet-500/30'
    if (state === 'failed_code_review' || state === 'failed_qa') return 'border-red-500/30'
    if (state === 'blocked') return 'border-red-500/30'
    if (state === 'ready' || state === 'ready_to_work') return 'border-cyan-500/30'
    return 'border-slate-700/60'
  }

  const priorityColor = (p?: string | null) => {
    if (p === 'P0' || p === 'P1') return 'text-red-400'
    if (p === 'P2') return 'text-orange-400'
    if (p === 'P3') return 'text-yellow-400'
    return 'text-slate-500'
  }

  if (stories.length === 0) {
    return <p className="text-slate-500">No stories match the current filters.</p>
  }

  // Check if there are any dependencies at all
  const hasDeps =
    stories.some(s => (s.dependencies ?? []).length > 0 || s.blockedByStory) || waves.length > 1

  if (!hasDeps) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-3xl mb-3 text-slate-700">◈</div>
        <p className="text-slate-400 font-medium">No dependencies</p>
        <p className="text-slate-600 text-sm mt-1">None of the visible stories have blockers.</p>
      </div>
    )
  }

  // Find first wave with incomplete work
  const firstActionableWave = waves.find(w => waveGroups.get(w)!.some(s => !isComplete(s.state)))

  const trunc = (s: string | null | undefined, n: number) =>
    s ? (s.length > n ? s.slice(0, n) + '…' : s) : '—'

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500 px-1">
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
              {isActionable && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                  NEXT
                </span>
              )}
              {allDone && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500/60">
                  DONE
                </span>
              )}
              <span className="text-[10px] text-slate-600 ml-auto">
                {group.filter(s => isComplete(s.state)).length}/{group.length} complete
              </span>
            </div>

            {/* Story cards */}
            <div className="p-3 flex flex-wrap gap-2">
              {group.map(story => {
                const done = isComplete(story.state)
                const deps = story.dependencies ?? []
                const depsInPlan = deps.filter(d => storyMap.has(d))
                const unresolvedDeps = depsInPlan.filter(d => !isComplete(storyMap.get(d)?.state))

                return (
                  <Link
                    key={story.storyId}
                    to="/story/$storyId"
                    params={{ storyId: story.storyId }}
                    className={`relative rounded-md border px-3 py-2 min-w-[200px] max-w-[280px] cursor-pointer transition-colors hover:bg-slate-800/40 no-underline ${done ? `opacity-50 ${stateBorderColor(story.state)}` : stateBorderColor(story.state)} bg-slate-900/60`}
                  >
                    {/* State indicator bar */}
                    <div
                      className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full ${stateColor(story.state)}`}
                    />

                    {/* Header: ID + Priority */}
                    <div className="flex items-center justify-between pl-2">
                      <span className="font-mono text-[11px] font-medium text-cyan-400">
                        {story.storyId}
                      </span>
                      {story.priority && (
                        <span
                          className={`font-mono text-[10px] font-semibold ${priorityColor(story.priority)}`}
                        >
                          {story.priority}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <div className="pl-2 mt-0.5 text-[11px] text-slate-400 leading-tight">
                      {trunc(story.title, 40)}
                    </div>

                    {/* State + deps */}
                    <div className="pl-2 mt-1.5 flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-600">
                        {story.state ?? 'backlog'}
                      </span>
                      {unresolvedDeps.length > 0 && (
                        <span
                          className="text-[9px] text-red-400/60 truncate max-w-[140px]"
                          title={`Blocked by: ${unresolvedDeps.join(', ')}`}
                        >
                          blocked by {unresolvedDeps.join(', ')}
                        </span>
                      )}
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

function KanbanView({ stories }: { stories: PlanStory[] }) {
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
                    className="block bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 hover:border-cyan-500/40 hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs text-cyan-400">{story.storyId}</span>
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
                      {story.priority && (
                        <AppBadge
                          variant="outline"
                          className={
                            story.priority === 'P0'
                              ? '!bg-red-600/50 !border-red-500/40 !text-white/80'
                              : story.priority === 'P1'
                                ? '!bg-red-500/40 !border-red-500/30 !text-white/40'
                                : story.priority === 'P2'
                                  ? '!bg-orange-500/40 !border-orange-500/30 !text-white/40'
                                  : story.priority === 'P3'
                                    ? '!bg-amber-400/40 !border-amber-400/30 !text-white/40'
                                    : story.priority === 'P4'
                                      ? '!bg-teal-500/40 !border-teal-500/30 !text-white/40'
                                      : '!bg-blue-500/40 !border-blue-500/30 !text-white/40'
                          }
                        >
                          {story.priority}
                        </AppBadge>
                      )}
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

export function PlanDetailsPage() {
  const { slug } = useParams({ from: '/plan/$slug' })
  const { data, error, isLoading } = useGetPlanBySlugQuery(slug)
  const [updatePlan] = useUpdatePlanMutation()
  const { data: storiesData, isLoading: isLoadingStories } = useGetStoriesByPlanSlugQuery(slug, {
    pollingInterval: 30_000,
  })
  useStorySSE()

  const storyStats = useMemo((): StoryStats | null => {
    if (!storiesData || storiesData.length === 0) return null
    const total = storiesData.length
    const completed = storiesData.filter(s => s.state === 'completed').length
    const active = storiesData.filter(s => s.state === 'in_progress' || s.state === 'in_qa').length
    const backlog = total - completed - active
    return { total, completed, active, backlog }
  }, [storiesData])

  const lastWorkedAt = useMemo(() => {
    if (!storiesData || storiesData.length === 0) return null
    const max = Math.max(
      ...storiesData.map(s => (s.updatedAt ? new Date(s.updatedAt).getTime() : 0)),
    )
    if (max === 0) return null
    const ms = Date.now() - max
    const days = Math.floor(ms / 86400000)
    if (days === 0) return 'today'
    if (days === 1) return '1d ago'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
  }, [storiesData])

  const [storySearch, setStorySearch] = useState('')
  const [storyStateFilter, setStoryStateFilter] = useState('')
  const [storyPriorityFilter, setStoryPriorityFilter] = useState('')
  const [hideCompleted, setHideCompleted] = useState(true)

  const filteredStories = useMemo(() => {
    if (!storiesData) return []
    return storiesData.filter(s => {
      if (hideCompleted && s.state === 'completed') return false
      if (storyStateFilter && s.state !== storyStateFilter) return false
      if (storyPriorityFilter && s.priority !== storyPriorityFilter) return false
      if (storySearch) {
        const q = storySearch.toLowerCase()
        if (!s.storyId.toLowerCase().includes(q) && !(s.title ?? '').toLowerCase().includes(q))
          return false
      }
      return true
    })
  }, [storiesData, storySearch, storyStateFilter, storyPriorityFilter, hideCompleted])

  const [activeTab, setActiveTab] = useState<'table' | 'kanban' | 'timeline' | 'deps'>('table')
  const [slugCopied, setSlugCopied] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 't' || e.key === 'T') setActiveTab('table')
      if (e.key === 'k' || e.key === 'K') setActiveTab('kanban')
      if (e.key === 'g' || e.key === 'G') setActiveTab('timeline')
      if (e.key === 'd' || e.key === 'D') setActiveTab('deps')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleCopySlug = () => {
    if (!data) return
    navigator.clipboard.writeText(data.planSlug)
    setSlugCopied(true)
    setTimeout(() => setSlugCopied(false), 2000)
  }

  const [editingField, setEditingField] = useState<string | null>(null)
  const [titleValue, setTitleValue] = useState('')
  const [isTitleDebouncing, setIsTitleDebouncing] = useState(false)
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (data?.title) {
      setTitleValue(data.title)
    }
  }, [data?.title])

  const handleUpdate = async (field: string, value: string | number) => {
    try {
      await updatePlan({
        slug,
        input: { [field]: value },
      }).unwrap()
      setEditingField(null)
    } catch (err) {
      console.error('Failed to update plan:', err)
    }
  }

  const handleTitleChange = (newValue: string) => {
    setTitleValue(newValue)

    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current)
    }

    setIsTitleDebouncing(true)
    titleDebounceRef.current = setTimeout(() => {
      startTransition(() => {
        handleUpdate('title', newValue)
        setIsTitleDebouncing(false)
      })
    }, 500)
  }

  const errorMessage = error ? ('error' in error ? error.error : 'Failed to fetch plan') : null

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-32"></div>
          <div className="h-8 bg-slate-800 rounded w-1/3"></div>
          <div className="h-4 bg-slate-800 rounded w-1/4"></div>
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 space-y-3">
            <div className="h-4 bg-slate-800 rounded"></div>
            <div className="h-4 bg-slate-800 rounded"></div>
            <div className="h-4 bg-slate-800 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-slate-400 hover:text-cyan-400 mb-6 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Roadmap
        </Link>
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg font-mono text-sm">
          ERROR: {errorMessage}
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center text-sm text-slate-400 hover:text-cyan-400 mb-6 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Roadmap
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {editingField === 'title' ? (
            <div className="flex items-center gap-2 flex-1">
              <AppInput
                type="text"
                value={titleValue}
                onChange={e => handleTitleChange(e.target.value)}
                className="text-3xl font-bold h-auto py-1 bg-slate-800/50 border-slate-600/50 text-slate-100"
                autoFocus
                onBlur={() => {
                  if (titleDebounceRef.current) {
                    clearTimeout(titleDebounceRef.current)
                  }
                  setIsTitleDebouncing(false)
                  setEditingField(null)
                }}
              />
              {isTitleDebouncing && (
                <span className="text-xs text-slate-400 font-mono">saving...</span>
              )}
              <CustomButton
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (titleDebounceRef.current) {
                    clearTimeout(titleDebounceRef.current)
                  }
                  setIsTitleDebouncing(false)
                  setEditingField(null)
                }}
                className="h-8 w-8 text-green-400 hover:text-green-300"
                title="Done"
              >
                <Check className="h-4 w-4" />
              </CustomButton>
            </div>
          ) : (
            <h1 className="text-3xl font-bold tracking-wide bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex-1">
              {data.title}
            </h1>
          )}
          {editingField !== 'title' && (
            <CustomButton
              variant="ghost"
              size="icon"
              onClick={() => setEditingField('title')}
              className="h-6 w-6 text-slate-500 hover:text-cyan-400"
              title="Edit title"
            >
              <Pencil className="h-3 w-3" />
            </CustomButton>
          )}
        </div>
        <div className="flex items-center gap-2 group/slug">
          <p className="text-cyan-500/70 font-mono text-sm">{data.planSlug}</p>
          <CustomButton
            variant="ghost"
            size="icon"
            onClick={handleCopySlug}
            className="h-6 w-6 opacity-0 group-hover/slug:opacity-100 text-slate-500 hover:text-cyan-400 transition-all"
            title="Copy slug"
          >
            {slugCopied ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </CustomButton>
          {slugCopied && <span className="text-xs text-emerald-400 font-mono">copied!</span>}
        </div>
      </div>

      <div className="grid gap-6">
        <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 inline-block" />
            Overview
          </h2>
          <div className="grid grid-cols-[auto_1fr_auto] gap-x-12">
            {/* Column 1: Type, Story Prefix, Priority, Created, Last Worked */}
            <div className="flex flex-col gap-4">
              <EditableField
                label="Type"
                value={data.planType}
                isEditing={editingField === 'planType'}
                onStartEdit={() => setEditingField('planType')}
                onSave={value => handleUpdate('planType', value)}
                onCancel={() => setEditingField(null)}
                editable
              />
              <EditableField
                label="Story Prefix"
                value={data.storyPrefix}
                isEditing={editingField === 'storyPrefix'}
                onStartEdit={() => setEditingField('storyPrefix')}
                onSave={value => handleUpdate('storyPrefix', value)}
                onCancel={() => setEditingField(null)}
                editable
              />
              <EditableField
                label="Priority"
                value={data.priority}
                isEditing={editingField === 'priority'}
                onStartEdit={() => setEditingField('priority')}
                onSave={value => handleUpdate('priority', value)}
                onCancel={() => setEditingField(null)}
                editable
                options={['P1', 'P2', 'P3', 'P4', 'P5']}
              />
              <div>
                <dt className="text-sm font-medium text-slate-400">Created</dt>
                <dd className="text-slate-200">{new Date(data.createdAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-400">Last Worked</dt>
                <dd className="font-mono text-sm text-slate-400">{lastWorkedAt ?? '—'}</dd>
              </div>
            </div>

            {/* Column 2: Summary, Tags */}
            <div className="flex flex-col gap-4">
              <EditableField
                label="Summary"
                value={data.summary}
                isEditing={editingField === 'summary'}
                onStartEdit={() => setEditingField('summary')}
                onSave={value => handleUpdate('summary', value)}
                onCancel={() => setEditingField(null)}
                editable
                multiline
              />
              <div className="flex flex-wrap gap-2">
                <AppBadge variant="outline">{data.status}</AppBadge>
                {data.priority && (
                  <AppBadge variant={data.priority === 'P1' ? 'destructive' : 'secondary'}>
                    {data.priority}
                  </AppBadge>
                )}
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-400 mb-2">Tags</dt>
                <dd className="flex flex-wrap gap-2">
                  {data.tags && data.tags.length > 0 ? (
                    data.tags.map(tag => (
                      <AppBadge key={tag} variant="secondary">
                        {tag}
                      </AppBadge>
                    ))
                  ) : (
                    <span className="text-slate-500">-</span>
                  )}
                  <CustomButton
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingField('tags')}
                    className="h-6 w-6 text-slate-500 hover:text-cyan-400"
                    title="Edit tags"
                  >
                    <Pencil className="h-3 w-3" />
                  </CustomButton>
                </dd>
              </div>
            </div>

            {/* Column 3: Activity rings */}
            <div className="flex items-center justify-center pl-12">
              {storyStats ? (
                <ActivityRings stats={storyStats} />
              ) : (
                <span className="text-xs text-slate-500 font-mono self-center">No stories</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
          {/* On xl+ screens: tabbed Table / Kanban. Below xl: table only. */}
          <div className="hidden xl:block">
            <AppTabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-300 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                  Stories
                  {storiesData && storiesData.length > 0 && (
                    <span className="text-xs text-slate-500 font-mono font-normal">
                      ({filteredStories.length}/{storiesData.length})
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 font-mono hidden 2xl:block">
                    T · K · G · D
                  </span>
                  <AppTabsList variant="pills" className="bg-slate-800/60">
                    <AppTabsTrigger
                      value="table"
                      variant="pills"
                      className="flex items-center gap-1.5 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400"
                    >
                      <List className="h-3.5 w-3.5" />
                      Table
                    </AppTabsTrigger>
                    <AppTabsTrigger
                      value="kanban"
                      variant="pills"
                      className="flex items-center gap-1.5 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Kanban
                    </AppTabsTrigger>
                    <AppTabsTrigger
                      value="timeline"
                      variant="pills"
                      className="flex items-center gap-1.5 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400"
                    >
                      <GanttChart className="h-3.5 w-3.5" />
                      Timeline
                    </AppTabsTrigger>
                    <AppTabsTrigger
                      value="deps"
                      variant="pills"
                      className="flex items-center gap-1.5 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <circle cx="3" cy="8" r="2" />
                        <circle cx="13" cy="3" r="2" />
                        <circle cx="13" cy="13" r="2" />
                        <path d="M5 8h3l2-3.5M5 8l5 3.5" />
                      </svg>
                      Deps
                    </AppTabsTrigger>
                  </AppTabsList>
                </div>
              </div>
              {!isLoadingStories && storiesData && storiesData.length > 0 && (
                <div className="mb-4 flex flex-col gap-3">
                  <Input
                    placeholder="Search by ID or title..."
                    value={storySearch}
                    onChange={e => setStorySearch(e.target.value)}
                    className="bg-slate-800/50 border-slate-600/50 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/50"
                  />
                  <div className="flex items-center gap-3">
                    <Select
                      value={storyStateFilter || '_all'}
                      onValueChange={v => setStoryStateFilter(v === '_all' ? '' : v)}
                    >
                      <SelectTrigger
                        aria-label="Filter by state"
                        className="bg-slate-800/40 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
                      >
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
                        <SelectItem
                          value="_all"
                          className="focus:bg-slate-700 focus:text-slate-100"
                        >
                          All States
                        </SelectItem>
                        <SelectItem
                          value="backlog"
                          className="focus:bg-slate-700 focus:text-slate-100"
                        >
                          Backlog
                        </SelectItem>
                        <SelectItem
                          value="ready_to_work"
                          className="focus:bg-slate-700 focus:text-slate-100"
                        >
                          Ready to Work
                        </SelectItem>
                        <SelectItem
                          value="in_progress"
                          className="focus:bg-slate-700 focus:text-slate-100"
                        >
                          In Progress
                        </SelectItem>
                        <SelectItem
                          value="needs_code_review"
                          className="focus:bg-slate-700 focus:text-slate-100"
                        >
                          Needs Code Review
                        </SelectItem>
                        <SelectItem
                          value="ready_for_review"
                          className="focus:bg-slate-700 focus:text-slate-100"
                        >
                          Ready for Review
                        </SelectItem>
                        <SelectItem
                          value="failed_code_review"
                          className="focus:bg-slate-700 focus:text-slate-100"
                        >
                          Failed Code Review
                        </SelectItem>
                        <SelectItem
                          value="ready_for_qa"
                          className="focus:bg-slate-700 focus:text-slate-100"
                        >
                          Ready for QA
                        </SelectItem>
                        <SelectItem
                          value="in_qa"
                          className="focus:bg-slate-700 focus:text-slate-100"
                        >
                          In QA
                        </SelectItem>
                        <SelectItem value="uat" className="focus:bg-slate-700 focus:text-slate-100">
                          UAT
                        </SelectItem>
                        <SelectItem
                          value="completed"
                          className="focus:bg-slate-700 focus:text-slate-100"
                        >
                          Completed
                        </SelectItem>
                        <SelectItem
                          value="blocked"
                          className="focus:bg-slate-700 focus:text-slate-100"
                        >
                          Blocked
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={storyPriorityFilter || '_all'}
                      onValueChange={v => setStoryPriorityFilter(v === '_all' ? '' : v)}
                    >
                      <SelectTrigger
                        aria-label="Filter by priority"
                        className="bg-slate-800/40 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
                      >
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
                        <SelectItem
                          value="_all"
                          className="focus:bg-slate-700 focus:text-slate-100"
                        >
                          All Priorities
                        </SelectItem>
                        <SelectItem value="P0" className="focus:bg-slate-700 focus:text-slate-100">
                          P0
                        </SelectItem>
                        <SelectItem value="P1" className="focus:bg-slate-700 focus:text-slate-100">
                          P1
                        </SelectItem>
                        <SelectItem value="P2" className="focus:bg-slate-700 focus:text-slate-100">
                          P2
                        </SelectItem>
                        <SelectItem value="P3" className="focus:bg-slate-700 focus:text-slate-100">
                          P3
                        </SelectItem>
                        <SelectItem value="P4" className="focus:bg-slate-700 focus:text-slate-100">
                          P4
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 ml-auto">
                      <Checkbox
                        id="hide-completed"
                        checked={hideCompleted}
                        onCheckedChange={checked => setHideCompleted(checked === true)}
                      />
                      <Label
                        htmlFor="hide-completed"
                        className="text-sm text-slate-400 cursor-pointer select-none"
                      >
                        Hide completed
                      </Label>
                    </div>
                  </div>
                </div>
              )}
              <AppTabsContent value="table">
                {isLoadingStories ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-8 bg-slate-800 rounded"></div>
                    <div className="h-8 bg-slate-800 rounded"></div>
                    <div className="h-8 bg-slate-800 rounded"></div>
                  </div>
                ) : filteredStories.length > 0 ? (
                  <StoriesTable data={filteredStories} />
                ) : (
                  <p className="text-slate-500">
                    {storiesData && storiesData.length > 0
                      ? 'No stories match the current filters.'
                      : 'No stories linked to this plan yet.'}
                  </p>
                )}
              </AppTabsContent>
              <AppTabsContent value="kanban">
                {isLoadingStories ? (
                  <div className="animate-pulse grid grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 bg-slate-800 rounded w-24"></div>
                        <div className="h-24 bg-slate-800 rounded"></div>
                        <div className="h-24 bg-slate-800 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <KanbanView stories={filteredStories} />
                )}
              </AppTabsContent>
              <AppTabsContent value="timeline">
                {isLoadingStories ? (
                  <div className="animate-pulse space-y-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex gap-4 items-center">
                        <div className="h-8 bg-slate-800 rounded w-48 shrink-0"></div>
                        <div className="h-px bg-slate-800 flex-1"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <TimelineView stories={filteredStories} />
                )}
              </AppTabsContent>
              <AppTabsContent value="deps">
                {isLoadingStories ? (
                  <div className="animate-pulse space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex gap-8 items-center">
                        <div className="h-14 bg-slate-800 rounded-lg w-44"></div>
                        <div className="h-px bg-slate-800 w-16"></div>
                        <div className="h-14 bg-slate-800 rounded-lg w-44"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <DependencyGraph stories={filteredStories} />
                )}
              </AppTabsContent>
            </AppTabs>
          </div>

          {/* Below xl: table only, no tabs */}
          <div className="xl:hidden">
            <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
              Stories
              {storiesData && storiesData.length > 0 && (
                <span className="text-xs text-slate-500 font-mono font-normal">
                  ({filteredStories.length}/{storiesData.length})
                </span>
              )}
            </h2>
            {!isLoadingStories && storiesData && storiesData.length > 0 && (
              <div className="mb-4 flex flex-col gap-3">
                <Input
                  placeholder="Search by ID or title..."
                  value={storySearch}
                  onChange={e => setStorySearch(e.target.value)}
                  className="bg-slate-800/50 border-slate-600/50 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/50"
                />
                <div className="flex items-center gap-3">
                  <Select
                    value={storyStateFilter || '_all'}
                    onValueChange={v => setStoryStateFilter(v === '_all' ? '' : v)}
                  >
                    <SelectTrigger
                      aria-label="Filter by state"
                      className="bg-slate-800/40 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
                    >
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
                      <SelectItem value="_all" className="focus:bg-slate-700 focus:text-slate-100">
                        All States
                      </SelectItem>
                      <SelectItem
                        value="backlog"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        Backlog
                      </SelectItem>
                      <SelectItem
                        value="ready_to_work"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        Ready to Work
                      </SelectItem>
                      <SelectItem
                        value="in_progress"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        In Progress
                      </SelectItem>
                      <SelectItem
                        value="needs_code_review"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        Needs Code Review
                      </SelectItem>
                      <SelectItem
                        value="ready_for_review"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        Ready for Review
                      </SelectItem>
                      <SelectItem
                        value="failed_code_review"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        Failed Code Review
                      </SelectItem>
                      <SelectItem
                        value="ready_for_qa"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        Ready for QA
                      </SelectItem>
                      <SelectItem value="in_qa" className="focus:bg-slate-700 focus:text-slate-100">
                        In QA
                      </SelectItem>
                      <SelectItem value="uat" className="focus:bg-slate-700 focus:text-slate-100">
                        UAT
                      </SelectItem>
                      <SelectItem
                        value="completed"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        Completed
                      </SelectItem>
                      <SelectItem
                        value="blocked"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        Blocked
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={storyPriorityFilter || '_all'}
                    onValueChange={v => setStoryPriorityFilter(v === '_all' ? '' : v)}
                  >
                    <SelectTrigger
                      aria-label="Filter by priority"
                      className="bg-slate-800/40 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
                    >
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
                      <SelectItem value="_all" className="focus:bg-slate-700 focus:text-slate-100">
                        All Priorities
                      </SelectItem>
                      <SelectItem value="P0" className="focus:bg-slate-700 focus:text-slate-100">
                        P0
                      </SelectItem>
                      <SelectItem value="P1" className="focus:bg-slate-700 focus:text-slate-100">
                        P1
                      </SelectItem>
                      <SelectItem value="P2" className="focus:bg-slate-700 focus:text-slate-100">
                        P2
                      </SelectItem>
                      <SelectItem value="P3" className="focus:bg-slate-700 focus:text-slate-100">
                        P3
                      </SelectItem>
                      <SelectItem value="P4" className="focus:bg-slate-700 focus:text-slate-100">
                        P4
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 ml-auto">
                    <Checkbox
                      id="hide-completed-sm"
                      checked={hideCompleted}
                      onCheckedChange={checked => setHideCompleted(checked === true)}
                    />
                    <Label
                      htmlFor="hide-completed-sm"
                      className="text-sm text-slate-400 cursor-pointer select-none"
                    >
                      Hide completed
                    </Label>
                  </div>
                </div>
              </div>
            )}
            {isLoadingStories ? (
              <div className="animate-pulse space-y-2">
                <div className="h-8 bg-slate-800 rounded"></div>
                <div className="h-8 bg-slate-800 rounded"></div>
                <div className="h-8 bg-slate-800 rounded"></div>
              </div>
            ) : filteredStories.length > 0 ? (
              <StoriesTable data={filteredStories} />
            ) : (
              <p className="text-slate-500">
                {storiesData && storiesData.length > 0
                  ? 'No stories match the current filters.'
                  : 'No stories linked to this plan yet.'}
              </p>
            )}
          </div>
        </div>

        {data.details ? (
          <>
            {data.details.phases ? (
              <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 inline-block" />
                  Phases
                </h2>
                <pre className="bg-black/40 border border-slate-700/50 p-4 rounded-lg overflow-x-auto text-sm font-mono text-slate-300">
                  {JSON.stringify(data.details.phases, null, 2)}
                </pre>
              </div>
            ) : null}

            {data.details.sections ? (
              <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 inline-block" />
                  Sections
                </h2>
                <pre className="bg-black/40 border border-slate-700/50 p-4 rounded-lg overflow-x-auto text-sm font-mono text-slate-300">
                  {JSON.stringify(data.details.sections, null, 2)}
                </pre>
              </div>
            ) : null}

            {data.details.rawContent ? (
              <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 inline-block" />
                  Full Content
                </h2>
                <pre className="bg-black/40 border border-slate-700/50 p-4 rounded-lg overflow-x-auto text-sm font-mono text-slate-300 whitespace-pre-wrap">
                  {data.details.rawContent}
                </pre>
              </div>
            ) : null}

            <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-500 inline-block" />
                Metadata
              </h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-slate-400">Format Version</dt>
                  <dd className="font-mono text-sm text-slate-200">
                    {data.details.formatVersion || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-400">Content Hash</dt>
                  <dd className="font-mono text-sm text-slate-200">
                    {data.details.contentHash || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-400">Source File</dt>
                  <dd className="font-mono text-sm text-slate-200">
                    {data.details.sourceFile || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-400">Imported At</dt>
                  <dd className="text-slate-200">
                    {data.details.importedAt
                      ? new Date(data.details.importedAt).toLocaleString()
                      : '-'}
                  </dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-sm font-medium text-slate-400">Last Updated</dt>
                  <dd className="text-slate-200">
                    {new Date(data.details.updatedAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
