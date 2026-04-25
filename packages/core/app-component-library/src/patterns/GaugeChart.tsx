import { Badge } from '../_primitives/badge'
import { cn } from '../_lib/utils'
import type { GaugeChartProps } from './__types__'

const ARC_LENGTH = 126

const sizeConfig = {
  sm: {
    container: 'w-20 h-10',
    strokeWidth: '10',
    textSize: 'text-lg',
    mt: '-mt-1',
  },
  md: {
    container: 'w-32 h-16',
    strokeWidth: '8',
    textSize: 'text-2xl',
    mt: '-mt-2',
  },
  lg: {
    container: 'w-48 h-24',
    strokeWidth: '6',
    textSize: 'text-3xl',
    mt: '-mt-3',
  },
} as const

export function GaugeChart({
  value,
  label,
  color = 'var(--primary)',
  size = 'md',
  status,
}: GaugeChartProps) {
  const cfg = sizeConfig[size]
  const dashLength = (value / 100) * ARC_LENGTH

  return (
    <div data-slot="gauge-chart" className="flex flex-col items-center">
      <div className={cn('relative overflow-hidden', cfg.container)}>
        <svg viewBox="0 0 100 50" className="h-full w-full">
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="var(--muted)"
            strokeWidth={cfg.strokeWidth}
            strokeLinecap="round"
          />
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={color}
            strokeWidth={cfg.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dashLength} ${ARC_LENGTH}`}
          />
        </svg>
      </div>
      <p className={cn('font-mono font-bold text-foreground', cfg.textSize, cfg.mt)}>{value}%</p>
      {status ? (
        <Badge
          className={cn(
            'mt-2 border',
            color === 'var(--primary)'
              ? 'border-primary/30 bg-primary/20 text-primary'
              : color === 'var(--chart-3)'
                ? 'border-chart-3/30 bg-chart-3/20 text-chart-3'
                : color === 'var(--destructive)'
                  ? 'border-destructive/30 bg-destructive/20 text-destructive'
                  : 'border-primary/30 bg-primary/20 text-primary',
          )}
        >
          {status}
        </Badge>
      ) : (
        <p className="font-sans text-xs text-muted-foreground">{label}</p>
      )}
    </div>
  )
}
