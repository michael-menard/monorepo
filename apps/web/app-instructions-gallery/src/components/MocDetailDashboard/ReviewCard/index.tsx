import { Card, CardContent, CardHeader, CardTitle, Button } from '@repo/app-component-library'
import { Star, Pencil } from 'lucide-react'
import { useGetMocReviewQuery } from '@repo/api-client/rtk/instructions-api'
import type { ReviewSections } from '@repo/api-client/schemas/instructions'

interface ReviewCardProps {
  mocId: string
  onEdit: () => void
}

export function ReviewCard({ mocId, onEdit }: ReviewCardProps) {
  const { data: review, isLoading } = useGetMocReviewQuery(mocId)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!review) return null

  const sections = review.sections as ReviewSections

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Build Review</CardTitle>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-1" aria-hidden="true" />
          Edit
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.partsQuality && (
          <ReviewSection title="Parts Quality" rating={sections.partsQuality.rating}>
            {sections.partsQuality.brand && (
              <Detail label="Brand" value={formatBrand(sections.partsQuality.brand)} />
            )}
            {sections.partsQuality.clutchPower && (
              <Detail
                label="Clutch Power"
                value={<Stars count={sections.partsQuality.clutchPower} />}
              />
            )}
            {sections.partsQuality.colorAccuracy && (
              <Detail
                label="Color Accuracy"
                value={<Stars count={sections.partsQuality.colorAccuracy} />}
              />
            )}
            {sections.partsQuality.missingParts && (
              <Detail
                label="Missing Parts"
                value={sections.partsQuality.missingPartsNotes || 'Yes'}
              />
            )}
            {sections.partsQuality.notes && <Notes text={sections.partsQuality.notes} />}
          </ReviewSection>
        )}

        {sections.instructions && (
          <ReviewSection title="Instructions" rating={sections.instructions.rating}>
            {sections.instructions.clarity && (
              <Detail label="Clarity" value={<Stars count={sections.instructions.clarity} />} />
            )}
            {sections.instructions.stepGranularity && (
              <Detail
                label="Step Granularity"
                value={formatGranularity(sections.instructions.stepGranularity)}
              />
            )}
            {sections.instructions.errors && (
              <Detail label="Errors Found" value={sections.instructions.errorsNotes || 'Yes'} />
            )}
            {sections.instructions.notes && <Notes text={sections.instructions.notes} />}
          </ReviewSection>
        )}

        {sections.minifigs && (
          <ReviewSection title="Minifigs" rating={sections.minifigs.rating}>
            <Detail
              label="Designer Included Minifigs"
              value={sections.minifigs.designerIncludedMinifigs ? 'Yes' : 'No'}
            />
            {sections.minifigs.printVsSticker && (
              <Detail
                label="Print vs Sticker"
                value={capitalize(sections.minifigs.printVsSticker)}
              />
            )}
            {sections.minifigs.notes && <Notes text={sections.minifigs.notes} />}
          </ReviewSection>
        )}

        {sections.stickers && (
          <ReviewSection title="Stickers" rating={sections.stickers.rating}>
            <Detail label="Has Stickers" value={sections.stickers.hasStickers ? 'Yes' : 'No'} />
            {sections.stickers.notes && <Notes text={sections.stickers.notes} />}
          </ReviewSection>
        )}

        {sections.value && (
          <ReviewSection title="Value" rating={sections.value.rating}>
            {sections.value.pricePerPiece && (
              <Detail label="Price Per Piece" value={capitalize(sections.value.pricePerPiece)} />
            )}
            {sections.value.notes && <Notes text={sections.value.notes} />}
          </ReviewSection>
        )}

        {sections.buildExperience && (
          <ReviewSection title="Build Experience" rating={sections.buildExperience.rating}>
            {sections.buildExperience.difficulty && (
              <Detail label="Difficulty" value={capitalize(sections.buildExperience.difficulty)} />
            )}
            {sections.buildExperience.sessionCount && (
              <Detail
                label="Build Sessions"
                value={String(sections.buildExperience.sessionCount)}
              />
            )}
            {sections.buildExperience.enjoyment && (
              <Detail
                label="Enjoyment"
                value={<Stars count={sections.buildExperience.enjoyment} />}
              />
            )}
            {sections.buildExperience.notes && <Notes text={sections.buildExperience.notes} />}
          </ReviewSection>
        )}

        {sections.design && (
          <ReviewSection title="Design" rating={sections.design.rating}>
            {sections.design.notes && <Notes text={sections.design.notes} />}
          </ReviewSection>
        )}
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────────────────

function ReviewSection({
  title,
  rating,
  children,
}: {
  title: string
  rating?: number
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-border pb-4 last:border-0 last:pb-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm">{title}</h3>
        {rating && <Stars count={rating} />}
      </div>
      <div className="space-y-1.5 text-sm">{children}</div>
    </div>
  )
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < count ? 'fill-amber-400 text-amber-400' : 'fill-none text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span>{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}

function Notes({ text }: { text: string }) {
  return <p className="text-muted-foreground italic mt-1">{text}</p>
}

function formatBrand(brand: string): string {
  const brands: Record<string, string> = {
    cada: 'Cada',
    mould_king: 'Mould King',
    xingbao: 'Xingbao',
    wrebbit: 'Wrebbit',
    gobrick: 'GoBrick',
    lego: 'LEGO',
    other: 'Other',
  }
  return brands[brand] ?? brand
}

function formatGranularity(g: string): string {
  const map: Record<string, string> = {
    too_few: 'Too Few Steps',
    just_right: 'Just Right',
    too_many: 'Too Many Steps',
  }
  return map[g] ?? g
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}
