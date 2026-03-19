import { PIPELINE_STAGES } from '@repo/app-component-library'

export function PipelineStrip({ state }: { state: string }) {
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
