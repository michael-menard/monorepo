import { Outlet } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@repo/app-component-library'

interface MainAreaProps {
  className?: string
  isAuthenticated?: boolean
  isPageTransitioning?: boolean
  currentPath?: string
}

// Page transition variants
const pageTransitionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut' as const,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
}

/**
 * MainArea component - Central content area for the application shell
 *
 * This component handles:
 * - Content rendering with proper spacing and responsive behavior
 * - Page transitions and loading states
 * - Proper layout adjustments based on authentication state
 * - Consistent container styling across all pages
 */
export function MainArea({
  className,
  isAuthenticated = false,
  isPageTransitioning = false,
  currentPath = '/',
}: MainAreaProps) {
  return (
    <main
      className={cn(
        'flex-1 min-h-[calc(100vh-4rem)] overflow-auto transition-all duration-300',
        isAuthenticated && 'md:ml-64', // Account for sidebar width when authenticated (matches sidebar md:block)
        className,
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPath}
          variants={pageTransitionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="container mx-auto px-4 py-6 relative"
        >
          {/* Loading overlay during page transitions */}
          {isPageTransitioning ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10"
            >
              <div className="flex gap-2">
                {[...Array(3)].map((_, i) => (
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

          {/* Main content outlet */}
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </main>
  )
}

/**
 * MainAreaContainer - Wrapper for content that needs consistent spacing
 * Use this for pages that need standard container behavior
 */
export function MainAreaContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('space-y-6', className)}>{children}</div>
}

/**
 * MainAreaHeader - Standard header for pages within MainArea
 */
export function MainAreaHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  actions?: React.ReactNode
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
