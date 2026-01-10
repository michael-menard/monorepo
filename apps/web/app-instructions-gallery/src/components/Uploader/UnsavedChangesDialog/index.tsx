/**
 * Story 3.1.9: Unsaved Changes Dialog
 *
 * Accessible confirmation dialog for navigation with unsaved changes.
 * Uses @repo/app-component-library AlertDialog components.
 */

import { useEffect, useRef } from 'react'
import {
  AppAlertDialog,
  AppAlertDialogAction,
  AppAlertDialogCancel,
  AppAlertDialogContent,
  AppAlertDialogDescription,
  AppAlertDialogFooter,
  AppAlertDialogHeader,
  AppAlertDialogTitle,
} from '@repo/app-component-library'

export interface UnsavedChangesDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when user chooses to stay */
  onStay: () => void
  /** Callback when user chooses to leave */
  onLeave: () => void
  /** Custom title (optional) */
  title?: string
  /** Custom description (optional) */
  description?: string
  /** Custom stay button text (optional) */
  stayButtonText?: string
  /** Custom leave button text (optional) */
  leaveButtonText?: string
}

/**
 * Accessible unsaved changes confirmation dialog.
 *
 * Features:
 * - Focus trap (handled by AlertDialog)
 * - Keyboard navigation (Escape to close, Tab to navigate)
 * - aria-labelledby and aria-describedby
 * - Semantic button labeling
 */
export function UnsavedChangesDialog({
  open,
  onStay,
  onLeave,
  title = 'Unsaved changes',
  description = 'You have unsaved changes that will be lost if you leave this page. Are you sure you want to leave?',
  stayButtonText = 'Stay on page',
  leaveButtonText = 'Leave page',
}: UnsavedChangesDialogProps) {
  // Ref for focus management
  const stayButtonRef = useRef<HTMLButtonElement>(null)

  // Focus the "Stay" button when dialog opens (safer default)
  useEffect(() => {
    if (open && stayButtonRef.current) {
      // Small delay to ensure dialog is mounted
      const timer = setTimeout(() => {
        stayButtonRef.current?.focus()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [open])

  return (
    <AppAlertDialog open={open} onOpenChange={isOpen => !isOpen && onStay()}>
      <AppAlertDialogContent
        aria-labelledby="unsaved-changes-title"
        aria-describedby="unsaved-changes-description"
      >
        <AppAlertDialogHeader>
          <AppAlertDialogTitle id="unsaved-changes-title">{title}</AppAlertDialogTitle>
          <AppAlertDialogDescription id="unsaved-changes-description">
            {description}
          </AppAlertDialogDescription>
        </AppAlertDialogHeader>
        <AppAlertDialogFooter>
          <AppAlertDialogCancel ref={stayButtonRef} onClick={onStay}>
            {stayButtonText}
          </AppAlertDialogCancel>
          <AppAlertDialogAction
            onClick={onLeave}
            className="bg-destructive hover:bg-destructive/90"
          >
            {leaveButtonText}
          </AppAlertDialogAction>
        </AppAlertDialogFooter>
      </AppAlertDialogContent>
    </AppAlertDialog>
  )
}
