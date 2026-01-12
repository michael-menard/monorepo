"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Blocks, ImageIcon, FileText, File } from "lucide-react"

interface MocStatsCardProps {
  partsCount?: number
  galleryCount: number
  instructionsCount: number
  partsListsCount: number
}

export function MocStatsCard({ partsCount, galleryCount, instructionsCount, partsListsCount }: MocStatsCardProps) {
  const stats = [
    {
      label: "Parts",
      value: partsCount?.toLocaleString() ?? "—",
      icon: Blocks,
      color: "text-primary",
      bgColor: "bg-primary/10",
      hoverBg: "group-hover:bg-primary/20",
    },
    {
      label: "Photos",
      value: galleryCount,
      icon: ImageIcon,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      hoverBg: "group-hover:bg-emerald-500/20",
    },
    {
      label: "Instructions",
      value: instructionsCount,
      icon: FileText,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-500/10",
      hoverBg: "group-hover:bg-rose-500/20",
    },
    {
      label: "Parts Lists",
      value: partsListsCount,
      icon: File,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      hoverBg: "group-hover:bg-amber-500/20",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card
          key={stat.label}
          className="border-border group cursor-default transition-all duration-300 hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: `${index * 75}ms` }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${stat.bgColor} ${stat.hoverBg} transition-all duration-300 group-hover:scale-110`}
            >
              <stat.icon className={`h-5 w-5 ${stat.color} transition-transform duration-300`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground transition-colors">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
