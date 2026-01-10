import { z } from 'zod'
import {
  cn,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/app-component-library'

const GalleryDataTableSkeletonPropsSchema = z.object({
  columns: z.number().int().min(1),
  rows: z.number().int().min(1).optional(),
})

export type GalleryDataTableSkeletonProps = z.infer<typeof GalleryDataTableSkeletonPropsSchema>

export function GalleryDataTableSkeleton({ columns, rows = 10 }: GalleryDataTableSkeletonProps) {
  const safeColumns = Math.max(columns, 1)
  const safeRows = Math.max(rows, 1)

  return (
    <Table className="min-w-full text-left text-sm">
      <TableHeader>
        <TableRow className="border-b border-border bg-muted/40">
          {Array.from({ length: safeColumns }).map((_, columnIndex) => (
            <TableHead key={columnIndex} className="px-4 py-3">
              <div className="h-4 bg-muted motion-safe:animate-pulse rounded" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: safeRows }).map((_, rowIndex) => (
          <TableRow
            key={rowIndex}
            className={cn(
              'border-b min-h-[44px]',
              rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/10',
            )}
          >
            {Array.from({ length: safeColumns }).map((_, columnIndex) => (
              <TableCell key={columnIndex} className="px-4 py-3 align-middle">
                <div className="h-4 bg-muted motion-safe:animate-pulse rounded" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
