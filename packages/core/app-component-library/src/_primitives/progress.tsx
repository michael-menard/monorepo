import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '../_lib/utils'
import { getAriaAttributes, useUniqueId } from '../_lib/keyboard-navigation'

export interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  label?: string
  description?: string
  showValue?: boolean
  valueText?: string
  min?: number
  max?: number
}

function Progress({
  className,
  value,
  label,
  description,
  showValue = false,
  valueText,
  min = 0,
  max = 100,
  id,
  ...props
}: ProgressProps) {
  const uniqueId = useUniqueId('progress')
  const progressId = id || uniqueId
  const descriptionId = `${progressId}-description`

  const currentValue = value || 0
  const percentage = Math.round(((currentValue - min) / (max - min)) * 100)

  const ariaAttributes = getAriaAttributes({
    valueNow: currentValue,
    valueMin: min,
    valueMax: max,
    valueText: valueText || `${percentage}%`,
    describedBy: description ? descriptionId : undefined,
  })

  return (
    <div className="space-y-2">
      {label || showValue ? (
        <div className="flex items-center justify-between">
          {label ? (
            <label htmlFor={progressId} className="text-sm font-medium text-foreground">
              {label}
            </label>
          ) : null}
          {showValue ? (
            <span className="text-sm text-muted-foreground">{valueText || `${percentage}%`}</span>
          ) : null}
        </div>
      ) : null}

      <ProgressPrimitive.Root
        data-slot="progress"
        id={progressId}
        className={cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', className)}
        role="progressbar"
        aria-valuenow={currentValue}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={valueText || `${percentage}%`}
        aria-describedby={description ? descriptionId : undefined}
        {...ariaAttributes}
        {...props}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="bg-primary h-full w-full flex-1 transition-all"
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </ProgressPrimitive.Root>

      {description ? (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  )
}

export { Progress }
