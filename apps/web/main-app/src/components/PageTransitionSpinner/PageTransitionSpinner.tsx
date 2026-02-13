import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@repo/app-component-library'
import { useAppSelector } from '@/store/hooks'
import { selectIsNavigating } from '@/store/slices/globalUISlice'
import { useDelayedShow } from '@repo/hooks/useDelayedShow'

/** Default delay threshold in milliseconds */
export const DEFAULT_SPINNER_DELAY = 300

export type PageTransitionSpinnerVariant = 'bar' | 'overlay'

export interface PageTransitionSpinnerProps {
  /**
   * The style variant for the spinner
   * - 'bar': Fixed progress bar at top of page (default, recommended)
   * - 'overlay': Centered overlay spinner with semi-transparent backdrop
   */
  variant?: PageTransitionSpinnerVariant
  /**
   * Delay in milliseconds before showing the spinner.
   * Prevents "flash" on fast navigations.
   * @default 300
   */
  delayMs?: number
  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * Page transition spinner that shows during route navigation.
 * Uses Redux global UI state (isNavigating) to determine visibility.
 * Includes a configurable delay threshold to prevent flash on fast navigations.
 *
 * @example
 * ```tsx
 * // In RootLayout.tsx - progress bar at top (default 300ms delay)
 * <PageTransitionSpinner />
 *
 * // With custom delay threshold
 * <PageTransitionSpinner delayMs={100} />
 *
 * // Or with overlay variant
 * <PageTransitionSpinner variant="overlay" />
 * ```
 */
export const PageTransitionSpinner = ({
  variant = 'bar',
  delayMs = DEFAULT_SPINNER_DELAY,
  className,
}: PageTransitionSpinnerProps) => {
  const isNavigating = useAppSelector(selectIsNavigating)
  const shouldShow = useDelayedShow(isNavigating, delayMs)

  if (variant === 'overlay') {
    return <OverlaySpinner isNavigating={shouldShow} className={className} />
  }

  return <ProgressBar isNavigating={shouldShow} className={className} />
}

/**
 * Progress bar style spinner - fixed at top of viewport
 */
const ProgressBar = ({
  isNavigating,
  className,
}: {
  isNavigating: boolean
  className?: string
}) => (
  <AnimatePresence>
    {isNavigating ? (
      <motion.div
        className={cn('fixed top-0 left-0 right-0 z-50 h-1 overflow-hidden', className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        data-testid="page-transition-bar"
        aria-hidden="true"
      >
        {/* Gradient background track */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5" />

        {/* Animated progress indicator */}
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-primary to-primary/70 shadow-sm shadow-primary/30"
          initial={{ x: '-100%', width: '30%' }}
          animate={{
            x: ['0%', '400%'],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.div>
    ) : null}
  </AnimatePresence>
)

/**
 * Overlay style spinner - centered with semi-transparent backdrop
 */
const OverlaySpinner = ({
  isNavigating,
  className,
}: {
  isNavigating: boolean
  className?: string
}) => (
  <AnimatePresence>
    {isNavigating ? (
      <motion.div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center',
          'bg-background/50 backdrop-blur-sm',
          className,
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        data-testid="page-transition-overlay"
        role="status"
        aria-label="Loading page"
      >
        {/* LEGO brick-inspired loading animation */}
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* LEGO brick stack animation */}
          <div className="flex gap-1.5">
            {['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'].map((color, i) => (
              <motion.div
                key={i}
                className={cn(
                  'h-6 w-6 rounded-md shadow-lg flex items-center justify-center',
                  color,
                )}
                animate={{
                  y: [0, -8, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: 'easeInOut',
                }}
              >
                {/* LEGO stud */}
                <div className="h-2.5 w-2.5 rounded-full bg-white/70 shadow-inner" />
              </motion.div>
            ))}
          </div>

          {/* Fallback spinner for accessibility */}
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />

          <span className="sr-only">Loading...</span>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
)

PageTransitionSpinner.displayName = 'PageTransitionSpinner'
