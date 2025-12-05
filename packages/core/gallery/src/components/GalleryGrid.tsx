import { cn } from '@repo/app-component-library'

/**
 * Column configuration for responsive breakpoints
 */
export interface GalleryGridColumns {
  /** Number of columns on small screens (default: 1) */
  sm?: number
  /** Number of columns on medium screens (default: 2) */
  md?: number
  /** Number of columns on large screens (default: 3) */
  lg?: number
  /** Number of columns on extra-large screens (default: 4) */
  xl?: number
}

/**
 * Props for the GalleryGrid component
 */
export interface GalleryGridProps {
  /** Child elements to render in the grid */
  children: React.ReactNode
  /** Custom column configuration per breakpoint */
  columns?: GalleryGridColumns
  /** Gap size using Tailwind spacing scale (default: 4) */
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12
  /** Additional CSS classes */
  className?: string
  /** Test ID for testing purposes */
  'data-testid'?: string
}

/** Maps column count to Tailwind grid-cols class */
const columnClassMap: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
}

/** Maps gap value to Tailwind gap class */
const gapClassMap: Record<number, string> = {
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
}

/**
 * Generates responsive grid column classes based on configuration
 */
const getColumnClasses = (columns: GalleryGridColumns): string => {
  const { sm = 1, md = 2, lg = 3, xl = 4 } = columns

  const classes: string[] = []

  // Base (smallest) - use sm value
  classes.push(columnClassMap[sm] ?? 'grid-cols-1')

  // sm breakpoint
  if (sm !== md) {
    classes.push(`sm:${columnClassMap[md] ?? 'grid-cols-2'}`)
  }

  // lg breakpoint
  if (md !== lg) {
    classes.push(`lg:${columnClassMap[lg] ?? 'grid-cols-3'}`)
  }

  // xl breakpoint
  if (lg !== xl) {
    classes.push(`xl:${columnClassMap[xl] ?? 'grid-cols-4'}`)
  }

  return classes.join(' ')
}

/**
 * A responsive gallery grid component for displaying items in a CSS Grid layout.
 *
 * @example
 * ```tsx
 * <GalleryGrid>
 *   {items.map(item => (
 *     <GalleryCard key={item.id} {...item} />
 *   ))}
 * </GalleryGrid>
 * ```
 *
 * @example
 * ```tsx
 * // Custom columns and gap
 * <GalleryGrid
 *   columns={{ sm: 1, md: 2, lg: 4, xl: 5 }}
 *   gap={6}
 * >
 *   {children}
 * </GalleryGrid>
 * ```
 */
export const GalleryGrid = ({
  children,
  columns = {},
  gap = 4,
  className,
  'data-testid': testId = 'gallery-grid',
}: GalleryGridProps) => {
  const columnClasses = getColumnClasses(columns)
  const gapClass = gapClassMap[gap] ?? 'gap-4'

  return (
    <div
      role="list"
      aria-label="Gallery grid"
      data-testid={testId}
      className={cn('grid', columnClasses, gapClass, className)}
    >
      {children}
    </div>
  )
}
