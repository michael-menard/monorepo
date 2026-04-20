import { useState, useCallback } from 'react'
import { Star } from 'lucide-react'
import { Label } from '@repo/app-component-library'

interface StarRatingInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  max?: number
}

export function StarRatingInput({ label, value, onChange, max = 5 }: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState(0)

  const handleClick = useCallback(
    (starValue: number) => {
      onChange(starValue === value ? 0 : starValue)
    },
    [value, onChange],
  )

  return (
    <div>
      <Label>{label}</Label>
      <div
        className="flex gap-1 mt-1"
        role="radiogroup"
        aria-label={label}
        onMouseLeave={() => setHoverValue(0)}
      >
        {Array.from({ length: max }, (_, i) => {
          const starValue = i + 1
          const isFilled = starValue <= (hoverValue || value)
          return (
            <button
              key={starValue}
              type="button"
              role="radio"
              aria-checked={starValue === value}
              aria-label={`${starValue} star${starValue !== 1 ? 's' : ''}`}
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => setHoverValue(starValue)}
              className="p-0.5 transition-colors"
            >
              <Star
                className={`h-6 w-6 ${
                  isFilled ? 'fill-amber-400 text-amber-400' : 'fill-none text-muted-foreground/40'
                }`}
              />
            </button>
          )
        })}
        {value > 0 && (
          <span className="text-sm text-muted-foreground ml-2 self-center">
            {value}/{max}
          </span>
        )}
      </div>
    </div>
  )
}
