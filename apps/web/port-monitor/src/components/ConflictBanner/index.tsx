import { AlertTriangle } from 'lucide-react'
import type { ConflictInfo } from '../../store/__types__'

export function ConflictBanner({ conflicts }: { conflicts: ConflictInfo[] }) {
  if (conflicts.length === 0) return null

  return (
    <div
      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300"
      role="alert"
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <span className="font-semibold">Port Conflicts Detected</span>
      </div>
      <ul className="space-y-1 ml-6 list-disc">
        {conflicts.map(c => (
          <li key={c.expectedKey}>
            <span className="font-mono">{c.expectedKey}</span> — unexpected process{' '}
            <span className="font-mono text-amber-200">{c.actualProcessName}</span> (PID{' '}
            {c.actualPid})
          </li>
        ))}
      </ul>
    </div>
  )
}
