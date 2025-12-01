import { Skeleton } from '@repo/app-component-library'
import { cn } from '@repo/app-component-library'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * LEGO brand colors for the brick animation
 */
const LEGO_COLORS = [
  'bg-red-500', // LEGO Red
  'bg-blue-500', // LEGO Blue
  'bg-yellow-500', // LEGO Yellow
  'bg-green-500', // LEGO Green
] as const

/**
 * Animation variants for LEGO brick building effect
 */
const brickVariants = {
  initial: {
    scale: 0,
    y: -20,
    opacity: 0,
  },
  animate: (i: number) => ({
    scale: 1,
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 15,
      delay: i * 0.15,
    },
  }),
  bounce: (i: number) => ({
    y: [0, -8, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatDelay: 1.2,
      delay: i * 0.1,
      ease: 'easeInOut',
    },
  }),
}

/**
 * Container animation for fade-in effect
 */
const containerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
}

interface LoadingPageProps {
  /** Loading message to display */
  message?: string
  /** Show skeleton layout instead of centered animation */
  showSkeleton?: boolean
  /** Show animated dots after the message */
  showAnimatedDots?: boolean
  /** Size of the LEGO bricks */
  brickSize?: 'sm' | 'md' | 'lg'
}

/**
 * Loading page component with LEGO-themed animation.
 * Used as pendingComponent for lazy-loaded routes.
 *
 * Features:
 * - LEGO brick stacking animation with brand colors
 * - Accessible with aria-busy, role, and aria-live
 * - Optional skeleton layout for content loading
 * - Animated loading dots
 * - Smooth fade-in animation
 */
export function LoadingPage({
  message = 'Loading',
  showSkeleton = false,
  showAnimatedDots = true,
  brickSize = 'md',
}: LoadingPageProps) {
  if (showSkeleton) {
    return (
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="space-y-6"
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label={message}
      >
        {/* Page header skeleton */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Content skeleton with LEGO brick pattern */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="space-y-3"
            >
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </motion.div>
          ))}
        </div>

        {/* Loading indicator with LEGO bricks */}
        <div className="flex flex-col items-center justify-center gap-4 py-4">
          <LegoBrickAnimation size={brickSize} />
          <LoadingText message={message} showDots={showAnimatedDots} />
        </div>
      </motion.div>
    )
  }

  // Centered LEGO animation for full-page loading
  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-[50vh] flex flex-col items-center justify-center"
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label={message}
      >
        <div className="text-center space-y-6">
          {/* LEGO brick building animation */}
          <LegoBrickAnimation size={brickSize} />

          {/* Loading message */}
          <LoadingText message={message} showDots={showAnimatedDots} />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * LEGO brick stacking animation component
 */
interface LegoBrickAnimationProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LegoBrickAnimation({ size = 'md', className }: LegoBrickAnimationProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }

  return (
    <div className={cn('flex justify-center gap-2', className)} aria-hidden="true">
      {LEGO_COLORS.map((color, i) => (
        <motion.div
          key={i}
          custom={i}
          variants={brickVariants}
          initial="initial"
          animate={['animate', 'bounce']}
          className={cn(sizeClasses[size], 'rounded-lg shadow-lg relative', color)}
        >
          {/* LEGO stud detail */}
          <div className="absolute inset-x-0 top-0 flex justify-center">
            <div
              className={cn(
                'rounded-full bg-white/30 shadow-inner',
                size === 'sm' && 'h-2 w-2 -mt-0.5',
                size === 'md' && 'h-2.5 w-2.5 -mt-0.5',
                size === 'lg' && 'h-3 w-3 -mt-1',
              )}
            />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/**
 * Animated loading text with bouncing dots
 */
interface LoadingTextProps {
  message: string
  showDots?: boolean
  className?: string
}

export function LoadingText({ message, showDots = true, className }: LoadingTextProps) {
  return (
    <p className={cn('text-muted-foreground flex items-center gap-0.5', className)}>
      <span>{message}</span>
      {showDots ? (
        <span className="flex" aria-hidden="true">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              animate={{
                opacity: [0.3, 1, 0.3],
                y: [0, -2, 0],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            >
              .
            </motion.span>
          ))}
        </span>
      ) : null}
    </p>
  )
}

/**
 * Minimal loading skeleton for inline use
 */
export function LoadingSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-live="polite">
      <Skeleton className="h-6 w-48" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <span className="sr-only">Loading content...</span>
    </div>
  )
}
