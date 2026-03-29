import { CheckCircle2, XCircle, Loader2, MinusCircle } from 'lucide-react'
import type { OrchestrationEvent } from '../../hooks/useOrchestration'

export function OrchestrationProgress({
  events,
  isRunning,
  onClose,
}: {
  events: OrchestrationEvent[]
  isRunning: boolean
  onClose: () => void
}) {
  if (events.length === 0) return null

  const isComplete = events.some(e => e.type === 'complete')

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" />
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-96 max-h-[80vh] rounded-lg border border-slate-700 bg-slate-800 shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200">
            {isRunning ? 'Running...' : 'Complete'}
          </h3>
          {isComplete ? (
            <button
              type="button"
              className="px-3 py-1 text-xs rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
              onClick={onClose}
            >
              Close
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {events
            .filter(e => e.key) // skip the final "complete" with empty key
            .map((event, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {event.type === 'starting' && (
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                )}
                {event.type === 'started' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {event.type === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                {event.type === 'skipped' && <MinusCircle className="h-4 w-4 text-slate-500" />}
                <span className="font-mono text-xs text-slate-400">{event.key}</span>
                <span className="text-xs text-slate-500 truncate flex-1">{event.message}</span>
              </div>
            ))}
        </div>
      </div>
    </>
  )
}
