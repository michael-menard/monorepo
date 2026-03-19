import { getStoryStateColor } from '@repo/app-component-library'
import type { DashboardResponse } from '../../store/roadmapApi'

export function FlowHealthStrip({ flowHealth }: { flowHealth: DashboardResponse['flowHealth'] }) {
  const { totalStories, distribution, blockedCount } = flowHealth
  if (totalStories === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Flow Health
        </h2>
        <span className="text-xs font-mono text-slate-500">{totalStories} stories</span>
        {blockedCount > 0 && (
          <span className="text-xs font-mono text-red-400">{blockedCount} blocked</span>
        )}
      </div>

      <svg
        width="100%"
        height="28"
        viewBox="0 0 1000 28"
        preserveAspectRatio="none"
        className="rounded-md overflow-hidden"
      >
        {distribution
          .reduce<Array<{ state: string; count: number; x: number; width: number }>>(
            (acc, item) => {
              const prevEnd = acc.length > 0 ? acc[acc.length - 1].x + acc[acc.length - 1].width : 0
              const width = (item.count / totalStories) * 1000
              acc.push({ ...item, x: prevEnd, width })
              return acc
            },
            [],
          )
          .map(segment => (
            <rect
              key={segment.state}
              x={segment.x}
              y={0}
              width={segment.width}
              height={28}
              fill={getStoryStateColor(segment.state, 'hex')}
              opacity={0.85}
            >
              <title>{`${segment.state}: ${segment.count}`}</title>
            </rect>
          ))}
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {distribution.map(item => (
          <div key={item.state} className="flex items-center gap-1.5 text-xs">
            <div
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: getStoryStateColor(item.state, 'hex') }}
            />
            <span className="text-slate-400">{item.state}</span>
            <span className="text-slate-500 font-mono">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
