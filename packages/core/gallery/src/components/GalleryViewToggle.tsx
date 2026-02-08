import { motion } from 'framer-motion'
import { LayoutGrid, Table } from 'lucide-react'
import { z } from 'zod'
import {
  cn,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  AppToggleGroup,
  AppToggleGroupItem,
} from '@repo/app-component-library'
import { ViewModeSchema } from '../types'

export const GalleryViewTogglePropsSchema = z.object({
  currentView: ViewModeSchema,
  onViewChange: z.function(z.tuple([ViewModeSchema]), z.void()),
  showFirstTimeHint: z.boolean().optional(),
  onDismissHint: z.function(z.tuple([]), z.void()).optional(),
  className: z.string().optional(),
  'data-testid': z.string().optional(),
})

export type GalleryViewToggleProps = z.infer<typeof GalleryViewTogglePropsSchema>

export function GalleryViewToggle({
  currentView,
  onViewChange,
  showFirstTimeHint = false,
  onDismissHint,
  className,
  'data-testid': testId = 'gallery-view-toggle',
}: GalleryViewToggleProps) {
  const handleViewChange = (value: string | undefined) => {
    if (value === 'grid' || value === 'datatable') {
      onViewChange(value)

      if (typeof window !== 'undefined' && 'scrollTo' in window) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      whileTap={{ scale: 0.97 }}
      className={cn('hidden md:flex items-center', className)}
      data-testid={testId}
    >
      <Tooltip open={showFirstTimeHint}>
        <TooltipTrigger asChild>
          <AppToggleGroup
            value={currentView}
            onValueChange={handleViewChange}
            aria-label="View mode selector"
            style="surface"
          >
            <AppToggleGroupItem value="grid" aria-label="Grid view">
              <LayoutGrid className="h-5 w-5" aria-hidden="true" />
            </AppToggleGroupItem>
            <AppToggleGroupItem value="datatable" aria-label="Table view">
              <Table className="h-5 w-5" aria-hidden="true" />
            </AppToggleGroupItem>
          </AppToggleGroup>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex items-center gap-2">
          <span>Try table view!</span>
          {onDismissHint ? (
            <button
              type="button"
              onClick={onDismissHint}
              className="ml-1 text-xs text-muted-foreground hover:text-accent-foreground"
              aria-label="Dismiss hint"
            >
              ×
            </button>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </motion.div>
  )
}
