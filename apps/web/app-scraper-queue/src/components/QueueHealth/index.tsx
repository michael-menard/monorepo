import { AlertTriangle, Activity, Timer } from 'lucide-react'
import { Card, CardContent, Badge, cn } from '@repo/app-component-library'
import { useGetQueueHealthQuery } from '@repo/api-client/rtk/scraper-api'

const TYPE_LABELS: Record<string, string> = {
  'bricklink-minifig': 'BL Minifig',
  'bricklink-catalog': 'BL Catalog',
  'bricklink-prices': 'BL Prices',
  'lego-set': 'LEGO Set',
  'rebrickable-set': 'RB Set',
  'rebrickable-mocs': 'RB MOCs',
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

export function QueueHealth() {
  const { data, isLoading } = useGetQueueHealthQuery(undefined, {
    pollingInterval: 10000,
  })

  if (isLoading || !data) return null

  const queues = data.queues
  const rateLimitedQueues = queues.filter(q => q.rateLimiter?.isLimited)

  return (
    <div className="space-y-2">
      {rateLimitedQueues.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700">
          <Timer className="h-4 w-4 shrink-0" />
          <span className="text-sm">
            Rate limited:{' '}
            {rateLimitedQueues
              .map(q => {
                const label = TYPE_LABELS[q.name] ?? q.name
                const resets = q.rateLimiter?.resetsInSeconds
                return resets ? `${label} (resumes in ${formatDuration(resets)})` : label
              })
              .join(', ')}
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {queues.map(queue => {
          const total = queue.waiting + queue.active + queue.delayed
          const hasActivity = total > 0
          const isBroken = queue.circuitBreaker.isOpen
          const isLimited = queue.rateLimiter?.isLimited

          return (
            <Card
              key={queue.name}
              className={cn(
                'transition-colors',
                isBroken && 'border-red-500/50 bg-red-500/5',
                isLimited && !isBroken && 'border-amber-500/50 bg-amber-500/5',
              )}
            >
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">
                    {TYPE_LABELS[queue.name] ?? queue.name}
                  </span>
                  {isBroken ? (
                    <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                  ) : isLimited ? (
                    <Timer className="h-3 w-3 text-amber-500 shrink-0" />
                  ) : hasActivity ? (
                    <Activity className="h-3 w-3 text-blue-500 shrink-0" />
                  ) : null}
                </div>

                <div className="flex gap-1 flex-wrap">
                  {queue.waiting > 0 && (
                    <Badge variant="outline" className="text-xs py-0">
                      {queue.waiting} waiting
                    </Badge>
                  )}
                  {queue.active > 0 && (
                    <Badge className="text-xs py-0 bg-blue-500/10 text-blue-600">
                      {queue.active} active
                    </Badge>
                  )}
                  {queue.delayed > 0 && (
                    <Badge variant="outline" className="text-xs py-0 text-purple-600">
                      {queue.delayed} delayed
                    </Badge>
                  )}
                  {queue.failed > 0 && (
                    <Badge variant="outline" className="text-xs py-0 text-red-600">
                      {queue.failed} failed
                    </Badge>
                  )}
                  {!hasActivity && queue.failed === 0 && (
                    <span className="text-xs text-muted-foreground">Idle</span>
                  )}
                </div>

                {isBroken && queue.circuitBreaker.reason && (
                  <p className="text-xs text-red-500 truncate">{queue.circuitBreaker.reason}</p>
                )}
                {isLimited && queue.rateLimiter?.resetsInSeconds && (
                  <p className="text-xs text-amber-600">
                    Resumes in {formatDuration(queue.rateLimiter.resetsInSeconds)}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
