"use client"

import { Blocks } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Blocks className="h-4 w-4 md:h-6 md:w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base md:text-xl font-bold text-foreground">BrickVault</h1>
            <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">MOC Collection Dashboard</p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
