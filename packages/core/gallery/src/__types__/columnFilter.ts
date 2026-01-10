import { z } from 'zod'

export const FilterOperatorSchema = z.enum(['equals', 'contains', 'gt', 'lt', 'gte', 'lte', 'in'])

export type FilterOperator = z.infer<typeof FilterOperatorSchema>

export const ColumnTypeSchema = z.enum(['text', 'number', 'date', 'enum'])

export type ColumnType = z.infer<typeof ColumnTypeSchema>

export const ColumnFilterSchema = z.object({
  field: z.string(),
  operator: FilterOperatorSchema,
  value: z.unknown(),
})

export type ColumnFilter<TItem extends Record<string, unknown> = Record<string, unknown>> = {
  field: keyof TItem
  operator: FilterOperator
  value: unknown
}

export const FilterableColumnSchema = z.object({
  field: z.string(),
  label: z.string(),
  type: ColumnTypeSchema,
  operators: z.array(FilterOperatorSchema).optional(),
})

export type FilterableColumn<TItem extends Record<string, unknown> = Record<string, unknown>> = {
  field: keyof TItem
  label: string
  type: ColumnType
  operators?: FilterOperator[]
}
