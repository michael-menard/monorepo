import { cn } from '@repo/app-component-library'
import { z } from 'zod'

const ModuleLayoutPropsSchema = z.object({
  children: z.any(),
  className: z.string().optional(),
})

type ModuleLayoutProps = z.infer<typeof ModuleLayoutPropsSchema>

export function ModuleLayout({ children, className }: ModuleLayoutProps) {
  return <div className={cn('min-h-full', className)}>{children}</div>
}
