import { ModuleLayout as BaseModuleLayout } from '@repo/app-component-library'
import type { ModuleLayoutProps as BaseProps } from '@repo/app-component-library'

export type ModuleLayoutProps = Omit<BaseProps, 'padding'>

export function ModuleLayout({ children, className }: ModuleLayoutProps) {
  return (
    <BaseModuleLayout padding="standard" className={className}>
      {children}
    </BaseModuleLayout>
  )
}

export default ModuleLayout
