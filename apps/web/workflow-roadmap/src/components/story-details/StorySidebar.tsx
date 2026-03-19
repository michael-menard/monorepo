import { AppBadge } from '@repo/app-component-library'
import { Clock, Calendar, Layers, Zap, GitBranch, AlertTriangle, ChevronRight } from 'lucide-react'
import { DetailCard } from '../shared/DetailCard'
import { relativeTime } from '../../utils/formatters'
import type { StoryDetails } from '../../store/roadmapApi'

export function StorySidebar({ data }: { data: StoryDetails }) {
  const tags = data.tags ?? []
  const surfaceTags = tags
    .filter(t => t.startsWith('surface:'))
    .map(t => t.slice('surface:'.length))
  const nonSurfaceTags = tags.filter(t => !t.startsWith('surface:'))

  return (
    <div className="space-y-6">
      {/* Details */}
      <DetailCard>
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
          {data.experimentVariant && (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                Experiment
              </dt>
              <dd>
                <AppBadge
                  variant="outline"
                  className="font-mono text-xs !border-violet-500/30 !text-violet-300"
                >
                  {data.experimentVariant}
                </AppBadge>
              </dd>
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
      </DetailCard>

      {/* Elaboration */}
      {data.elaboration && (
        <DetailCard>
          <h2 className="text-base font-semibold mb-3 text-slate-300 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 inline-block" />
            Elaboration
          </h2>
          <dl className="space-y-3">
            {data.elaboration.verdict && (
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                  Verdict
                </dt>
                <dd>
                  <span
                    className={[
                      'font-mono text-xs px-2 py-0.5 rounded border',
                      data.elaboration.verdict === 'PASS'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : data.elaboration.verdict === 'CONDITIONAL_PASS'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : data.elaboration.verdict === 'FAIL'
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400',
                    ].join(' ')}
                  >
                    {data.elaboration.verdict}
                  </span>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                Complexity
              </dt>
              <dd className="text-sm text-slate-200 capitalize">
                {data.elaboration.risk ? (
                  data.elaboration.risk.replace(/_/g, ' ')
                ) : (
                  <span className="text-slate-600 italic">—</span>
                )}
              </dd>
            </div>
            {data.elaboration.elabPhase && (
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                  Elab Phase
                </dt>
                <dd className="text-sm text-slate-200">{data.elaboration.elabPhase}</dd>
              </div>
            )}
            {data.elaboration.confidence && (
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                  Confidence
                </dt>
                <dd className="text-sm text-slate-200 capitalize">{data.elaboration.confidence}</dd>
              </div>
            )}
            {data.elaboration.skillLevel && (
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                  Skill Level
                </dt>
                <dd className="text-sm text-slate-200 capitalize">
                  {data.elaboration.skillLevel.replace(/_/g, ' ')}
                </dd>
              </div>
            )}
            {data.elaboration.implementationEstimate && (
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                  Estimate
                </dt>
                <dd className="text-sm text-slate-200">
                  {data.elaboration.implementationEstimate}
                </dd>
              </div>
            )}
          </dl>
        </DetailCard>
      )}

      {/* Current Work State */}
      <DetailCard>
        <h2 className="text-base font-semibold mb-3 text-slate-300 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" />
          Work State
        </h2>
        <dl className="space-y-3">
          {(data.currentWorkState?.branch ?? data.branch) && (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <GitBranch className="h-3 w-3" /> Branch
              </dt>
              <dd className="font-mono text-xs text-cyan-400/80 break-all">
                {data.currentWorkState?.branch ?? data.branch}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <GitBranch className="h-3 w-3" /> Source Branch
            </dt>
            <dd className="font-mono text-xs text-slate-400/80 break-all">
              {((data.currentWorkState as unknown as Record<string, unknown>)
                ?.sourceBranch as string) ??
                ((data as unknown as Record<string, unknown>).sourceBranch as string) ??
                'main'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <GitBranch className="h-3 w-3" /> Worktree
            </dt>
            <dd className="font-mono text-xs text-slate-400/80 break-all">
              {data.worktreePath || '—'}
            </dd>
          </div>
          {data.currentWorkState?.phase && (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                Phase
              </dt>
              <dd className="text-sm text-slate-200">{data.currentWorkState?.phase}</dd>
            </div>
          )}
          {Array.isArray(data.currentWorkState?.nextSteps) &&
            (data.currentWorkState?.nextSteps as string[]).length > 0 && (
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Next Steps
                </dt>
                <dd className="space-y-1">
                  {(data.currentWorkState?.nextSteps as string[]).map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <ChevronRight className="h-3 w-3 text-cyan-500/40 mt-0.5 shrink-0" />
                      {step}
                    </div>
                  ))}
                </dd>
              </div>
            )}
          {Array.isArray(data.currentWorkState?.blockers) &&
            (data.currentWorkState?.blockers as string[]).length > 0 && (
              <div>
                <dt className="text-xs font-medium text-red-500/70 uppercase tracking-wider mb-1">
                  Blockers
                </dt>
                <dd className="space-y-1">
                  {(data.currentWorkState?.blockers as string[]).map((b, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-red-400/80">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                      {b}
                    </div>
                  ))}
                </dd>
              </div>
            )}
        </dl>
      </DetailCard>

      {/* Tags */}
      {tags.length > 0 && (
        <DetailCard>
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
        </DetailCard>
      )}
    </div>
  )
}
