"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Minus } from "lucide-react"

interface VaporwaveCounterSimpleProps {
  title?: string
  initialValue?: number
  icon?: React.ReactNode
  step?: number
}

export function VaporwaveCounterSimple({
  title = "Total Count",
  initialValue = 0,
  icon,
  step = 1,
}: VaporwaveCounterSimpleProps) {
  const [count, setCount] = useState(initialValue)

  const increment = () => setCount((prev) => prev + step)
  const decrement = () => setCount((prev) => Math.max(0, prev - step))

  return (
    <Card className="relative overflow-hidden border-vaporwave-border bg-vaporwave-bg backdrop-blur-sm aspect-square flex flex-col max-w-xs">
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
        {icon && (
          <div className="h-8 w-8 rounded-lg bg-vaporwave-pink/20 flex items-center justify-center border border-vaporwave-pink/40 shadow-[0_0_15px_rgba(255,0,255,0.3)]">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="relative flex-1 flex flex-col items-center justify-center gap-6">
        <div className="text-8xl font-bold text-vaporwave-text font-mono tracking-tight [text-shadow:0_0_20px_rgba(0,255,255,0.5),0_0_40px_rgba(255,0,255,0.3)]">
          {count}
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={decrement}
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg border-vaporwave-cyan/40 bg-vaporwave-cyan/10 hover:bg-vaporwave-cyan/20 hover:border-vaporwave-cyan text-vaporwave-cyan transition-all shadow-[0_0_10px_rgba(0,255,255,0.2)]"
          >
            <Minus className="h-4 w-4" />
          </Button>

          <Button
            onClick={increment}
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg border-vaporwave-pink/40 bg-vaporwave-pink/10 hover:bg-vaporwave-pink/20 hover:border-vaporwave-pink text-vaporwave-pink transition-all shadow-[0_0_10px_rgba(255,0,255,0.2)]"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-vaporwave-cyan to-transparent opacity-60" />
    </Card>
  )
}
