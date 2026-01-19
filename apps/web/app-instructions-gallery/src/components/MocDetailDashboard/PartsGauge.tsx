import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/app-component-library'
import { Blocks } from 'lucide-react'

interface PartsGaugeProps {
  partsOwned: number
  partsTotal: number
}

export function PartsGauge({ partsOwned, partsTotal }: PartsGaugeProps) {
  const percentage = partsTotal > 0 ? Math.round((partsOwned / partsTotal) * 100) : 0
  const circumference = 2 * Math.PI * 45

  const [animatedPercentage, setAnimatedPercentage] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage)
    }, 100)
    return () => clearTimeout(timer)
  }, [percentage])

  const strokeDashoffsetOwned = circumference - (animatedPercentage / 100) * circumference
  const strokeDashoffsetNeeded = circumference - ((100 - animatedPercentage) / 100) * circumference

  const partsNeeded = Math.max(0, partsTotal - partsOwned)

  return (
    <Card className="border-border transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Blocks className="h-4 w-4 text-sky-500" />
          Parts Collection Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="flex gap-4 flex-shrink-0">
            <div className="relative group cursor-default text-sky-500">
              <svg
                width="100"
                height="100"
                viewBox="0 0 120 120"
                className="-rotate-90 transition-transform duration-300 group-hover:scale-105"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  fill="none"
                  strokeWidth="10"
                  className="stroke-muted"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  stroke="currentColor"
                  className="transition-all duration-1000 ease-out"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffsetOwned}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-sky-500 transition-all duration-300">
                  {animatedPercentage}%
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">OWNED</span>
              </div>
            </div>

            <div className="relative group cursor-default text-teal-500">
              <svg
                width="100"
                height="100"
                viewBox="0 0 120 120"
                className="-rotate-90 transition-transform duration-300 group-hover:scale-105"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  fill="none"
                  strokeWidth="10"
                  className="stroke-muted"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  stroke="currentColor"
                  className="transition-all duration-1000 ease-out"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffsetNeeded}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-teal-500 transition-all duration-300">
                  {100 - animatedPercentage}%
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">NEEDED</span>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex justify-between items-center p-1.5 -mx-1.5 rounded-md transition-colors hover:bg-muted/50">
              <span className="text-sm text-muted-foreground">Parts Owned</span>
              <span className="text-sm font-semibold text-foreground">
                {partsOwned.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-1.5 -mx-1.5 rounded-md transition-colors hover:bg-muted/50">
              <span className="text-sm text-muted-foreground">Total Required</span>
              <span className="text-sm font-semibold text-foreground">
                {partsTotal.toLocaleString()}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between items-center p-1.5 -mx-1.5 rounded-md transition-colors hover:bg-muted/50">
              <span className="text-sm text-muted-foreground">Still Needed</span>
              <span
                className={`text-sm font-semibold ${
                  partsNeeded === 0 ? 'text-teal-500' : 'text-foreground'
                }`}
              >
                {partsNeeded === 0 ? 'Complete!' : partsNeeded.toLocaleString()}
              </span>
            </div>

            <div className="pt-1">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-sky-500 via-teal-400 to-emerald-400"
                  style={{ width: `${Math.min(100, animatedPercentage)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
