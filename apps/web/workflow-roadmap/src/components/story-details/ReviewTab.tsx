import { ArtifactJsonViewer } from './ArtifactJsonViewer'
import type { StoryDetails } from '../../store/roadmapApi'

export function ReviewTab({ review }: { review: NonNullable<StoryDetails['review']> }) {
  const d = review.data as Record<string, unknown> | null
  const summary = d?.summary as string | null
  const findings = d?.findings as Record<string, { verdict: string; notes: string }> | null
  const totalErrors = d?.total_errors as number | null
  const totalWarnings = d?.total_warnings as number | null
  const verdictColor = (v: string) =>
    v === 'PASS' ? 'text-emerald-400' : v === 'WARN' ? 'text-amber-400' : 'text-red-400'
  const verdictDot = (v: string) =>
    v === 'PASS' ? 'bg-emerald-400' : v === 'WARN' ? 'bg-amber-400' : 'bg-red-400'

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-base font-semibold text-slate-300">Code Review</h2>
          {review.verdict && (
            <span className={`text-sm font-mono font-semibold ${verdictColor(review.verdict)}`}>
              {review.verdict}
            </span>
          )}
          {totalErrors != null && (
            <span className="text-xs font-mono text-slate-500 ml-auto">
              {totalErrors} errors · {totalWarnings ?? 0} warnings
            </span>
          )}
        </div>
        {summary && (
          <p className="text-sm text-slate-400 mb-4 leading-relaxed border-l-2 border-slate-700 pl-3">
            {summary}
          </p>
        )}
        {findings && Object.keys(findings).length > 0 && (
          <div className="space-y-1">
            {Object.entries(findings).map(([worker, f]) => (
              <div
                key={worker}
                className="flex items-start gap-3 py-2 border-b border-slate-800/60 last:border-0"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${verdictDot(f.verdict)}`}
                />
                <span className="font-mono text-xs text-slate-400 w-24 shrink-0 capitalize">
                  {worker}
                </span>
                <span className={`text-xs font-mono shrink-0 ${verdictColor(f.verdict)}`}>
                  {f.verdict}
                </span>
                <span className="text-xs text-slate-500 leading-relaxed">{f.notes}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <ArtifactJsonViewer title="" data={review.data} meta={[]} />
    </div>
  )
}
