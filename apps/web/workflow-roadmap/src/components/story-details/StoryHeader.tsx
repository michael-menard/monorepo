import { Link } from 'react-router-dom'
import { AppBadge, StateTag, PriorityTag } from '@repo/app-component-library'
import { ChevronRight } from 'lucide-react'
import { CopyButton } from '../shared/CopyButton'
import type { StoryDetails } from '../../store/roadmapApi'

export function StoryHeader({
  data,
  fromPlan,
}: {
  data: StoryDetails
  fromPlan?: { slug: string; title: string }
}) {
  return (
    <>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-1.5 text-sm text-slate-400">
          <li>
            <Link to="/" className="hover:text-cyan-400 transition-colors">
              Roadmap
            </Link>
          </li>
          {fromPlan ? (
            <>
              <li aria-hidden="true">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li>
                <Link
                  to={`/plan/${fromPlan.slug}`}
                  className="hover:text-cyan-400 transition-colors"
                >
                  {fromPlan.title}
                </Link>
              </li>
            </>
          ) : null}
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li className="text-slate-200 font-mono">{data.storyId}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="group/sid inline-flex items-center gap-1.5 shrink-0">
            <span className="font-mono text-sm text-cyan-500/70 border border-cyan-500/30 rounded px-2 py-0.5">
              {data.storyId}
            </span>
            <CopyButton text={data.storyId} />
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-wide bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-4 leading-snug">
          {data.title}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <StateTag state={data.state} />
          {data.priority ? <PriorityTag priority={data.priority} /> : null}
          {data.outcome ? (
            <span className="text-xs text-slate-500 font-mono border border-slate-700/50 rounded px-2 py-0.5">
              ${parseFloat(data.outcome.estimatedTotalCost).toFixed(4)}
              {data.outcome.reviewIterations != null && ` · ${data.outcome.reviewIterations}r`}
              {data.outcome.qaIterations != null && ` · ${data.outcome.qaIterations}qa`}
            </span>
          ) : null}
          {data.storyType ? <AppBadge variant="secondary">{data.storyType}</AppBadge> : null}
          {data.epic ? (
            <AppBadge variant="outline" className="font-mono text-xs">
              {data.epic}
            </AppBadge>
          ) : null}
          {data.linkedPlans.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {data.linkedPlans.map(lp => (
                <Link key={lp.planSlug} to={`/plan/${lp.planSlug}`}>
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
    </>
  )
}
