import { useParams, Link } from '@tanstack/react-router'
import { AppBadge, CustomButton, Textarea } from '@repo/app-component-library'
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Calendar,
  Layers,
  Zap,
  GitBranch,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Activity,
  ChevronRight,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useGetStoryByIdQuery, useUpdateStoryMutation } from '../store/roadmapApi'

const PIPELINE_STAGES = [
  {
    id: 'backlog',
    label: 'Backlog',
    states: ['backlog', 'created'],
    color: 'bg-slate-400',
    text: 'text-slate-400',
  },
  {
    id: 'ready',
    label: 'Ready',
    states: ['ready_to_work'],
    color: 'bg-cyan-400',
    text: 'text-cyan-400',
  },
  {
    id: 'progress',
    label: 'In Progress',
    states: ['in_progress'],
    color: 'bg-blue-400',
    text: 'text-blue-400',
  },
  {
    id: 'review',
    label: 'Review',
    states: ['needs_code_review', 'ready_for_review', 'failed_code_review'],
    color: 'bg-violet-400',
    text: 'text-violet-400',
  },
  {
    id: 'qa',
    label: 'QA',
    states: ['ready_for_qa', 'in_qa'],
    color: 'bg-amber-400',
    text: 'text-amber-400',
  },
  { id: 'uat', label: 'UAT', states: ['uat'], color: 'bg-emerald-400', text: 'text-emerald-400' },
  {
    id: 'done',
    label: 'Done',
    states: ['completed'],
    color: 'bg-emerald-500',
    text: 'text-emerald-400',
  },
]

function PipelineStrip({ state }: { state: string }) {
  const currentIdx = PIPELINE_STAGES.findIndex(s => s.states.includes(state))
  const isFailed = state === 'failed_code_review'
  const current = PIPELINE_STAGES[Math.max(0, currentIdx)]

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl px-6 py-4">
      <div className="flex items-start">
        {PIPELINE_STAGES.map((stage, idx) => {
          const isPast = idx < currentIdx
          const isCurrent = idx === currentIdx
          return (
            <div key={stage.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={[
                    'h-3 w-3 rounded-full transition-all',
                    isCurrent
                      ? isFailed
                        ? 'bg-red-500 ring-2 ring-red-500/30 scale-125'
                        : `${current.color} ring-2 ring-white/10 scale-125`
                      : isPast
                        ? 'bg-slate-600'
                        : 'bg-slate-800 border border-slate-700',
                  ].join(' ')}
                />
                <span
                  className={[
                    'text-xs font-mono whitespace-nowrap',
                    isCurrent
                      ? isFailed
                        ? 'text-red-400 font-semibold'
                        : `${current.text} font-semibold`
                      : isPast
                        ? 'text-slate-600'
                        : 'text-slate-700',
                  ].join(' ')}
                >
                  {stage.label}
                </span>
              </div>
              {idx < PIPELINE_STAGES.length - 1 && (
                <div
                  className={`flex-1 h-px mx-1 mb-5 ${isPast || isCurrent ? 'bg-slate-600' : 'bg-slate-800'}`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string | null | undefined }) {
  if (!priority) return null
  const cls =
    priority === 'P0'
      ? '!bg-red-600/50 !border-red-500/40 !text-white/80'
      : priority === 'P1'
        ? '!bg-red-500/40 !border-red-500/30 !text-white/60'
        : priority === 'P2'
          ? '!bg-orange-500/40 !border-orange-500/30 !text-white/60'
          : priority === 'P3'
            ? '!bg-amber-400/40 !border-amber-400/30 !text-white/60'
            : priority === 'P4'
              ? '!bg-teal-500/40 !border-teal-500/30 !text-white/60'
              : '!bg-blue-500/40 !border-blue-500/30 !text-white/60'
  return (
    <AppBadge variant="outline" className={cls}>
      {priority}
    </AppBadge>
  )
}

function StateBadge({ state }: { state: string }) {
  const variant =
    state === 'completed'
      ? 'default'
      : state === 'blocked' || state === 'failed_code_review'
        ? 'destructive'
        : state === 'in_progress' || state === 'in_qa'
          ? 'outline'
          : 'secondary'
  return <AppBadge variant={variant}>{state.replace(/_/g, ' ')}</AppBadge>
}

function VerdictIcon({ verdict }: { verdict: string }) {
  if (verdict === 'pass') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
  if (verdict === 'fail') return <XCircle className="h-4 w-4 text-red-400" />
  if (verdict === 'blocked') return <AlertTriangle className="h-4 w-4 text-amber-400" />
  return <RefreshCw className="h-4 w-4 text-slate-400" />
}

function relativeTime(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(ms / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function StoryDetailsPage() {
  const { storyId } = useParams({ from: '/story/$storyId' })
  const { data, error, isLoading } = useGetStoryByIdQuery(storyId)
  const [updateStory] = useUpdateStoryMutation()
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionValue, setDescriptionValue] = useState('')

  const handleDescriptionSave = async () => {
    try {
      await updateStory({ storyId, input: { description: descriptionValue } }).unwrap()
      setEditingDescription(false)
    } catch {
      // keep editing open on error
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="animate-pulse space-y-6">
          <div className="h-5 bg-slate-800 rounded w-32" />
          <div className="space-y-3">
            <div className="h-4 bg-slate-800 rounded w-24" />
            <div className="h-8 bg-slate-800 rounded w-2/3" />
            <div className="flex gap-2">
              <div className="h-5 bg-slate-800 rounded-full w-20" />
              <div className="h-5 bg-slate-800 rounded-full w-16" />
            </div>
          </div>
          <div className="h-16 bg-slate-900/50 border border-slate-700/50 rounded-xl" />
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div className="h-40 bg-slate-900/50 border border-slate-700/50 rounded-xl" />
              <div className="h-24 bg-slate-900/50 border border-slate-700/50 rounded-xl" />
            </div>
            <div className="h-64 bg-slate-900/50 border border-slate-700/50 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    const errStatus = error && 'status' in error ? error.status : null
    const errDetail =
      error && 'data' in error && error.data && typeof error.data === 'object'
        ? ((error.data as Record<string, unknown>).detail ??
          (error.data as Record<string, unknown>).error)
        : null
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center text-sm text-slate-400 hover:text-cyan-400 mb-6 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </button>
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg font-mono text-sm space-y-1">
          <div>
            ERROR:{' '}
            {error
              ? errStatus === 404
                ? 'Story not found'
                : 'Failed to fetch story'
              : 'Story not found'}
          </div>
          {errStatus && <div className="text-red-400/60 text-xs">HTTP {errStatus}</div>}
          {errDetail != null && (
            <div className="text-red-400/60 text-xs break-all">{String(errDetail)}</div>
          )}
        </div>
      </div>
    )
  }

  const tags = data.tags ?? []
  const surfaceTags = tags
    .filter(t => t.startsWith('surface:'))
    .map(t => t.slice('surface:'.length))
  const nonSurfaceTags = tags.filter(t => !t.startsWith('surface:'))
  const blockedBy = data.dependencies
    .filter(d => d.dependencyType === 'blocked_by')
    .map(d => d.dependsOnId)
  const blocks = data.dependencies
    .filter(d => d.dependencyType === 'blocks')
    .map(d => d.dependsOnId)
  const hasDependencies = blockedBy.length > 0 || blocks.length > 0
  const acSection = data.contentSections.find(s => s.sectionName === 'acceptance_criteria')

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Back */}
      <button
        onClick={() => window.history.back()}
        className="inline-flex items-center text-sm text-slate-400 hover:text-cyan-400 mb-6 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="font-mono text-sm text-cyan-500/70 border border-cyan-500/30 rounded px-2 py-0.5 shrink-0">
            {data.storyId}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-wide bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-4 leading-snug">
          {data.title}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <StateBadge state={data.state} />
          <PriorityBadge priority={data.priority} />
          {data.storyType && <AppBadge variant="secondary">{data.storyType}</AppBadge>}
          {data.epic && (
            <AppBadge variant="outline" className="font-mono text-xs">
              {data.epic}
            </AppBadge>
          )}
          {data.linkedPlans.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {data.linkedPlans.map(lp => (
                <Link key={lp.planSlug} to="/plan/$slug" params={{ slug: lp.planSlug }}>
                  <AppBadge
                    variant="outline"
                    className="font-mono text-xs text-cyan-500/60 border-cyan-500/20 hover:border-cyan-400/40 transition-colors"
                  >
                    {lp.planSlug}
                  </AppBadge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline strip */}
      <div className="mb-6">
        <PipelineStrip state={data.state} />
      </div>

      {/* Blocked reason banner */}
      {data.blockedReason && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400 mb-0.5">Blocked</p>
            <p className="text-sm text-red-300/80">{data.blockedReason}</p>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6 group">
            <h2 className="text-base font-semibold mb-3 text-slate-300 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 inline-block" />
              Description
              {!editingDescription && (
                <CustomButton
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setDescriptionValue(data.description ?? '')
                    setEditingDescription(true)
                  }}
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 text-slate-500 hover:text-cyan-400 ml-auto"
                  title="Edit description"
                >
                  <Pencil className="h-3 w-3" />
                </CustomButton>
              )}
            </h2>
            {editingDescription ? (
              <div className="space-y-2">
                <Textarea
                  value={descriptionValue}
                  onChange={e => setDescriptionValue(e.target.value)}
                  rows={6}
                  className="text-sm bg-slate-800/50 border-slate-600/50 text-slate-100 resize-y w-full"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <CustomButton
                    variant="ghost"
                    size="icon"
                    onClick={handleDescriptionSave}
                    className="h-8 w-8 text-green-400 hover:text-green-300"
                    title="Save"
                  >
                    <Check className="h-4 w-4" />
                  </CustomButton>
                  <CustomButton
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingDescription(false)}
                    className="h-8 w-8 text-red-400 hover:text-red-300"
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </CustomButton>
                </div>
              </div>
            ) : (
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
                {data.description ?? <span className="text-slate-600 italic">No description</span>}
              </p>
            )}
          </div>

          {/* Acceptance Criteria */}
          {acSection?.contentText && (
            <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-base font-semibold mb-3 text-slate-300 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                Acceptance Criteria
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {acSection.contentText}
              </p>
            </div>
          )}

          {/* Content Sections (excluding AC which has its own block) */}
          {data.contentSections.filter(s => s.sectionName !== 'acceptance_criteria').length > 0 && (
            <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                Story Content
              </h2>
              <div className="space-y-4">
                {data.contentSections
                  .filter(s => s.sectionName !== 'acceptance_criteria')
                  .map(section => (
                    <div key={section.sectionName}>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        {section.sectionName.replace(/_/g, ' ')}
                      </h3>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {section.contentText ?? '—'}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {hasDependencies && (
            <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
                Dependencies
              </h2>
              <div className="space-y-4">
                {blockedBy.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                      Blocked by — must complete first
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {blockedBy.map(id => (
                        <Link
                          key={id}
                          to="/story/$storyId"
                          params={{ storyId: id }}
                          className="inline-flex items-center gap-1.5 font-mono text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 rounded px-2.5 py-1 transition-colors"
                        >
                          {id}
                          <ArrowRight className="h-3 w-3 opacity-60" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {blocks.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                      Blocks — waiting on this
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {blocks.map(id => (
                        <Link
                          key={id}
                          to="/story/$storyId"
                          params={{ storyId: id }}
                          className="inline-flex items-center gap-1.5 font-mono text-sm text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400/50 rounded px-2.5 py-1 transition-colors"
                        >
                          <ArrowRight className="h-3 w-3 opacity-60" />
                          {id}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Outcome */}
          {data.outcome && (
            <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 inline-block" />
                Outcome
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-black/20 rounded-lg p-3 flex items-center gap-2">
                  <VerdictIcon verdict={data.outcome.finalVerdict} />
                  <div>
                    <p className="text-xs text-slate-500">Verdict</p>
                    <p className="text-sm font-mono font-semibold text-slate-200 capitalize">
                      {data.outcome.finalVerdict}
                    </p>
                  </div>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-0.5">Quality Score</p>
                  <p className="text-sm font-mono font-semibold text-slate-200">
                    {data.outcome.qualityScore}
                    <span className="text-slate-600 font-normal">/100</span>
                  </p>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-0.5">Duration</p>
                  <p className="text-sm font-mono font-semibold text-slate-200">
                    {fmtMs(data.outcome.durationMs)}
                  </p>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-0.5">Review Iterations</p>
                  <p className="text-sm font-mono font-semibold text-slate-200">
                    {data.outcome.reviewIterations}
                  </p>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-0.5">QA Iterations</p>
                  <p className="text-sm font-mono font-semibold text-slate-200">
                    {data.outcome.qaIterations}
                  </p>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-0.5">Est. Cost</p>
                  <p className="text-sm font-mono font-semibold text-slate-200">
                    ${parseFloat(data.outcome.estimatedTotalCost).toFixed(4)}
                  </p>
                </div>
              </div>
              <div className="border-t border-slate-800 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Input tokens</span>
                  <span className="font-mono text-slate-400">
                    {fmtTokens(data.outcome.totalInputTokens)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Output tokens</span>
                  <span className="font-mono text-slate-400">
                    {fmtTokens(data.outcome.totalOutputTokens)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Cached tokens</span>
                  <span className="font-mono text-slate-400">
                    {fmtTokens(data.outcome.totalCachedTokens)}
                  </span>
                </div>
                {data.outcome.primaryBlocker && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-xs text-slate-500">Primary blocker: </span>
                    <span className="text-xs text-red-400">{data.outcome.primaryBlocker}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* State History */}
          {data.stateHistory.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                State History
                <span className="text-xs text-slate-600 font-normal font-mono">
                  (last {data.stateHistory.length})
                </span>
              </h2>
              <div className="space-y-1">
                {data.stateHistory.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-1.5 border-b border-slate-800/60 last:border-0"
                  >
                    <span className="text-xs font-mono text-slate-600 shrink-0 w-16">
                      {relativeTime(entry.createdAt)}
                    </span>
                    <span className="text-xs font-mono text-slate-500 shrink-0">
                      {entry.eventType}
                    </span>
                    {entry.fromState && (
                      <>
                        <span className="text-xs text-slate-600">{entry.fromState}</span>
                        <ArrowRight className="h-3 w-3 text-slate-700 shrink-0" />
                      </>
                    )}
                    {entry.toState && (
                      <span className="text-xs font-medium text-slate-300">{entry.toState}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 inline-block" />
              Details
            </h2>
            <dl className="space-y-3">
              {data.epic && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                    Epic
                  </dt>
                  <dd className="font-mono text-sm text-slate-200">{data.epic}</dd>
                </div>
              )}
              {data.storyType && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                    Type
                  </dt>
                  <dd className="text-sm text-slate-200">{data.storyType}</dd>
                </div>
              )}
              {(data.storyPoints != null || data.complexity) && (
                <div className="grid grid-cols-2 gap-3">
                  {data.storyPoints != null && (
                    <div>
                      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Points
                      </dt>
                      <dd className="font-mono text-sm text-slate-200">{data.storyPoints}</dd>
                    </div>
                  )}
                  {data.complexity && (
                    <div>
                      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        <Layers className="h-3 w-3" /> Complexity
                      </dt>
                      <dd className="text-sm text-slate-200">{data.complexity}</dd>
                    </div>
                  )}
                </div>
              )}
              <div className="border-t border-slate-800 pt-3 space-y-3">
                {data.startedAt && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                      Started
                    </dt>
                    <dd className="text-sm text-slate-400 flex items-center gap-1.5">
                      <span>{relativeTime(data.startedAt)}</span>
                      <span className="text-slate-600 text-xs">
                        {new Date(data.startedAt).toLocaleDateString()}
                      </span>
                    </dd>
                  </div>
                )}
                {data.completedAt && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                      Completed
                    </dt>
                    <dd className="text-sm text-slate-400 flex items-center gap-1.5">
                      <span>{relativeTime(data.completedAt)}</span>
                      <span className="text-slate-600 text-xs">
                        {new Date(data.completedAt).toLocaleDateString()}
                      </span>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Created
                  </dt>
                  <dd className="text-sm text-slate-400">
                    {new Date(data.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Last Updated
                  </dt>
                  <dd className="text-sm text-slate-400 flex items-center gap-1.5">
                    <span>{relativeTime(data.updatedAt)}</span>
                    <span className="text-slate-600 text-xs">
                      {new Date(data.updatedAt).toLocaleDateString()}
                    </span>
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Current Work State */}
          {data.currentWorkState && (
            <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-base font-semibold mb-3 text-slate-300 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" />
                Work State
              </h2>
              <dl className="space-y-3">
                {data.currentWorkState.branch && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <GitBranch className="h-3 w-3" /> Branch
                    </dt>
                    <dd className="font-mono text-xs text-cyan-400/80 break-all">
                      {data.currentWorkState.branch}
                    </dd>
                  </div>
                )}
                {data.currentWorkState.phase && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                      Phase
                    </dt>
                    <dd className="text-sm text-slate-200">{data.currentWorkState.phase}</dd>
                  </div>
                )}
                {Array.isArray(data.currentWorkState.nextSteps) &&
                  (data.currentWorkState.nextSteps as string[]).length > 0 && (
                    <div>
                      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                        Next Steps
                      </dt>
                      <dd className="space-y-1">
                        {(data.currentWorkState.nextSteps as string[]).map((step, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                            <ChevronRight className="h-3 w-3 text-cyan-500/40 mt-0.5 shrink-0" />
                            {step}
                          </div>
                        ))}
                      </dd>
                    </div>
                  )}
                {Array.isArray(data.currentWorkState.blockers) &&
                  (data.currentWorkState.blockers as string[]).length > 0 && (
                    <div>
                      <dt className="text-xs font-medium text-red-500/70 uppercase tracking-wider mb-1">
                        Blockers
                      </dt>
                      <dd className="space-y-1">
                        {(data.currentWorkState.blockers as string[]).map((b, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-red-400/80">
                            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                            {b}
                          </div>
                        ))}
                      </dd>
                    </div>
                  )}
              </dl>
            </div>
          )}

          {/* Tags (surfaces + plain tags) */}
          {tags.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-base font-semibold mb-3 text-slate-300 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-500 inline-block" />
                Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {surfaceTags.map(s => (
                  <AppBadge key={`surface:${s}`} variant="outline">
                    {s}
                  </AppBadge>
                ))}
                {nonSurfaceTags.map(tag => (
                  <AppBadge key={tag} variant="secondary">
                    {tag}
                  </AppBadge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
