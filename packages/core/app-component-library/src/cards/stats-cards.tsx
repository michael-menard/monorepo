/**
 * Stats Cards Component
 * Displays statistics as animated cards in a responsive grid
 */

import * as React from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import { Package, AlertCircle } from 'lucide-react'
import { Card } from '../_primitives/card'
import { cn } from '../_lib/utils'

/**
 * Individual stat item configuration
 */
export interface StatItem {
  /** Lucide icon component */
  icon: React.ElementType
  /** Display label for the stat */
  label: string
  /** Numeric value to display */
  value: number
  /** Tailwind color class for icon (e.g., 'text-red-500') */
  colorClass?: string
  /** Tailwind background class for icon container (e.g., 'bg-red-500/10') */
  bgClass?: string
}

export interface StatsCardsProps {
  /** Array of stat items to display */
  items: StatItem[]
  /** Show loading skeleton */
  isLoading?: boolean
  /** Error to display */
  error?: Error | null
  /** Custom empty state message */
  emptyTitle?: string
  /** Custom empty state description */
  emptyDescription?: string
  /** Custom error title */
  errorTitle?: string
  /** ARIA label for the stats region */
  ariaLabel?: string
  /** Additional class names for the container */
  className?: string
}

/**
 * Animated counter that smoothly counts up to the target value
 */
function AnimatedCounter({ value, delay = 0 }: { value: number; delay?: number }) {
  const count = useMotionValue(0)
  const [displayValue, setDisplayValue] = React.useState('0')

  React.useEffect(() => {
    const controls = animate(count, value, {
      duration: 0.8,
      delay,
      ease: 'easeOut',
      onUpdate: latest => {
        setDisplayValue(Math.round(latest).toLocaleString())
      },
    })

    return controls.stop
  }, [value, delay, count])

  return <span>{displayValue}</span>
}

interface StatCardConfig extends StatItem {
  ariaLabel: string
}

/**
 * Individual stat card with animation
 */
function StatCard({ config, index }: { config: StatCardConfig; index: number }) {
  const Icon = config.icon

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
      role="region"
      aria-label={config.ariaLabel}
      className="h-full"
    >
      <Card
        className={cn(
          'flex h-full flex-col gap-4 p-6 transition-all duration-200 ease-in-out',
          'hover:scale-[1.02] hover:shadow-lg cursor-default',
          'border border-border',
        )}
      >
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            config.bgClass || 'bg-primary/10',
          )}
        >
          <Icon
            className={cn('h-6 w-6', config.colorClass || 'text-primary')}
            aria-hidden="true"
          />
        </div>

        <div className="flex flex-col gap-1">
          <motion.div className="text-3xl font-bold leading-none" aria-live="polite">
            <AnimatedCounter value={config.value} delay={index * 0.1} />
          </motion.div>
          <h3 className="text-sm font-medium text-muted-foreground leading-none">{config.label}</h3>
        </div>
      </Card>
    </motion.article>
  )
}

/**
 * Loading skeleton for stats cards
 */
function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="flex h-full flex-col gap-4 p-6 animate-pulse">
          <div className="h-10 w-10 rounded-lg bg-muted" />
          <div className="flex flex-col gap-2">
            <div className="h-8 w-20 rounded bg-muted" />
            <div className="h-4 w-28 rounded bg-muted" />
          </div>
        </Card>
      ))}
    </>
  )
}

/**
 * Error state display
 */
function ErrorState({ error, title }: { error: Error; title: string }) {
  return (
    <Card className="col-span-full flex flex-col items-center justify-center gap-4 p-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    </Card>
  )
}

/**
 * Empty state when all values are zero
 */
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="col-span-full flex flex-col items-center justify-center gap-4 p-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
        <Package className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  )
}

/**
 * Displays statistics as animated cards in a responsive grid.
 *
 * Features:
 * - Animated counters with framer-motion
 * - Loading skeleton state
 * - Error state with message
 * - Empty state when all values are zero
 * - Responsive grid (1/2/3 columns)
 * - Accessible with ARIA labels
 *
 * @example
 * ```tsx
 * <StatsCards
 *   items={[
 *     { icon: Users, label: 'Total Users', value: 1234, colorClass: 'text-blue-500', bgClass: 'bg-blue-500/10' },
 *     { icon: ShoppingCart, label: 'Orders', value: 567 },
 *   ]}
 *   isLoading={false}
 * />
 * ```
 */
export function StatsCards({
  items,
  isLoading = false,
  error = null,
  emptyTitle = 'No data yet',
  emptyDescription = 'Data will appear here once available.',
  errorTitle = 'Unable to load statistics',
  ariaLabel = 'Statistics',
  className,
}: StatsCardsProps) {
  const isEmpty = !isLoading && !error && items.every(item => item.value === 0)

  const statCards: StatCardConfig[] = items.map(item => ({
    ...item,
    ariaLabel: `Statistic: ${item.label} - ${item.value.toLocaleString()}`,
  }))

  return (
    <div
      className={cn('grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3', className)}
      role="region"
      aria-label={ariaLabel}
    >
      {isLoading && <LoadingSkeleton count={items.length || 3} />}
      {!isLoading && error && <ErrorState error={error} title={errorTitle} />}
      {isEmpty && <EmptyState title={emptyTitle} description={emptyDescription} />}
      {!isLoading &&
        !error &&
        !isEmpty &&
        statCards.map((config, index) => (
          <StatCard key={config.label} config={config} index={index} />
        ))}
    </div>
  )
}
