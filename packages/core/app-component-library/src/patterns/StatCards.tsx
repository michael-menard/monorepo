import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '../_primitives/card'
import { cn } from '../_lib/utils'
import type { StatCardsProps, StatCardItem } from './__types__'

/** Map column count to Tailwind grid class (static strings for Tailwind detection) */
const colsClass: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
}

function BasicStatCard({ item }: { item: StatCardItem }) {
  const Icon = item.icon
  return (
    <Card data-slot="stat-card" className="bg-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-3xl font-bold text-foreground">{item.value}</p>
            <p className="font-sans text-xs font-medium tracking-wide text-primary">{item.label}</p>
          </div>
          {Icon ? <Icon className="h-5 w-5 text-muted-foreground" /> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function TrendStatCard({ item }: { item: StatCardItem }) {
  return (
    <Card data-slot="stat-card">
      <CardContent className="p-4">
        <p className="font-sans text-sm text-muted-foreground">{item.label}</p>
        <div className="mt-1 flex items-end justify-between">
          <p className="font-mono text-2xl font-bold text-foreground">{item.value}</p>
          {item.change ? (
            <div
              className={cn(
                'flex items-center font-sans text-xs font-medium',
                item.trend === 'up' ? 'text-primary' : 'text-destructive',
              )}
            >
              {item.trend === 'up' ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {item.change}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function StatCards({ items, variant = 'basic', columns }: StatCardsProps) {
  const cols = columns ?? items.length
  const gridClass = colsClass[Math.min(cols, 6)] ?? 'md:grid-cols-4'

  return (
    <div
      data-slot="stat-cards"
      className={cn('grid grid-cols-2 gap-4', gridClass)}
      role="region"
      aria-label="Statistics"
    >
      {items.map(item =>
        variant === 'trend' ? (
          <TrendStatCard key={item.label} item={item} />
        ) : (
          <BasicStatCard key={item.label} item={item} />
        ),
      )}
    </div>
  )
}
