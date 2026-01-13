import * as React from 'react'
import { z } from 'zod'
import { motion, useMotionValue, animate } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../_primitives/card'
import { Button } from '../_primitives/button'
import { cn } from '../_lib/utils'

export const AppCounterCardPropsSchema = z.object({
  title: z.string().optional(),
  total: z.number().min(0),
  value: z.number(),
  step: z.number().positive().default(1).optional(),
  min: z.number().min(0).optional(),
  max: z.number().optional(),
  showFraction: z.boolean().optional(),
  showPercentageBar: z.boolean().optional(),
  showPercentageLabel: z.boolean().optional(),
  disableControls: z.boolean().optional(),
  animate: z.boolean().optional(),
  animationDurationMs: z.number().positive().optional(),
  ariaLabel: z.string().optional(),
})

export type AppCounterCardProps = z.infer<typeof AppCounterCardPropsSchema> & {
  icon?: React.ReactNode
  children?: React.ReactNode
  onChange?: (nextValue: number) => void
}

function AnimatedNumber({
  value,
  animateValue = true,
  durationMs = 400,
}: {
  value: number
  animateValue?: boolean
  durationMs?: number
}) {
  const motionValue = useMotionValue(value)
  const [displayValue, setDisplayValue] = React.useState(() => value.toLocaleString())

  React.useEffect(() => {
    if (!animateValue) {
      setDisplayValue(value.toLocaleString())
      motionValue.set(value)
      return
    }

    const controls = animate(motionValue, value, {
      duration: durationMs / 1000,
      ease: 'easeOut',
      onUpdate: latest => {
        setDisplayValue(Math.round(latest).toLocaleString())
      },
    })

    return () => {
      controls.stop()
    }
  }, [value, animateValue, durationMs, motionValue])

  return <span>{displayValue}</span>
}

export function AppCounterCard({
  title,
  icon,
  children,
  total,
  value,
  step = 1,
  min = 0,
  max,
  showFraction = true,
  showPercentageBar = true,
  showPercentageLabel = false,
  disableControls = false,
  animate = true,
  animationDurationMs = 400,
  ariaLabel,
  onChange,
}: AppCounterCardProps) {
  const resolvedMax = typeof max === 'number' ? max : total

  const clampedValue = React.useMemo(() => {
    return Math.min(resolvedMax, Math.max(min, value))
  }, [value, min, resolvedMax])

  const handleChange = (next: number) => {
    const clamped = Math.min(resolvedMax, Math.max(min, next))
    if (clamped === clampedValue) return
    if (onChange) {
      onChange(clamped)
    }
  }

  const percentage = React.useMemo(() => {
    if (total <= 0) return 0
    const ratio = clampedValue / total
    return Math.max(0, Math.min(100, Math.round(ratio * 100)))
  }, [clampedValue, total])

  const canDecrement = !disableControls && clampedValue > min
  const canIncrement = !disableControls && clampedValue < resolvedMax

  const regionLabel = ariaLabel || title || 'Counter'

  return (
    <Card
      role="region"
      aria-label={regionLabel}
      className={cn(
        'relative overflow-hidden border-vaporwave-border bg-vaporwave-bg backdrop-blur-sm',
      )}
    >
      {/* Grid pattern background */}
      <div className="absolute inset-0 opacity-20" aria-hidden="true">
        <div className="h-full w-full bg-[linear-gradient(rgba(255,0,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [transform:perspective(500px)_rotateX(60deg)] [transform-origin:center_top]" />
      </div>

      {/* Glowing orbs */}
      <div
        aria-hidden="true"
        className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-vaporwave-pink opacity-20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-vaporwave-cyan opacity-20 blur-3xl"
      />

      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        {title ? (
          <CardTitle className="text-sm font-medium text-vaporwave-text-muted uppercase tracking-wider font-mono">
            {title}
          </CardTitle>
        ) : null}
        {icon ? (
          <div className="h-8 w-8 rounded-lg bg-vaporwave-pink/20 flex items-center justify-center border border-vaporwave-pink/40 shadow-[0_0_15px_rgba(255,0,255,0.3)]">
            {icon}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="relative flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <motion.div
            className="text-5xl font-bold text-vaporwave-text font-mono tracking-tight [text-shadow:0_0_20px_rgba(0,255,255,0.5),0_0_40px_rgba(255,0,255,0.3)]"
            aria-live="polite"
          >
            <AnimatedNumber
              value={clampedValue}
              animateValue={animate}
              durationMs={animationDurationMs}
            />
          </motion.div>
          {showFraction ? (
            <span className="text-xl font-medium text-vaporwave-cyan font-mono">
              {clampedValue} / {total}
            </span>
          ) : null}
        </div>

        {showPercentageBar ? (
          <div className="flex flex-col gap-2">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-vaporwave-bg border border-vaporwave-border">
              <div
                className="h-full bg-gradient-to-r from-vaporwave-cyan to-vaporwave-pink transition-all duration-300 shadow-[0_0_10px_rgba(0,255,255,0.5)]"
                style={{ width: `${percentage}%` }}
                aria-hidden="true"
              />
            </div>
            {showPercentageLabel ? (
              <span className="text-xs font-mono text-vaporwave-text-muted">{percentage}%</span>
            ) : null}
          </div>
        ) : null}

        {!disableControls && (
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleChange(clampedValue - step)}
              disabled={!canDecrement}
              aria-label="Decrease count"
              className="h-8 w-8 rounded-lg border-vaporwave-cyan/40 bg-vaporwave-cyan/10 hover:bg-vaporwave-cyan/20 hover:border-vaporwave-cyan text-vaporwave-cyan transition-all shadow-[0_0_10px_rgba(0,255,255,0.2)] disabled:opacity-30"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleChange(clampedValue + step)}
              disabled={!canIncrement}
              aria-label="Increase count"
              className="h-8 w-8 rounded-lg border-vaporwave-pink/40 bg-vaporwave-pink/10 hover:bg-vaporwave-pink/20 hover:border-vaporwave-pink text-vaporwave-pink transition-all shadow-[0_0_10px_rgba(255,0,255,0.2)] disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {children ? (
          <div className="text-xs text-vaporwave-text-muted font-mono">{children}</div>
        ) : null}
      </CardContent>

      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-vaporwave-cyan to-transparent opacity-60"
      />
    </Card>
  )
}
