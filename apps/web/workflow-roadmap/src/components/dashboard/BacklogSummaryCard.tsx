import { getPriorityColor } from '@repo/app-component-library'
import type { DashboardResponse } from '../../store/roadmapApi'

type BacklogSummary = DashboardResponse['backlogSummary']

export function BacklogSummaryCard({ backlogSummary }: { backlogSummary: BacklogSummary }) {
  if (backlogSummary.totalOpen === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Backlog Health
      </h2>

      <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-100">{backlogSummary.totalOpen}</span>
          <span className="text-sm text-slate-400">open tasks</span>
        </div>

        {backlogSummary.byPriority.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              By Priority
            </p>
            <div className="space-y-1">
              {backlogSummary.byPriority.map(({ priority, count }) => (
                <div key={priority} className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono ${getPriorityColor(priority.toUpperCase(), 'text')}`}
                  >
                    {priority}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {backlogSummary.byType.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">By Type</p>
            <div className="space-y-1">
              {backlogSummary.byType.map(({ taskType, count }) => (
                <div key={taskType} className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">{taskType}</span>
                  <span className="text-xs font-mono text-slate-400">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
