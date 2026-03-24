import { useRef, useEffect, useState } from 'react'

const SIZE = 24
const STROKE_WIDTH = 2.5
const RADIUS = (SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function RefreshCountdown({
  intervalMs,
  lastCheckedAt,
  isFetching,
}: {
  intervalMs: number
  lastCheckedAt?: string
  isFetching: boolean
}) {
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    startRef.current = Date.now()
    setProgress(0)
  }, [lastCheckedAt])

  useEffect(() => {
    if (isFetching) {
      setProgress(1)
      return
    }

    const tick = () => {
      const elapsed = Date.now() - startRef.current
      const pct = Math.min(elapsed / intervalMs, 1)
      setProgress(pct)
      if (pct < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [intervalMs, isFetching, lastCheckedAt])

  const offset = CIRCUMFERENCE * (1 - progress)

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={isFetching ? 'animate-pulse' : ''}
        role="img"
        aria-label={isFetching ? 'Refreshing' : `Next refresh in ${Math.ceil((1 - progress) * intervalMs / 1000)}s`}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE_WIDTH}
          opacity={0.2}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#06b6d4"
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      {lastCheckedAt && (
        <span>
          {isFetching ? 'Refreshing\u2026' : `Last checked: ${new Date(lastCheckedAt).toLocaleTimeString()}`}
        </span>
      )}
    </div>
  )
}
