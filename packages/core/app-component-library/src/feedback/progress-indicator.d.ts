import * as React from 'react'
import { type VariantProps } from 'class-variance-authority'
declare const progressVariants: (
  props?:
    | ({
        variant?: 'default' | 'destructive' | 'success' | 'warning' | 'primary' | null | undefined
        size?: 'sm' | 'lg' | 'xl' | 'default' | null | undefined
      } & import('class-variance-authority/types').ClassProp)
    | undefined,
) => string
declare const progressBarVariants: (
  props?:
    | ({
        variant?: 'default' | 'destructive' | 'success' | 'warning' | 'primary' | null | undefined
      } & import('class-variance-authority/types').ClassProp)
    | undefined,
) => string
export interface ProgressIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value?: number
  max?: number
  showLabel?: boolean
  labelPosition?: 'top' | 'bottom' | 'inside'
  indeterminate?: boolean
  animated?: boolean
}
declare const ProgressIndicator: React.ForwardRefExoticComponent<
  ProgressIndicatorProps & React.RefAttributes<HTMLDivElement>
>
export interface CircularProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressBarVariants> {
  value?: number
  max?: number
  size?: 'sm' | 'default' | 'lg' | 'xl'
  strokeWidth?: number
  showLabel?: boolean
  indeterminate?: boolean
  animated?: boolean
}
declare const CircularProgress: React.ForwardRefExoticComponent<
  CircularProgressProps & React.RefAttributes<HTMLDivElement>
>
export interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean
  text?: string
  variant?: 'spinner' | 'progress' | 'circular'
  progressValue?: number
  progressMax?: number
  blur?: boolean
}
declare const LoadingOverlay: React.ForwardRefExoticComponent<
  LoadingOverlayProps & React.RefAttributes<HTMLDivElement>
>
export {
  ProgressIndicator,
  CircularProgress,
  LoadingOverlay,
  progressVariants,
  progressBarVariants,
}
//# sourceMappingURL=progress-indicator.d.ts.map
