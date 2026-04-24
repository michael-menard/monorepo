/**
 * ContentArea — Animated main content zone with page transitions.
 *
 * Extracted from main-app's MainArea component. Provides consistent
 * page transition animations and loading states across apps.
 */

import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../_lib/utils'

export interface ContentAreaProps {
  children: ReactNode
  className?: string
  /** Current route path, used as animation key for page transitions */
  currentPath?: string
  /** Whether a page transition is in progress (shows loading overlay) */
  isTransitioning?: boolean
  /** Whether to animate page transitions. Defaults to true. */
  animate?: boolean
  /** When true, content fills available viewport height via flex chain (no scroll on main, no container constraint) */
  fillViewport?: boolean
}

const pageTransitionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
}

export function ContentArea({
  children,
  className,
  currentPath = '/',
  isTransitioning = false,
  animate = true,
  fillViewport = false,
}: ContentAreaProps) {
  const mainClasses = fillViewport
    ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
    : 'flex-1 min-h-[calc(100vh-4rem)] overflow-auto transition-all duration-300'

  const innerClasses = fillViewport
    ? 'flex-1 min-h-0 flex flex-col px-6 pt-4 pb-12'
    : 'container mx-auto px-4 py-6 relative'

  if (!animate) {
    return (
      <main className={cn(mainClasses, className)}>
        <div className={innerClasses}>{children}</div>
      </main>
    )
  }

  return (
    <main className={cn(mainClasses, className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPath}
          variants={pageTransitionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={innerClasses}
        >
          {isTransitioning ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10"
            >
              <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="h-3 w-3 rounded-full bg-sky-500"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          ) : null}
          {children}
        </motion.div>
      </AnimatePresence>
    </main>
  )
}

/**
 * ContentSection — Standard spacing wrapper for page sections.
 */
export function ContentSection({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('space-y-6', className)}>{children}</div>
}

/**
 * ContentHeader — Standard page header within a content area.
 */
export function ContentHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          {Icon ? <Icon className="h-8 w-8 text-primary" /> : null}
          {title}
        </h1>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {description ? <p className="text-muted-foreground">{description}</p> : null}
    </div>
  )
}
