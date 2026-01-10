/**
 * GalleryFilterBar Component
 * Filter bar with search input and view toggle
 */
import { z } from 'zod'
import { Search } from 'lucide-react'
import { Input } from '@repo/app-component-library'

const GalleryFilterBarPropsSchema = z.object({
  searchTerm: z.string(),
  onSearchChange: z.function(),
  children: z.any().optional(),
  className: z.string().optional(),
})

export type GalleryFilterBarProps = {
  searchTerm: string
  onSearchChange: (value: string) => void
  children?: React.ReactNode
  className?: string
}

/**
 * GalleryFilterBar Component
 * Provides search functionality and additional filter controls
 */
export function GalleryFilterBar({
  searchTerm,
  onSearchChange,
  children,
  className,
}: GalleryFilterBarProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6 ${
        className || ''
      }`}
    >
      {/* Search Input */}
      <div className="relative w-full sm:w-96">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search sets..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-10"
          aria-label="Search sets"
        />
      </div>

      {/* Additional Controls (View Toggle, etc) */}
      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </div>
  )
}

export default GalleryFilterBar