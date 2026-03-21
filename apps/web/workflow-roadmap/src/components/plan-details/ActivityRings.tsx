import { motion } from 'framer-motion'
import { Tooltip, TooltipTrigger, TooltipContent } from '@repo/app-component-library'

export interface StoryStats {
  total: number
  completed: number
  reviewed: number
  ready: number
}

const rings = [
  {
    key: 'completed',
    label: 'Completed',
    color: '#7eb8c9',
    dotClass: 'bg-[#7eb8c9]',
    textClass: 'text-[#7eb8c9]',
  },
  {
    key: 'reviewed',
    label: 'Reviewed',
    color: '#5a4a6b',
    dotClass: 'bg-[#5a4a6b]',
    textClass: 'text-[#5a4a6b]',
  },
  {
    key: 'ready',
    label: 'Ready',
    color: '#3d5a6e',
    dotClass: 'bg-[#3d5a6e]',
    textClass: 'text-[#3d5a6e]',
  },
  {
    key: 'created',
    label: 'Created',
    color: '#2a3a4a',
    dotClass: 'bg-[#2a3a4a]',
    textClass: 'text-[#2a3a4a]',
  },
] as const

export function ActivityRings({ stats }: { stats: StoryStats }) {
  const { total, completed, reviewed, ready } = stats

  // Cumulative funnel: each ring includes all stages beyond it
  const cumulativeCounts = {
    completed,
    reviewed: reviewed + completed,
    ready: ready + reviewed + completed,
    created: total,
  }

  const pcts = Object.fromEntries(
    Object.entries(cumulativeCounts).map(([k, v]) => [k, total > 0 ? v / total : 0]),
  ) as Record<string, number>

  const sw = 7
  const gap = 3
  const rOuter = 46
  const radii = rings.map((_, i) => rOuter - i * (sw + gap))
  const circumferences = radii.map(r => 2 * Math.PI * r)

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
            {radii.map((r, i) => (
              <circle
                key={`track-${i}`}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="#060f1e"
                strokeWidth={sw}
              />
            ))}
            {/* Progress rings */}
            {rings.map((ring, i) => (
              <motion.circle
                key={ring.key}
                cx="50"
                cy="50"
                r={radii[i]}
                fill="none"
                stroke={ring.color}
                strokeWidth={sw}
                strokeDasharray={circumferences[i]}
                strokeLinecap="round"
                initial={{ strokeDashoffset: circumferences[i] }}
                animate={{ strokeDashoffset: circumferences[i] * (1 - (pcts[ring.key] ?? 0)) }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: i * 0.1 }}
              />
            ))}
          </svg>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        className="bg-slate-800 border border-slate-600 text-slate-100 p-3 font-mono text-xs space-y-1.5"
      >
        {rings.map(ring => (
          <div key={ring.key} className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${ring.dotClass} inline-block`} />
            <span className="text-slate-400">{ring.label}</span>
            <span className={`${ring.textClass} ml-auto tabular-nums`}>
              {cumulativeCounts[ring.key as keyof typeof cumulativeCounts]}/{total}
            </span>
          </div>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}
