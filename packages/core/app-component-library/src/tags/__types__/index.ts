import { z } from 'zod'

export const TagSizeSchema = z.enum(['sm', 'default', 'lg'])
export type TagSize = z.infer<typeof TagSizeSchema>

export const TagCategorySchema = z.enum(['state', 'priority', 'planStatus', 'generic', 'epic'])
export type TagCategory = z.infer<typeof TagCategorySchema>

export const StateTagPropsSchema = z.object({
  state: z.string(),
  size: TagSizeSchema.optional(),
  className: z.string().optional(),
})
export type StateTagProps = z.infer<typeof StateTagPropsSchema>

export const PriorityTagPropsSchema = z.object({
  priority: z.string(),
  size: TagSizeSchema.optional(),
  className: z.string().optional(),
})
export type PriorityTagProps = z.infer<typeof PriorityTagPropsSchema>

export const PlanStatusTagPropsSchema = z.object({
  status: z.string(),
  size: TagSizeSchema.optional(),
  className: z.string().optional(),
})
export type PlanStatusTagProps = z.infer<typeof PlanStatusTagPropsSchema>

export const GenericTagPropsSchema = z.object({
  label: z.string(),
  size: TagSizeSchema.optional(),
  className: z.string().optional(),
})
export type GenericTagProps = z.infer<typeof GenericTagPropsSchema>

export const EpicTagPropsSchema = z.object({
  label: z.string(),
  size: TagSizeSchema.optional(),
  className: z.string().optional(),
})
export type EpicTagProps = z.infer<typeof EpicTagPropsSchema>

export const WorkflowTagPropsSchema = z.object({
  category: TagCategorySchema,
  value: z.string(),
  size: TagSizeSchema.optional(),
  className: z.string().optional(),
})
export type WorkflowTagProps = z.infer<typeof WorkflowTagPropsSchema>
