"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

interface VaporwaveCounterCardProps {
  title?: string
  value?: number
  increment?: number
  interval?: number
  suffix?: string
  icon?: React.ReactNode
  trend?: "up" | "down" | "neutral"
}

export function VaporwaveCounterCard({
  title = "Active Users",
  value = 0,
  increment = 1,
  interval = 2000,
  suffix = "",
  icon,
  trend = "up",
}: VaporwaveCounterCardProps) {
  const [count, setCount] = useState(value)

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((prev) => prev + increment)
    }, interval)

    return () => clearInterval(timer)
  }, [increment, interval])

  return (
    <Card className="relative overflow-hidden border-vaporwave-border bg-vaporwave-bg backdrop-blur-sm">
      {/* Grid pattern background */}
      <div className="absolute inset-0 opacity-20">
        <div className="h-full w-full bg-[linear-gradient(rgba(255,0,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [transform:perspective(500px)_rotateX(60deg)] [transform-origin:center_top]" />
      </div>

      {/* Glowing orbs */}
      <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-vaporwave-pink opacity-20 blur-3xl" />
      <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-vaporwave-cyan opacity-20 blur-3xl" />

      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-vaporwave-text-muted uppercase tracking-wider font-mono">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-lg bg-vaporwave-pink/20 flex items-center justify-center border border-vaporwave-pink/40 shadow-[0_0_15px_rgba(255,0,255,0.3)]">
          {icon || <TrendingUp className="h-4 w-4 text-vaporwave-pink" />}
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-baseline gap-2">
          <div className="text-5xl font-bold text-vaporwave-text font-mono tracking-tight [text-shadow:0_0_20px_rgba(0,255,255,0.5),0_0_40px_rgba(255,0,255,0.3)]">
            {count.toLocaleString()}
          </div>
          {suffix && <span className="text-xl font-medium text-vaporwave-cyan font-mono">{suffix}</span>}
        </div>
        {trend !== "neutral" && (
          <p className="mt-3 flex items-center gap-1 text-xs text-vaporwave-text-muted font-mono">
            <span className={`flex items-center ${trend === "up" ? "text-vaporwave-cyan" : "text-vaporwave-pink"}`}>
              {trend === "up" ? "↗" : "↘"} +{increment * 10}%
            </span>
            <span>from last hour</span>
          </p>
        )}
      </CardContent>

      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-vaporwave-cyan to-transparent opacity-60" />
    </Card>
  )
}
