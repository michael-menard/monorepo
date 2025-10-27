import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
export interface TooltipProviderProps
  extends React.ComponentProps<typeof TooltipPrimitive.Provider> {
  skipDelayDuration?: number
  delayDuration?: number
}
declare function TooltipProvider({
  delayDuration,
  skipDelayDuration,
  ...props
}: TooltipProviderProps): import('react/jsx-runtime').JSX.Element
declare function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>): import('react/jsx-runtime').JSX.Element
declare function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>): import('react/jsx-runtime').JSX.Element
declare function TooltipContent({
  className,
  sideOffset,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>): import('react/jsx-runtime').JSX.Element
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
//# sourceMappingURL=tooltip.d.ts.map
