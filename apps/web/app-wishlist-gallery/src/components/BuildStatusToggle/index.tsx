/**
 * BuildStatusToggle Component
 *
 * Toggle for build status on owned collection items.
 * Supports optimistic updates, undo, and celebration animation.
 *
 * Story SETS-MVP-004: Build Status Toggle
 */

import { useState, useCallback } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Wrench, CheckCircle2 } from 'lucide-react'
import { Button } from '@repo/app-component-library'
import { BuildStatusSchema, type BuildStatus } from '@repo/api-client/schemas/wishlist'
import { useUpdateBuildStatusMutation } from '@repo/api-client/rtk/wishlist-gallery-api'

/**
 * BuildStatusToggle props schema (AC1-5)
 */
const BuildStatusTogglePropsSchema = z.object({
  itemId: z.string().uuid(),
  currentStatus: BuildStatusSchema.nullable(),
  itemTitle: z.string(),
  disabled: z.boolean().optional(),
})

type BuildStatusToggleProps = z.infer<typeof BuildStatusTogglePropsSchema>

/**
 * Build status display configuration
 */
const statusConfig: Record<
  string,
  { label: string; icon: typeof Package; colorClass: string; nextStatus: BuildStatus }
> = {
  not_started: {
    label: 'Not Started',
    icon: Package,
    colorClass: 'text-muted-foreground hover:text-foreground',
    nextStatus: 'in_progress',
  },
  in_progress: {
    label: 'Building',
    icon: Wrench,
    colorClass: 'text-amber-500 hover:text-amber-600',
    nextStatus: 'completed',
  },
  completed: {
    label: 'Built',
    icon: CheckCircle2,
    colorClass: 'text-emerald-500 hover:text-emerald-600',
    nextStatus: 'not_started',
  },
}

/**
 * Check if reduced motion is preferred
 */
function usePrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * BuildStatusToggle Component
 *
 * AC1: Renders on collection cards
 * AC2: Shows current state with label
 * AC3-5: Distinct visual states with icons and colors
 * AC6: Single click toggles state
 * AC7: Keyboard accessible (Enter/Space)
 * AC8: ARIA role="switch", aria-checked
 * AC12-14: Optimistic updates with error revert
 * AC15-17, AC29: Celebration animation with reduced motion support
 * AC18-20: Toast with undo
 * AC30: Toast durations (success 5000ms, error 7000ms)
 * AC31: No auto-retry
 * AC32: Disabled during API request
 */
export function BuildStatusToggle({
  itemId,
  currentStatus,
  itemTitle,
  disabled = false,
}: BuildStatusToggleProps) {
  const [showCelebration, setShowCelebration] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()

  const [updateBuildStatus, { isLoading }] = useUpdateBuildStatusMutation()

  const effectiveStatus = currentStatus ?? 'not_started'
  const config = statusConfig[effectiveStatus] ?? statusConfig.not_started
  const Icon = config.icon

  const handleToggle = useCallback(async () => {
    if (isLoading || disabled) return

    const previousStatus = effectiveStatus
    const newStatus = config.nextStatus

    try {
      await updateBuildStatus({ itemId, buildStatus: newStatus }).unwrap()

      // AC15-17, AC29: Celebration animation when toggling to completed
      if (newStatus === 'completed' && !prefersReducedMotion) {
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 1500)
      }

      // AC18-20, AC30: Success toast with undo (5000ms)
      const newConfig = statusConfig[newStatus]
      toast.success(`Marked as ${newConfig.label}`, {
        description: itemTitle,
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: () => {
            updateBuildStatus({ itemId, buildStatus: previousStatus })
          },
        },
      })
    } catch {
      // AC14, AC30: Error toast (7000ms) - optimistic revert handled by RTK
      toast.error("Couldn't update build status", {
        description: 'Please try again',
        duration: 7000,
      })
    }
  }, [
    isLoading,
    disabled,
    effectiveStatus,
    config.nextStatus,
    updateBuildStatus,
    itemId,
    prefersReducedMotion,
    itemTitle,
  ])

  return (
    <div className="relative inline-flex items-center">
      {/* AC8: ARIA switch role */}
      <Button
        variant="ghost"
        size="sm"
        role="switch"
        aria-checked={effectiveStatus === 'completed'}
        aria-label={`Build status: ${config.label}. Click to change.`}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation()
          handleToggle()
        }}
        onKeyDown={(e: React.KeyboardEvent) => {
          // AC7: Enter/Space triggers toggle
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            handleToggle()
          }
        }}
        disabled={isLoading || disabled}
        className={`gap-1.5 text-xs font-medium transition-colors ${config.colorClass}`}
        data-testid="build-status-toggle"
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {config.label}
      </Button>

      {/* AC15-16: Celebration animation */}
      <AnimatePresence>
        {showCelebration ? (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute -top-2 -right-2 pointer-events-none"
            aria-hidden="true"
          >
            <span className="text-lg">✨</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
