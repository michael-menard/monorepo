import { DetailCard } from '../shared/DetailCard'
import { VerdictIcon } from './VerdictIcon'
import { fmtMs, fmtTokens } from '../../utils/formatters'
import type { StoryDetails } from '../../store/roadmapApi'

export function OutcomeCard({ outcome }: { outcome: NonNullable<StoryDetails['outcome']> }) {
  return (
    <DetailCard>
      <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 inline-block" />
        Outcome
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-black/20 rounded-lg p-3 flex items-center gap-2">
          <VerdictIcon verdict={outcome.finalVerdict} />
          <div>
            <p className="text-xs text-slate-500">Verdict</p>
            <p className="text-sm font-mono font-semibold text-slate-200 capitalize">
              {outcome.finalVerdict}
            </p>
          </div>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-0.5">Quality Score</p>
          <p className="text-sm font-mono font-semibold text-slate-200">
            {outcome.qualityScore}
            <span className="text-slate-600 font-normal">/100</span>
          </p>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-0.5">Duration</p>
          <p className="text-sm font-mono font-semibold text-slate-200">
            {fmtMs(outcome.durationMs)}
          </p>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-0.5">Review Iterations</p>
          <p className="text-sm font-mono font-semibold text-slate-200">
            {outcome.reviewIterations}
          </p>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-0.5">QA Iterations</p>
          <p className="text-sm font-mono font-semibold text-slate-200">{outcome.qaIterations}</p>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-0.5">Est. Cost</p>
          <p className="text-sm font-mono font-semibold text-slate-200">
            ${parseFloat(outcome.estimatedTotalCost).toFixed(4)}
          </p>
        </div>
      </div>
      <div className="border-t border-slate-800 pt-3 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Input tokens</span>
          <span className="font-mono text-slate-400">{fmtTokens(outcome.totalInputTokens)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Output tokens</span>
          <span className="font-mono text-slate-400">{fmtTokens(outcome.totalOutputTokens)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Cached tokens</span>
          <span className="font-mono text-slate-400">{fmtTokens(outcome.totalCachedTokens)}</span>
        </div>
        {outcome.primaryBlocker && (
          <div className="pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-500">Primary blocker: </span>
            <span className="text-xs text-red-400">{outcome.primaryBlocker}</span>
          </div>
        )}
      </div>
    </DetailCard>
  )
}
