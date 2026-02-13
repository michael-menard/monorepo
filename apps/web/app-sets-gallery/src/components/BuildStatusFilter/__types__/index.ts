import { z } from 'zod'

export const BuiltFilterValueSchema = z.enum(['all', 'built', 'unbuilt'])
export type BuiltFilterValue = z.infer<typeof BuiltFilterValueSchema>

export const BuildStatusFilterPropsSchema = z.object({
  value: BuiltFilterValueSchema,
  onChange: z.function().args(BuiltFilterValueSchema).returns(z.void()),
  className: z.string().optional(),
  'data-testid': z.string().optional(),
  'aria-label': z.string().optional(),
})
export type BuildStatusFilterProps = z.infer<typeof BuildStatusFilterPropsSchema>
