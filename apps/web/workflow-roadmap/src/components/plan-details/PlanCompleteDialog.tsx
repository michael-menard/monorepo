import { Loader2, CheckCircle2 } from 'lucide-react'
import {
  AppAlertDialog,
  AppAlertDialogContent,
  AppAlertDialogHeader,
  AppAlertDialogFooter,
  AppAlertDialogTitle,
  AppAlertDialogDescription,
  AppAlertDialogCancel,
  CustomButton,
} from '@repo/app-component-library'

export function PlanCompleteDialog({
  open,
  onOpenChange,
  planTitle,
  totalStories,
  nonTerminalCount,
  isCompleting,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  planTitle: string
  totalStories: number
  nonTerminalCount: number
  isCompleting: boolean
  onConfirm: () => void
}) {
  return (
    <AppAlertDialog open={open} onOpenChange={onOpenChange}>
      <AppAlertDialogContent className="max-w-lg">
        <AppAlertDialogHeader>
          <AppAlertDialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            Mark Plan Complete
          </AppAlertDialogTitle>
          <AppAlertDialogDescription>
            This will mark &ldquo;{planTitle}&rdquo; as <strong>implemented</strong> and set all
            associated stories to <strong>completed</strong>.
          </AppAlertDialogDescription>
        </AppAlertDialogHeader>

        <div className="space-y-3">
          {nonTerminalCount > 0 ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              <p className="text-sm text-emerald-300">
                <span className="font-semibold">{nonTerminalCount}</span>{' '}
                {nonTerminalCount === 1 ? 'story' : 'stories'} will be marked as completed.
              </p>
              {totalStories > nonTerminalCount && (
                <p className="text-xs text-slate-400 mt-1">
                  {totalStories - nonTerminalCount}{' '}
                  {totalStories - nonTerminalCount === 1 ? 'story is' : 'stories are'} already in a
                  terminal state and will not be changed.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              {totalStories === 0
                ? 'No stories are linked to this plan.'
                : 'All stories are already in a terminal state. The plan will be marked as implemented.'}
            </p>
          )}
        </div>

        <AppAlertDialogFooter>
          <AppAlertDialogCancel disabled={isCompleting}>Cancel</AppAlertDialogCancel>
          <CustomButton
            onClick={onConfirm}
            disabled={isCompleting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {isCompleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Completing...
              </>
            ) : (
              'Confirm Complete'
            )}
          </CustomButton>
        </AppAlertDialogFooter>
      </AppAlertDialogContent>
    </AppAlertDialog>
  )
}
