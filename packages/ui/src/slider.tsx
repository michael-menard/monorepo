import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "./lib/utils"
import { getAriaAttributes, useUniqueId } from "./lib/keyboard-navigation"

export interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  label?: string;
  description?: string;
  showValue?: boolean;
  valueText?: string;
  orientation?: 'horizontal' | 'vertical';
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  label,
  description,
  showValue = false,
  valueText,
  orientation = 'horizontal',
  id,
  ...props
}: SliderProps) {
  const uniqueId = useUniqueId('slider')
  const sliderId = id || uniqueId
  const descriptionId = `${sliderId}-description`
  
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  const currentValue = Array.isArray(_values) ? _values[0] : _values
  const percentage = Math.round(((currentValue - min) / (max - min)) * 100)
  
  const ariaAttributes = getAriaAttributes({
    orientation,
    valueNow: currentValue,
    valueMin: min,
    valueMax: max,
    valueText: valueText || `${currentValue}`,
    describedBy: description ? descriptionId : undefined,
  })

  return (
    <div className="space-y-2">
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <label 
              htmlFor={sliderId}
              className="text-sm font-medium text-foreground"
            >
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-sm text-muted-foreground">
              {valueText || `${currentValue}`}
            </span>
          )}
        </div>
      )}
      
      <SliderPrimitive.Root
        data-slot="slider"
        id={sliderId}
        defaultValue={defaultValue}
        value={value}
        min={min}
        max={max}
        className={cn(
          "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
          className
        )}
        role="slider"
        aria-valuenow={currentValue}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={valueText || `${currentValue}`}
        aria-orientation={orientation}
        aria-describedby={description ? descriptionId : undefined}
        {...ariaAttributes}
        {...props}
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className={cn(
            "bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
          )}
        >
          <SliderPrimitive.Range
            data-slot="slider-range"
            className={cn(
              "bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
            )}
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="border-primary bg-background ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
            aria-label={`Slider thumb ${index + 1}`}
          />
        ))}
      </SliderPrimitive.Root>
      
      {description && (
        <p 
          id={descriptionId}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}
    </div>
  )
}

export { Slider }
