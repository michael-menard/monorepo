import { z } from 'zod'

export const ViewModeSchema = z.enum(['grid', 'datatable'])

export type ViewMode = z.infer<typeof ViewModeSchema>
