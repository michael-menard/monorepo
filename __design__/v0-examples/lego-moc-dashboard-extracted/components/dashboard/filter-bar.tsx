"use client"

import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FilterBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedTheme: string
  onThemeChange: (theme: string) => void
  themes: string[]
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedTheme,
  onThemeChange,
  themes,
}: FilterBarProps) {
  const hasFilters = searchQuery || selectedTheme !== "all"

  const clearFilters = () => {
    onSearchChange("")
    onThemeChange("all")
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search MOCs..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-background border-border text-sm"
          />
        </div>

        {/* Theme Filter */}
        <Select value={selectedTheme} onValueChange={onThemeChange}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 bg-background border-border text-sm">
            <SelectValue placeholder="All Themes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Themes</SelectItem>
            {themes.map((theme) => (
              <SelectItem key={theme} value={theme}>
                {theme}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground self-start sm:self-auto"
        >
          <X className="h-3.5 w-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
