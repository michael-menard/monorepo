import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
export interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  label?: string
  description?: string
  showValue?: boolean
  valueText?: string
  orientation?: 'horizontal' | 'vertical'
}
declare function Slider({
  className,
  defaultValue,
  value,
  min,
  max,
  label,
  description,
  showValue,
  valueText,
  orientation,
  id,
  ...props
}: SliderProps): import('react/jsx-runtime').JSX.Element
export { Slider }
//# sourceMappingURL=slider.d.ts.map
