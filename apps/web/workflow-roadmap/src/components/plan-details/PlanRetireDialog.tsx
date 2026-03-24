import { AlertTriangle, GitBranch, Loader2 } from 'lucide-react'
import {
  AppAlertDialog,
  AppAlertDialogContent,
  AppAlertDialogHeader,
  AppAlertDialogFooter,
  AppAlertDialogTitle,
  AppAlertDialogDescription,
  AppAlertDialogAction,
  AppAlertDialogCancel,
  CustomButton,
} from '@repo/app-component-library'
import type { PlanImpact } from '../../store/roadmapApi'

export function PlanRetireDialog({
  open,
  onOpenChange,
  action,
  planTitle,
  impact,
  isLoadingImpact,
  isRetiring,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: 'delete' | 'supersede'
  planTitle: string
  impact: PlanImpact | undefined
  isLoadingImpact: boolean
  isRetiring: boolean
  onConfirm: () => void
}) {
  const isDelete = action === 'delete'
  const actionLabel = isDelete ? 'Delete' : 'Supersede'
  const hasExclusive = (impact?.exclusiveStories.length ?? 0) > 0
  const hasShared = (impact?.sharedStories.length ?? 0) > 0
  const hasDownstream = (impact?.downstreamPlans.length ?? 0) > 0

  return (
    <AppAlertDialog open={open} onOpenChange={onOpenChange}>
      <AppAlertDialogContent variant="destructive" className="max-w-lg">
        <AppAlertDialogHeader>
          <AppAlertDialogTitle>{actionLabel} Plan</AppAlertDialogTitle>
          <AppAlertDialogDescription>
            {isDelete
              ? `This will soft-delete "${planTitle}". It will no longer appear in the roadmap.`
              : `This will mark "${planTitle}" as superseded.`}
          </AppAlertDialogDescription>
        </AppAlertDialogHeader>

        {isLoadingImpact ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-400">Analyzing impact...</span>
          </div>
        ) : impact ? (
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {hasExclusive && (
              <div>
                <h4 className="text-sm font-medium text-red-400 mb-1">
                  Stories that will be cancelled ({impact.exclusiveStories.length})
                </h4>
                <ul className="space-y-1">
                  {impact.exclusiveStories.map(s => (
                    <li
                      key={s.storyId}
                      className="text-xs text-slate-400 flex items-center gap-1.5"
                    >
                      <span className="font-mono text-slate-500">{s.storyId}</span>
                      <span className="truncate">{s.title}</span>
                      {s.hasActiveWorktree && (
                        <GitBranch
                          className="h-3 w-3 text-amber-400 shrink-0"
                          title="Has active worktree"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hasShared && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-1">
                  Stories kept (linked to other plans) ({impact.sharedStories.length})
                </h4>
                <ul className="space-y-1">
                  {impact.sharedStories.map(s => (
                    <li key={s.storyId} className="text-xs text-slate-400">
                      <span className="font-mono text-slate-500">{s.storyId}</span>{' '}
                      <span className="truncate">{s.title}</span>
                      <span className="text-slate-600">
                        {' '}
                        — also in {s.otherPlanSlugs.join(', ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hasDownstream && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <h4 className="text-sm font-medium text-red-400 flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Downstream plans will remain blocked
                </h4>
                <ul className="space-y-1">
                  {impact.downstreamPlans.map(p => (
                    <li key={p.planSlug} className="text-xs text-red-300/70">
                      <span className="font-mono">{p.planSlug}</span> — {p.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!hasExclusive && !hasShared && !hasDownstream && (
              <p className="text-sm text-slate-400">
                No stories or downstream plans will be affected.
              </p>
            )}
          </div>
        ) : null}

        <AppAlertDialogFooter>
          <AppAlertDialogCancel disabled={isRetiring}>Cancel</AppAlertDialogCancel>
          <AppAlertDialogAction asChild>
            <CustomButton
              variant="destructive"
              onClick={onConfirm}
              disabled={isLoadingImpact || isRetiring}
            >
              {isRetiring ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  {actionLabel === 'Delete' ? 'Deleting...' : 'Superseding...'}
                </>
              ) : (
                `Confirm ${actionLabel}`
              )}
            </CustomButton>
          </AppAlertDialogAction>
        </AppAlertDialogFooter>
      </AppAlertDialogContent>
    </AppAlertDialog>
  )
}
