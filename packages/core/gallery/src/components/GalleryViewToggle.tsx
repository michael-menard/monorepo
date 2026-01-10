import { motion } from 'framer-motion'
import { LayoutGrid, Table } from 'lucide-react'
import { z } from 'zod'
import { cn, Tooltip, TooltipContent, TooltipTrigger } from '@repo/app-component-library'

import { ViewModeSchema } from '../types'

export const GalleryViewTogglePropsSchema = z.object({
  currentView: ViewModeSchema,
  onViewChange: z.function().args(ViewModeSchema).returns(z.void()),
  showFirstTimeHint: z.boolean().optional(),
  onDismissHint: z.function().args().returns(z.void()).optional(),
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
          <div
            role="group"
            aria-label="View mode selector"
            className="inline-flex items-center gap-1 rounded-md bg-background/80 p-1 shadow-sm"
          >
            <button
              type="button"
              onClick={() => handleViewChange('grid')}
              aria-label="Grid view"
              aria-pressed={currentView === 'grid'}
              className={cn(
                'flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md',
                'text-muted-foreground hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                currentView === 'grid' && 'bg-accent text-accent-foreground',
              )}
            >
              <LayoutGrid className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('datatable')}
              aria-label="Table view"
              aria-pressed={currentView === 'datatable'}
              className={cn(
                'flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md',
                'text-muted-foreground hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                currentView === 'datatable' && 'bg-accent text-accent-foreground',
              )}
            >
              <Table className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
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