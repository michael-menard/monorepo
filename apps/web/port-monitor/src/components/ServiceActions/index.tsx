import { useState } from 'react'
import { MoreVertical, Play, Square, RotateCcw, Loader2 } from 'lucide-react'
import { useToast } from '@repo/app-component-library'
import {
  useStopServiceMutation,
  useStartServiceMutation,
  useRestartServiceMutation,
} from '../../store/portMonitorApi'
import type { ServiceStatus } from '../../store/__types__'

const SELF_KEY = 'ROADMAP_SVC_PORT'

export function ServiceActions({
  serviceKey,
  status,
}: {
  serviceKey: string
  status: ServiceStatus
}) {
  const [open, setOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'stop' | 'restart' | null>(null)
  const { success, error } = useToast()

  const [stopService, { isLoading: isStopping }] = useStopServiceMutation()
  const [startService, { isLoading: isStarting }] = useStartServiceMutation()
  const [restartService, { isLoading: isRestarting }] = useRestartServiceMutation()

  const isSelf = serviceKey === SELF_KEY
  const isLoading = isStopping || isStarting || isRestarting

  async function handleAction(action: 'start' | 'stop' | 'restart') {
    setOpen(false)
    setConfirmAction(null)

    try {
      let result
      if (action === 'stop') result = await stopService(serviceKey).unwrap()
      else if (action === 'start') result = await startService(serviceKey).unwrap()
      else result = await restartService(serviceKey).unwrap()

      if (result.success) {
        success(`${action} successful`, result.message)
      } else {
        error(result.message, `${action} failed`)
      }
    } catch (err) {
      error(err, `Failed to ${action} service`)
    }
  }

  if (isSelf) {
    return <span className="text-xs text-slate-600">self</span>
  }

  return (
    <div className="relative">
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
      ) : (
        <button
          type="button"
          className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
          onClick={() => setOpen(!open)}
          aria-label={`Actions for ${serviceKey}`}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      )}

      {open && !isLoading ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-slate-700 bg-slate-800 shadow-lg">
            {status !== 'healthy' && (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50"
                onClick={() => handleAction('start')}
              >
                <Play className="h-3.5 w-3.5" /> Start
              </button>
            )}
            {status === 'healthy' && (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50"
                onClick={() => setConfirmAction('stop')}
              >
                <Square className="h-3.5 w-3.5" /> Stop
              </button>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50"
              onClick={() => setConfirmAction('restart')}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restart
            </button>
          </div>
        </>
      ) : null}

      {confirmAction ? (
        <>
          <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setConfirmAction(null)} />
          <div className="fixed left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 w-80 rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">Confirm {confirmAction}</h3>
            <p className="text-xs text-slate-400 mb-4">
              Are you sure you want to {confirmAction}{' '}
              <span className="font-mono">{serviceKey}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-500"
                onClick={() => handleAction(confirmAction)}
              >
                {confirmAction === 'stop' ? 'Stop' : 'Restart'}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
