import { z } from 'zod'

export type FilterableFields<TItem> = {
  [K in keyof TItem]: TItem[K] extends string | number | string[] | number[] | null | undefined
    ? K
    : never
}[keyof TItem]

export const SearchableFieldConfigSchema = z.object({
  field: z.string(),
  label: z.string(),
})

export type SearchableFieldConfig<
  TItem extends Record<string, unknown> = Record<string, unknown>,
> = {
  field: keyof TItem
  label: string
}
