"use client"

import { useState } from "react"
import { ArrowUpDown, ExternalLink } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { PartialMoc } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

interface PartsTableProps {
  data: PartialMoc[]
  isLoading?: boolean
}

export function PartsTable({ data, isLoading }: PartsTableProps) {
  const [sortAsc, setSortAsc] = useState(false)
  
  const sortedData = [...data].sort((a, b) => 
    sortAsc ? a.coverage - b.coverage : b.coverage - a.coverage
  )

  if (isLoading) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 md:px-6">
          <div className="h-5 md:h-6 w-24 md:w-28 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="space-y-2 md:space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 md:h-12 w-full bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border dark:backdrop-blur-sm dark:hover:border-primary/30 transition-all duration-200">
      <CardHeader className="pb-2 px-4 md:px-6">
        <CardTitle className="text-base md:text-lg font-semibold text-card-foreground">Needs Parts</CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6 overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs md:text-sm whitespace-nowrap">MOC Name</TableHead>
              <TableHead className="text-muted-foreground text-xs md:text-sm hidden sm:table-cell">Theme</TableHead>
              <TableHead className="text-muted-foreground text-xs md:text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium text-muted-foreground hover:text-card-foreground hover:bg-transparent text-xs md:text-sm"
                  onClick={() => setSortAsc(!sortAsc)}
                  aria-label={`Sort by coverage ${sortAsc ? 'descending' : 'ascending'}`}
                >
                  Coverage
                  <ArrowUpDown className="ml-1 h-3 w-3 md:h-3.5 md:w-3.5" aria-hidden="true" />
                </Button>
              </TableHead>
              <TableHead className="text-muted-foreground text-right text-xs md:text-sm hidden md:table-cell">Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((moc) => (
              <TableRow key={moc.id} className="border-border hover:bg-muted/50">
                <TableCell className="font-medium text-card-foreground text-xs md:text-sm py-2 md:py-4">
                  <span className="truncate block max-w-[120px] sm:max-w-none">{moc.name}</span>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs md:text-sm hidden sm:table-cell py-2 md:py-4">{moc.theme}</TableCell>
                <TableCell className="py-2 md:py-4">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <div className="relative h-1.5 md:h-2 w-12 md:w-20 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${
                          moc.coverage >= 70
                            ? "bg-[#2D5F4F] dark:bg-[#10b981]"
                            : moc.coverage >= 50
                            ? "bg-[#D4A574] dark:bg-[#f59e0b]"
                            : "bg-[#A85B4B] dark:bg-[#ef4444]"
                        }`}
                        style={{ width: `${moc.coverage}%` }}
                      />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-card-foreground whitespace-nowrap">{moc.coverage}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-xs md:text-sm hidden md:table-cell py-2 md:py-4">
                  {formatDistanceToNow(new Date(moc.lastUpdated), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="border-t border-border pt-3 md:pt-4 px-4 md:px-6">
        <Button 
          variant="ghost" 
          className="ml-auto gap-1 text-xs md:text-sm text-primary hover:text-primary/80 hover:bg-primary/10"
        >
          View All
          <ExternalLink className="h-3 w-3 md:h-3.5 md:w-3.5" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  )
}
