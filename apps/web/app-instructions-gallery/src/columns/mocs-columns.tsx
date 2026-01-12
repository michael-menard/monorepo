/**
 * Column definitions for the Instructions/MOCs datatable view
 * Story glry-1014: MOCs Gallery Integration
 */
import { z } from 'zod'
import { Badge } from '@repo/app-component-library'
import { type GalleryDataTableColumn } from '@repo/gallery'

/**
 * Table item schema for the instructions gallery datatable.
 * This is a lightweight projection of the full Instruction entity
 * with extra fields for view-specific properties.
 */
export const InstructionTableItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().optional(),
  // Optional view-only fields derived from other data sources
  difficulty: z
    .union([z.literal('beginner'), z.literal('intermediate'), z.literal('advanced')])
    .optional(),
  status: z.union([z.literal('published'), z.literal('draft'), z.literal('archived')]).optional(),
  slug: z.string(),
})

export type InstructionTableItem = z.infer<typeof InstructionTableItemSchema>

/**
 * Column configuration for the instructions/MOCs gallery datatable.
 * Columns: Title, Difficulty, Status, Created.
 */
export const mocsColumns: GalleryDataTableColumn<InstructionTableItem>[] = [
  // Title column (mapped from Instruction.name)
  {
    field: 'name',
    header: 'Title',
    size: 400,
    className: 'font-medium text-sm',
  },

  // Difficulty column with color-coded badge
  {
    field: 'difficulty',
    header: 'Difficulty',
    size: 150,
    render: item => {
      const difficulty = item.difficulty ?? 'beginner'
      const styleMap: Record<string, string> = {
        beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      }

      return (
        <Badge className={styleMap[difficulty] || 'bg-gray-100 text-foreground'}>
          {difficulty}
        </Badge>
      )
    },
  },

  // Status column with variant-based badge
  {
    field: 'status',
    header: 'Status',
    size: 200,
    render: item => {
      const status = item.status ?? 'draft'
      const variantMap: Record<string, 'default' | 'secondary' | 'outline'> = {
        published: 'default',
        draft: 'secondary',
        archived: 'outline',
      }

      return <Badge variant={variantMap[status] ?? 'outline'}>{status}</Badge>
    },
  },

  // Created date column formatted as text (datatable handles raw string)
  {
    field: 'createdAt',
    header: 'Created',
    size: 200,
    className: 'text-sm tabular-nums text-muted-foreground',
  },
]
