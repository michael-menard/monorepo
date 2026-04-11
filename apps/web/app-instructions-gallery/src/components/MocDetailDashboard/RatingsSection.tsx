import { useState, useCallback } from 'react'
import { Button } from '@repo/app-component-library'
import { Star } from 'lucide-react'
import { logger } from '@repo/logger'
import { useUpdateMocMutation } from '@repo/api-client/rtk/instructions-api'
import type { Moc } from './__types__/moc'

type Ratings = NonNullable<Moc['ratings']>

interface RatingsSectionProps {
  mocId: string
  ratings: Moc['ratings']
}

function StarRating({
  value,
  onChange,
  label,
  readonly,
}: {
  value: number | null | undefined
  onChange?: (v: number | null) => void
  label: string
  readonly?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const current = value ?? 0
  const display = hover ?? current

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div
        className="flex gap-0.5"
        onMouseLeave={() => setHover(null)}
        role="radiogroup"
        aria-label={`${label} rating`}
      >
        {[1, 2, 3, 4, 5].map(star => {
          const filled = display >= star
          const halfFilled = !filled && display >= star - 0.5

          return (
            <button
              key={star}
              type="button"
              disabled={readonly}
              className={`relative p-0 ${readonly ? 'cursor-default' : 'cursor-pointer'} transition-transform ${!readonly && 'hover:scale-110'}`}
              onMouseEnter={() => !readonly && setHover(star)}
              onClick={() => {
                if (readonly || !onChange) return
                // Click same star to clear
                onChange(current === star ? null : star)
              }}
              onContextMenu={e => {
                if (readonly || !onChange) return
                e.preventDefault()
                // Right-click for half star
                onChange(star - 0.5)
              }}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              aria-checked={current === star}
              role="radio"
            >
              <Star
                className={`h-4 w-4 transition-colors ${
                  filled
                    ? 'fill-amber-400 text-amber-400'
                    : halfFilled
                      ? 'fill-amber-400/50 text-amber-400'
                      : 'fill-none text-muted-foreground/40'
                }`}
              />
            </button>
          )
        })}
        {value != null ? (
          <span className="text-xs text-muted-foreground ml-1 w-6 tabular-nums">{value}</span>
        ) : null}
      </div>
    </div>
  )
}

export function RatingsSection({ mocId, ratings }: RatingsSectionProps) {
  const [draft, setDraft] = useState<Ratings>({
    overall: ratings?.overall ?? null,
    buildExperience: ratings?.buildExperience ?? null,
  })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [updateMoc, { isLoading }] = useUpdateMocMutation()

  const handleChange = useCallback(
    async (field: keyof Ratings, value: number | null) => {
      const updated = { ...draft, [field]: value }
      setDraft(updated)

      // Auto-save on change
      try {
        setSaveError(null)
        await updateMoc({ id: mocId, input: { ratings: updated } as any }).unwrap()
      } catch (err) {
        logger.error('Failed to save rating', err)
        setSaveError('Failed to save')
        // Revert
        setDraft(prev => ({ ...prev, [field]: draft[field] }))
      }
    },
    [mocId, draft, updateMoc],
  )

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Star className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="font-medium text-foreground">Ratings</span>
      </div>
      <div className="space-y-1">
        <StarRating
          value={draft.overall}
          onChange={v => handleChange('overall', v)}
          label="Overall"
          readonly={isLoading}
        />
        <StarRating
          value={draft.buildExperience}
          onChange={v => handleChange('buildExperience', v)}
          label="Build"
          readonly={isLoading}
        />
      </div>
      {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}
    </div>
  )
}
