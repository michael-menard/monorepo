import { z } from 'zod'
import {
  QuotaTypeSchema,
  QuotaInfoSchema,
  QUOTA_DISPLAY_NAMES,
  type QuotaType,
  type QuotaInfo,
} from '@repo/api-client'
import { cn } from '../_lib/utils'
import { Progress } from '../_primitives/progress'

export { QuotaTypeSchema, QuotaInfoSchema, QUOTA_DISPLAY_NAMES }
export type { QuotaType, QuotaInfo }

/**
 * Units for each quota type
 */
const QUOTA_UNITS: Record<QuotaType, string> = {
  mocs: '',
  wishlists: '',
  galleries: '',
  setlists: '',
  storage: 'MB',
}

/**
 * Get percentage used for quota
 */
function getQuotaPercentage(quota: QuotaInfo): number {
  if (quota.limit === null) return 0 // Unlimited
  if (quota.limit === 0) return 100 // No quota (edge case)
  return Math.min(100, Math.round((quota.current / quota.limit) * 100))
}

/**
 * Get status color based on usage percentage
 */
function getQuotaStatus(percentage: number): 'normal' | 'warning' | 'critical' {
  if (percentage >= 90) return 'critical'
  if (percentage >= 75) return 'warning'
  return 'normal'
}

// ─────────────────────────────────────────────────────────────────────────
// QuotaIndicator Component
// ─────────────────────────────────────────────────────────────────────────

export const QuotaIndicatorPropsSchema = z.object({
  quotaType: z.custom<QuotaType>(val => QuotaTypeSchema.safeParse(val).success),
  quota: z.custom<QuotaInfo>(val => QuotaInfoSchema.safeParse(val).success),
  showLabel: z.boolean().optional(),
  compact: z.boolean().optional(),
  className: z.string().optional(),
})
export type QuotaIndicatorProps = z.infer<typeof QuotaIndicatorPropsSchema>

/**
 * QuotaIndicator Component
 *
 * Displays quota usage in text format like "3 / 5 MOCs" or "50 / 100 MB"
 *
 * @example
 * ```tsx
 * const { permissions } = usePermissions()
 *
 * <QuotaIndicator
 *   quotaType="mocs"
 *   quota={permissions.quotas.mocs}
 * />
 * // Renders: "3 / 5 MOCs"
 * ```
 *
 * @example
 * ```tsx
 * // Compact mode
 * <QuotaIndicator
 *   quotaType="storage"
 *   quota={permissions.quotas.storage}
 *   compact
 * />
 * // Renders: "50/100 MB"
 * ```
 */
export function QuotaIndicator({
  quotaType,
  quota,
  showLabel = true,
  compact = false,
  className,
}: QuotaIndicatorProps) {
  const label = QUOTA_DISPLAY_NAMES[quotaType]
  const unit = QUOTA_UNITS[quotaType]
  const percentage = getQuotaPercentage(quota)
  const status = getQuotaStatus(percentage)

  // Format the display text
  const limitText = quota.limit === null ? '\u221E' : quota.limit.toString() // ∞ for unlimited
  const separator = compact ? '/' : ' / '
  const unitSuffix = unit ? ` ${unit}` : ''

  const statusColors = {
    normal: 'text-foreground',
    warning: 'text-yellow-600 dark:text-yellow-400',
    critical: 'text-red-600 dark:text-red-400',
  }

  return (
    <span className={cn('inline-flex items-center gap-1', statusColors[status], className)}>
      {showLabel && !compact ? <span className="font-medium">{label}:</span> : null}
      <span className={compact ? 'text-sm' : ''}>
        {quota.current}
        {separator}
        {limitText}
        {unitSuffix}
      </span>
      {showLabel && compact ? <span className="text-xs text-muted-foreground">{label}</span> : null}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// QuotaBar Component
// ─────────────────────────────────────────────────────────────────────────

export const QuotaBarPropsSchema = z.object({
  quotaType: z.custom<QuotaType>(val => QuotaTypeSchema.safeParse(val).success),
  quota: z.custom<QuotaInfo>(val => QuotaInfoSchema.safeParse(val).success),
  showLabel: z.boolean().optional(),
  showText: z.boolean().optional(),
  size: z.enum(['sm', 'md', 'lg']).optional(),
  className: z.string().optional(),
})
export type QuotaBarProps = z.infer<typeof QuotaBarPropsSchema>

/**
 * QuotaBar Component
 *
 * Displays quota usage as a progress bar with optional label and text.
 *
 * @example
 * ```tsx
 * const { permissions } = usePermissions()
 *
 * <QuotaBar
 *   quotaType="storage"
 *   quota={permissions.quotas.storage}
 * />
 * // Renders: "Storage: [████░░░░░░] 50 / 100 MB"
 * ```
 *
 * @example
 * ```tsx
 * // Minimal display
 * <QuotaBar
 *   quotaType="mocs"
 *   quota={permissions.quotas.mocs}
 *   showLabel={false}
 *   showText={false}
 *   size="sm"
 * />
 * ```
 */
export function QuotaBar({
  quotaType,
  quota,
  showLabel = true,
  showText = true,
  size = 'md',
  className,
}: QuotaBarProps) {
  const label = QUOTA_DISPLAY_NAMES[quotaType]
  const unit = QUOTA_UNITS[quotaType]
  const percentage = getQuotaPercentage(quota)
  const status = getQuotaStatus(percentage)

  // Format the display text
  const limitText = quota.limit === null ? '\u221E' : quota.limit.toString()
  const unitSuffix = unit ? ` ${unit}` : ''

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  const statusColors = {
    normal: '[&>div]:bg-primary',
    warning: '[&>div]:bg-yellow-500',
    critical: '[&>div]:bg-red-500',
  }

  const textStatusColors = {
    normal: 'text-muted-foreground',
    warning: 'text-yellow-600 dark:text-yellow-400',
    critical: 'text-red-600 dark:text-red-400',
  }

  // For unlimited quotas, show a subtle indicator
  if (quota.limit === null) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {showLabel ? <span className="text-sm font-medium text-foreground">{label}</span> : null}
        <div className="flex items-center gap-2">
          <Progress value={0} className={cn('flex-1', sizeClasses[size])} />
          {showText ? (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {quota.current}
              {unitSuffix} used (unlimited)
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {showLabel ? (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {showText ? (
            <span className={cn('text-sm whitespace-nowrap', textStatusColors[status])}>
              {quota.current} / {limitText}
              {unitSuffix}
            </span>
          ) : null}
        </div>
      ) : null}
      {!showLabel && showText ? (
        <span className={cn('text-sm whitespace-nowrap', textStatusColors[status])}>
          {quota.current} / {limitText}
          {unitSuffix}
        </span>
      ) : null}
      <Progress
        value={percentage}
        className={cn('w-full', sizeClasses[size], statusColors[status])}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// QuotaCard Component
// ─────────────────────────────────────────────────────────────────────────

export const QuotaCardPropsSchema = z.object({
  quotaType: z.custom<QuotaType>(val => QuotaTypeSchema.safeParse(val).success),
  quota: z.custom<QuotaInfo>(val => QuotaInfoSchema.safeParse(val).success),
  className: z.string().optional(),
})
export type QuotaCardProps = z.infer<typeof QuotaCardPropsSchema>

/**
 * QuotaCard Component
 *
 * Displays quota usage in a card format with icon, label, and progress bar.
 * Useful for dashboard displays.
 *
 * @example
 * ```tsx
 * const { permissions } = usePermissions()
 *
 * <div className="grid grid-cols-2 gap-4">
 *   <QuotaCard quotaType="mocs" quota={permissions.quotas.mocs} />
 *   <QuotaCard quotaType="storage" quota={permissions.quotas.storage} />
 * </div>
 * ```
 */
export function QuotaCard({ quotaType, quota, className }: QuotaCardProps) {
  const label = QUOTA_DISPLAY_NAMES[quotaType]
  const unit = QUOTA_UNITS[quotaType]
  const percentage = getQuotaPercentage(quota)
  const status = getQuotaStatus(percentage)

  const limitText = quota.limit === null ? 'Unlimited' : quota.limit.toString()
  const unitSuffix = unit ? ` ${unit}` : ''

  const statusColors = {
    normal: 'border-border',
    warning: 'border-yellow-300 dark:border-yellow-700',
    critical: 'border-red-300 dark:border-red-700',
  }

  const progressColors = {
    normal: '[&>div]:bg-primary',
    warning: '[&>div]:bg-yellow-500',
    critical: '[&>div]:bg-red-500',
  }

  return (
    <div className={cn('rounded-lg border bg-card p-4 shadow-sm', statusColors[status], className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-card-foreground">{label}</span>
        {status === 'critical' && (
          <span className="text-xs text-red-600 dark:text-red-400 font-medium">Limit reached</span>
        )}
        {status === 'warning' && (
          <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
            Almost full
          </span>
        )}
      </div>
      <div className="mb-2">
        <span className="text-2xl font-bold text-card-foreground">{quota.current}</span>
        <span className="text-sm text-muted-foreground ml-1">
          / {limitText}
          {unitSuffix}
        </span>
      </div>
      {quota.limit !== null && (
        <Progress value={percentage} className={cn('h-2', progressColors[status])} />
      )}
      {quota.limit === null && (
        <div className="h-2 bg-muted rounded-full flex items-center justify-center">
          <span className="text-[8px] text-muted-foreground uppercase tracking-wider">
            Unlimited
          </span>
        </div>
      )}
    </div>
  )
}

// Export utilities
export { QUOTA_UNITS, getQuotaPercentage, getQuotaStatus }
