"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Blocks } from "lucide-react"

interface MocPartsGaugeProps {
  partsOwned: number
  partsTotal: number
}

export function MocPartsGauge({ partsOwned, partsTotal }: MocPartsGaugeProps) {
  const percentage = partsTotal > 0 ? Math.round((partsOwned / partsTotal) * 100) : 0
  const circumference = 2 * Math.PI * 45 // radius = 45

  const [animatedPercentage, setAnimatedPercentage] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage)
    }, 100)
    return () => clearTimeout(timer)
  }, [percentage])

  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference
  const stillNeededPercentage = 100 - percentage
  const stillNeededOffset = circumference - (stillNeededPercentage / 100) * circumference

  const partsNeeded = Math.max(0, partsTotal - partsOwned)

  return (
    <Card className="border-border transition-all duration-300 hover:shadow-md animate-in fade-in slide-in-from-bottom-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Blocks className="h-4 w-4 text-primary" />
          Parts Collection Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="flex gap-4 flex-shrink-0">
            {/* Owned Gauge */}
            <div className="relative group cursor-default">
              <svg
                width="100"
                height="100"
                viewBox="0 0 120 120"
                className="-rotate-90 transition-transform duration-300 group-hover:scale-105"
              >
                <defs>
                  <linearGradient id="vaporwaveGradientOwned" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff6ad5" />
                    <stop offset="50%" stopColor="#00d4ff" />
                    <stop offset="100%" stopColor="#7dffb3" />
                  </linearGradient>
                </defs>
                {/* Background circle */}
                <circle cx="60" cy="60" r="45" fill="none" strokeWidth="10" className="stroke-muted" />
                {/* Progress circle with vaporwave gradient */}
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  stroke="url(#vaporwaveGradientOwned)"
                  className="transition-all duration-1000 ease-out"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`text-xl font-bold bg-gradient-to-r from-[#ff6ad5] via-[#00d4ff] to-[#7dffb3] bg-clip-text text-transparent transition-all duration-300 ${percentage >= 100 ? "animate-pulse" : ""}`}
                >
                  {animatedPercentage}%
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">OWNED</span>
              </div>
            </div>

            {/* Still Needed Gauge */}
            <div className="relative group cursor-default">
              <svg
                width="100"
                height="100"
                viewBox="0 0 120 120"
                className="-rotate-90 transition-transform duration-300 group-hover:scale-105"
              >
                <defs>
                  <linearGradient id="vaporwaveGradientNeeded" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7dffb3" />
                    <stop offset="50%" stopColor="#00d4ff" />
                    <stop offset="100%" stopColor="#ff6ad5" />
                  </linearGradient>
                </defs>
                {/* Background circle */}
                <circle cx="60" cy="60" r="45" fill="none" strokeWidth="10" className="stroke-muted" />
                {/* Progress circle with reverse vaporwave gradient */}
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  stroke="url(#vaporwaveGradientNeeded)"
                  className="transition-all duration-1000 ease-out"
                  strokeDasharray={circumference}
                  strokeDashoffset={stillNeededOffset}
                />
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`text-xl font-bold bg-gradient-to-r from-[#7dffb3] via-[#00d4ff] to-[#ff6ad5] bg-clip-text text-transparent transition-all duration-300 ${partsNeeded === 0 ? "animate-pulse" : ""}`}
                >
                  {100 - animatedPercentage}%
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">NEEDED</span>
              </div>
            </div>
          </div>

          {/* Stats with hover highlights */}
          <div className="flex-1 space-y-3">
            <div className="flex justify-between items-center p-1.5 -mx-1.5 rounded-md transition-colors hover:bg-muted/50">
              <span className="text-sm text-muted-foreground">Parts Owned</span>
              <span className="text-sm font-semibold text-foreground">{partsOwned.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-1.5 -mx-1.5 rounded-md transition-colors hover:bg-muted/50">
              <span className="text-sm text-muted-foreground">Total Required</span>
              <span className="text-sm font-semibold text-foreground">{partsTotal.toLocaleString()}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between items-center p-1.5 -mx-1.5 rounded-md transition-colors hover:bg-muted/50">
              <span className="text-sm text-muted-foreground">Still Needed</span>
              <span
                className={`text-sm font-semibold ${partsNeeded === 0 ? "bg-gradient-to-r from-[#7dffb3] to-[#00d4ff] bg-clip-text text-transparent" : "text-foreground"}`}
              >
                {partsNeeded === 0 ? "Complete!" : partsNeeded.toLocaleString()}
              </span>
            </div>

            <div className="pt-1">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${Math.min(100, animatedPercentage)}%`,
                    background: "linear-gradient(90deg, #ff6ad5, #00d4ff, #7dffb3)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
