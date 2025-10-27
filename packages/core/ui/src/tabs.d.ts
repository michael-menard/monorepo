import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
export interface TabsProps extends React.ComponentProps<typeof TabsPrimitive.Root> {
  label?: string
  description?: string
  orientation?: 'horizontal' | 'vertical'
}
declare function Tabs({
  className,
  label,
  description,
  orientation,
  id,
  ...props
}: TabsProps): import('react/jsx-runtime').JSX.Element
declare function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>): import('react/jsx-runtime').JSX.Element
declare function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>): import('react/jsx-runtime').JSX.Element
declare function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>): import('react/jsx-runtime').JSX.Element
export { Tabs, TabsList, TabsTrigger, TabsContent }
//# sourceMappingURL=tabs.d.ts.map
