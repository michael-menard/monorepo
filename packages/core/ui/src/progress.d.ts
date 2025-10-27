import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
export interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  label?: string
  description?: string
  showValue?: boolean
  valueText?: string
  min?: number
  max?: number
}
declare function Progress({
  className,
  value,
  label,
  description,
  showValue,
  valueText,
  min,
  max,
  id,
  ...props
}: ProgressProps): import('react/jsx-runtime').JSX.Element
export { Progress }
//# sourceMappingURL=progress.d.ts.map
