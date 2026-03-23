import { logger } from '@repo/logger'

export class ProgressTracker {
  private current = 0
  private readonly total: number
  private readonly label: string
  private startTime: number

  constructor(total: number, label = 'Progress') {
    this.total = total
    this.label = label
    this.startTime = Date.now()
  }

  tick(detail: string): void {
    this.current++
    const pct = Math.round((this.current / this.total) * 100)
    const elapsed = Date.now() - this.startTime
    const avgMs = elapsed / this.current
    const remaining = Math.round((avgMs * (this.total - this.current)) / 1000)

    const msg = `[${this.current}/${this.total}] (${pct}%) ${detail}`
    const eta = this.current < this.total ? ` — ETA: ${formatDuration(remaining)}` : ' — Done!'

    logger.info(`${this.label}: ${msg}${eta}`)
  }

  getCurrent(): number {
    return this.current
  }

  getTotal(): number {
    return this.total
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60
  return `${hours}h ${remainMins}m`
}
