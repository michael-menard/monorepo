import { motion } from 'framer-motion'
import { Tooltip, TooltipTrigger, TooltipContent } from '@repo/app-component-library'

export interface StoryStats {
  total: number
  completed: number
  active: number
  backlog: number
}

export function ActivityRings({ stats }: { stats: StoryStats }) {
  const { total, completed, active, backlog } = stats
  const completedPct = total > 0 ? completed / total : 0
  const activePct = total > 0 ? active / total : 0
  const backlogPct = total > 0 ? backlog / total : 0

  const sw = 8
  const gap = 4
  const r1 = 44
  const r2 = r1 - sw - gap
  const r3 = r2 - sw - gap
  const c1 = 2 * Math.PI * r1
  const c2 = 2 * Math.PI * r2
  const c3 = 2 * Math.PI * r3

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-[200px] aspect-square cursor-default">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMin meet"
            className="-rotate-90 drop-shadow-lg"
            aria-hidden="true"
          >
            {/* Track rings */}
            <circle cx="50" cy="50" r={r1} fill="none" stroke="#060f1e" strokeWidth={sw} />
            <circle cx="50" cy="50" r={r2} fill="none" stroke="#060f1e" strokeWidth={sw} />
            <circle cx="50" cy="50" r={r3} fill="none" stroke="#060f1e" strokeWidth={sw} />
            {/* Completed — emerald outer */}
            <motion.circle
              cx="50"
              cy="50"
              r={r1}
              fill="none"
              stroke="#10b981"
              strokeWidth={sw}
              strokeDasharray={c1}
              strokeLinecap="round"
              initial={{ strokeDashoffset: c1 }}
              animate={{ strokeDashoffset: c1 * (1 - completedPct) }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0 }}
            />
            {/* Active — blue middle */}
            <motion.circle
              cx="50"
              cy="50"
              r={r2}
              fill="none"
              stroke="#60a5fa"
              strokeWidth={sw}
              strokeDasharray={c2}
              strokeLinecap="round"
              initial={{ strokeDashoffset: c2 }}
              animate={{ strokeDashoffset: c2 * (1 - activePct) }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.15 }}
            />
            {/* Created/backlog — cyan inner */}
            <motion.circle
              cx="50"
              cy="50"
              r={r3}
              fill="none"
              stroke="#22d3ee"
              strokeWidth={sw}
              strokeDasharray={c3}
              strokeLinecap="round"
              initial={{ strokeDashoffset: c3 }}
              animate={{ strokeDashoffset: c3 * (1 - backlogPct) }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            />
          </svg>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        className="bg-slate-800 border border-slate-600 text-slate-100 p-3 font-mono text-xs space-y-2"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
          <span className="text-slate-400">Completed</span>
          <span className="text-emerald-400 ml-4">
            {completed}/{total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />
          <span className="text-slate-400">Active</span>
          <span className="text-blue-400 ml-4">
            {active}/{total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" />
          <span className="text-slate-400">Created</span>
          <span className="text-cyan-400 ml-4">
            {backlog}/{total}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
