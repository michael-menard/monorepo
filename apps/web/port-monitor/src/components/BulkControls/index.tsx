import { useState } from 'react'
import { Play, Square } from 'lucide-react'

export function BulkControls({
  onStartAll,
  onStopAll,
  isRunning,
}: {
  onStartAll: (filter?: 'frontend' | 'backend') => void
  onStopAll: (filter?: 'frontend' | 'backend') => void
  isRunning: boolean
}) {
  const [confirmAction, setConfirmAction] = useState<{
    action: 'start' | 'stop'
    filter?: 'frontend' | 'backend'
  } | null>(null)

  function handleConfirm() {
    if (!confirmAction) return
    if (confirmAction.action === 'start') {
      onStartAll(confirmAction.filter)
    } else {
      onStopAll(confirmAction.filter)
    }
    setConfirmAction(null)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative group">
          <button
            type="button"
            disabled={isRunning}
            className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-50"
            onClick={() => setConfirmAction({ action: 'start' })}
          >
            <Play className="h-3 w-3" /> Start All
          </button>
        </div>

        <div className="relative group">
          <button
            type="button"
            disabled={isRunning}
            className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
            onClick={() => setConfirmAction({ action: 'stop' })}
          >
            <Square className="h-3 w-3" /> Stop All
          </button>
        </div>
      </div>

      {confirmAction ? (
        <>
          <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setConfirmAction(null)} />
          <div className="fixed left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 w-80 rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">
              {confirmAction.action === 'start' ? 'Start' : 'Stop'} Services
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Select which services to {confirmAction.action}:
            </p>
            <div className="flex flex-col gap-2 mb-4">
              <button
                type="button"
                className="text-left px-3 py-2 rounded text-sm text-slate-200 hover:bg-slate-700"
                onClick={() => {
                  setConfirmAction({ ...confirmAction, filter: undefined })
                  handleConfirm()
                }}
              >
                All Services
              </button>
              <button
                type="button"
                className="text-left px-3 py-2 rounded text-sm text-slate-200 hover:bg-slate-700"
                onClick={() => {
                  if (confirmAction.action === 'start') onStartAll('backend')
                  else onStopAll('backend')
                  setConfirmAction(null)
                }}
              >
                Backends Only
              </button>
              <button
                type="button"
                className="text-left px-3 py-2 rounded text-sm text-slate-200 hover:bg-slate-700"
                onClick={() => {
                  if (confirmAction.action === 'start') onStartAll('frontend')
                  else onStopAll('frontend')
                  setConfirmAction(null)
                }}
              >
                Frontends Only
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}
