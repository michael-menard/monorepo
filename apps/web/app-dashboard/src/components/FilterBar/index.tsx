/**
 * Filter Bar Component
 * Search input and theme filter dropdown
 */

import { Search, X } from 'lucide-react'
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
} from '@repo/app-component-library'

interface FilterBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedTheme: string
  onThemeChange: (value: string) => void
  themes: string[]
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedTheme,
  onThemeChange,
  themes,
}: FilterBarProps) {
  return (
    <div className="flex flex-1 items-center gap-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search MOCs..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-9 pr-9 h-10 w-full"
          aria-label="Search MOCs"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Theme Filter */}
      <Select value={selectedTheme} onValueChange={onThemeChange}>
        <SelectTrigger className="w-[180px] h-10" aria-label="Filter by theme">
          <SelectValue placeholder="All Themes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Themes</SelectItem>
          {themes.map(theme => (
            <SelectItem key={theme} value={theme}>
              {theme}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
