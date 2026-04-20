import { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/app-component-library'
import { logger } from '@repo/logger'
import {
  useCreateMocReviewMutation,
  useUpdateMocReviewMutation,
  useGetMocReviewQuery,
} from '@repo/api-client/rtk/instructions-api'
import type { ReviewSections } from '@repo/api-client/schemas/instructions'
import { StarRatingInput } from './StarRatingInput'
import { SwitchField } from './SwitchField'

const STEPS = [
  { key: 'partsQuality', label: 'Parts Quality' },
  { key: 'instructions', label: 'Instructions' },
  { key: 'minifigs', label: 'Minifigs' },
  { key: 'stickers', label: 'Stickers' },
  { key: 'value', label: 'Value' },
  { key: 'buildExperience', label: 'Build Experience' },
  { key: 'design', label: 'Design' },
] as const

type StepKey = (typeof STEPS)[number]['key']

interface BuildReviewModalProps {
  mocId: string
  open: boolean
  onClose: () => void
}

export function BuildReviewModal({ mocId, open, onClose }: BuildReviewModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [sections, setSections] = useState<ReviewSections>({})
  const [reviewCreated, setReviewCreated] = useState(false)

  const { data: existingReview } = useGetMocReviewQuery(mocId, { skip: !open })
  const [createReview] = useCreateMocReviewMutation()
  const [updateReview, { isLoading: isSaving }] = useUpdateMocReviewMutation()

  // Load existing review data
  useEffect(() => {
    if (existingReview) {
      setSections(existingReview.sections as ReviewSections)
      setReviewCreated(true)
    }
  }, [existingReview])

  // Create review on first open if it doesn't exist
  useEffect(() => {
    if (open && !reviewCreated && !existingReview) {
      createReview(mocId)
        .unwrap()
        .then(() => setReviewCreated(true))
        .catch(err => {
          // 409 means review already exists
          if (err?.status === 409) {
            setReviewCreated(true)
          } else {
            logger.error('Failed to create review', err)
          }
        })
    }
  }, [open, reviewCreated, existingReview, createReview, mocId])

  const stepKey = STEPS[currentStep].key

  const updateSection = useCallback((key: StepKey, data: Record<string, unknown>) => {
    setSections(prev => ({
      ...prev,
      [key]: { ...(prev[key] as Record<string, unknown> | undefined), ...data },
    }))
  }, [])

  const saveCurrentStep = useCallback(async () => {
    try {
      await updateReview({
        mocId,
        input: { sections: { [stepKey]: sections[stepKey] } },
      }).unwrap()
    } catch (err) {
      logger.error('Failed to save review step', err)
    }
  }, [mocId, stepKey, sections, updateReview])

  const handleNext = useCallback(async () => {
    await saveCurrentStep()
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep, saveCurrentStep])

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const handleSkipStep = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep])

  const handleSubmit = useCallback(async () => {
    await saveCurrentStep()
    try {
      await updateReview({
        mocId,
        input: { status: 'complete' },
      }).unwrap()
      onClose()
    } catch (err) {
      logger.error('Failed to submit review', err)
    }
  }, [mocId, saveCurrentStep, updateReview, onClose])

  const isLastStep = currentStep === STEPS.length - 1

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Build Review</DialogTitle>
          <div
            className="flex gap-1 mt-2"
            role="progressbar"
            aria-valuenow={currentStep + 1}
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
          >
            {STEPS.map((step, i) => (
              <button
                key={step.key}
                type="button"
                onClick={() => setCurrentStep(i)}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
                aria-label={`Step ${i + 1}: ${step.label}`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].label}
          </p>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {stepKey === 'partsQuality' && (
            <PartsQualityStep
              data={(sections.partsQuality ?? {}) as Record<string, unknown>}
              onChange={data => updateSection('partsQuality', data)}
            />
          )}
          {stepKey === 'instructions' && (
            <InstructionsStep
              data={(sections.instructions ?? {}) as Record<string, unknown>}
              onChange={data => updateSection('instructions', data)}
            />
          )}
          {stepKey === 'minifigs' && (
            <MinifigsStep
              data={(sections.minifigs ?? {}) as Record<string, unknown>}
              onChange={data => updateSection('minifigs', data)}
            />
          )}
          {stepKey === 'stickers' && (
            <StickersStep
              data={(sections.stickers ?? {}) as Record<string, unknown>}
              onChange={data => updateSection('stickers', data)}
            />
          )}
          {stepKey === 'value' && (
            <ValueStep
              data={(sections.value ?? {}) as Record<string, unknown>}
              onChange={data => updateSection('value', data)}
            />
          )}
          {stepKey === 'buildExperience' && (
            <BuildExperienceStep
              data={(sections.buildExperience ?? {}) as Record<string, unknown>}
              onChange={data => updateSection('buildExperience', data)}
            />
          )}
          {stepKey === 'design' && (
            <DesignStep
              data={(sections.design ?? {}) as Record<string, unknown>}
              onChange={data => updateSection('design', data)}
            />
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSkipStep}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip this step
            </button>
            {isLastStep ? (
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? 'Submitting...' : 'Submit Review'}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Next'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Step Components
// ─────────────────────────────────────────────────────────────────────────

interface StepProps {
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
}

function PartsQualityStep({ data, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <StarRatingInput
        label="Overall Parts Quality"
        value={(data.rating as number) ?? 0}
        onChange={v => onChange({ rating: v })}
      />
      <div>
        <Label>Brand</Label>
        <Select value={(data.brand as string) ?? ''} onValueChange={v => onChange({ brand: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lego">LEGO</SelectItem>
            <SelectItem value="cada">Cada</SelectItem>
            <SelectItem value="mould_king">Mould King</SelectItem>
            <SelectItem value="xingbao">Xingbao</SelectItem>
            <SelectItem value="wrebbit">Wrebbit</SelectItem>
            <SelectItem value="gobrick">GoBrick</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {data.brand === 'other' && (
        <div>
          <Label>Brand Name</Label>
          <Textarea
            value={(data.brandOther as string) ?? ''}
            onChange={e => onChange({ brandOther: e.target.value })}
            placeholder="Enter brand name"
            rows={1}
          />
        </div>
      )}
      <StarRatingInput
        label="Clutch Power"
        value={(data.clutchPower as number) ?? 0}
        onChange={v => onChange({ clutchPower: v })}
      />
      <StarRatingInput
        label="Color Accuracy"
        value={(data.colorAccuracy as number) ?? 0}
        onChange={v => onChange({ colorAccuracy: v })}
      />
      <SwitchField
        label="Missing Parts?"
        checked={!!data.missingParts}
        onChange={v => onChange({ missingParts: v })}
      />
      {data.missingParts && (
        <div>
          <Label>Missing Parts Details</Label>
          <Textarea
            value={(data.missingPartsNotes as string) ?? ''}
            onChange={e => onChange({ missingPartsNotes: e.target.value })}
            placeholder="Which parts were missing?"
            rows={2}
          />
        </div>
      )}
      <div>
        <Label>Notes</Label>
        <Textarea
          value={(data.notes as string) ?? ''}
          onChange={e => onChange({ notes: e.target.value })}
          placeholder="Any additional notes about parts quality..."
          rows={2}
        />
      </div>
    </div>
  )
}

function InstructionsStep({ data, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <StarRatingInput
        label="Instructions Quality"
        value={(data.rating as number) ?? 0}
        onChange={v => onChange({ rating: v })}
      />
      <StarRatingInput
        label="Clarity"
        value={(data.clarity as number) ?? 0}
        onChange={v => onChange({ clarity: v })}
      />
      <div>
        <Label>Step Granularity</Label>
        <Select
          value={(data.stepGranularity as string) ?? ''}
          onValueChange={v => onChange({ stepGranularity: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="How were the steps?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="too_few">Too Few Steps</SelectItem>
            <SelectItem value="just_right">Just Right</SelectItem>
            <SelectItem value="too_many">Too Many Steps</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <SwitchField
        label="Errors in Instructions?"
        checked={!!data.errors}
        onChange={v => onChange({ errors: v })}
      />
      {data.errors && (
        <div>
          <Label>Error Details</Label>
          <Textarea
            value={(data.errorsNotes as string) ?? ''}
            onChange={e => onChange({ errorsNotes: e.target.value })}
            placeholder="Describe the errors found..."
            rows={2}
          />
        </div>
      )}
      <div>
        <Label>Notes</Label>
        <Textarea
          value={(data.notes as string) ?? ''}
          onChange={e => onChange({ notes: e.target.value })}
          placeholder="Any additional notes about instructions..."
          rows={2}
        />
      </div>
    </div>
  )
}

function MinifigsStep({ data, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <SwitchField
        label="Did the designer include minifigs in the instructions?"
        checked={!!data.designerIncludedMinifigs}
        onChange={v => onChange({ designerIncludedMinifigs: v })}
      />
      {data.designerIncludedMinifigs && (
        <>
          <StarRatingInput
            label="Minifig Quality"
            value={(data.rating as number) ?? 0}
            onChange={v => onChange({ rating: v })}
          />
          <StarRatingInput
            label="Overall Quality"
            value={(data.quality as number) ?? 0}
            onChange={v => onChange({ quality: v })}
          />
          <div>
            <Label>Print vs Sticker</Label>
            <Select
              value={(data.printVsSticker as string) ?? ''}
              onValueChange={v => onChange({ printVsSticker: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="printed">Printed</SelectItem>
                <SelectItem value="stickered">Stickered</SelectItem>
                <SelectItem value="mix">Mix</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      <div>
        <Label>Notes</Label>
        <Textarea
          value={(data.notes as string) ?? ''}
          onChange={e => onChange({ notes: e.target.value })}
          placeholder="Any additional notes about minifigs..."
          rows={2}
        />
      </div>
    </div>
  )
}

function StickersStep({ data, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <SwitchField
        label="Does this set include stickers?"
        checked={!!data.hasStickers}
        onChange={v => onChange({ hasStickers: v })}
      />
      {data.hasStickers && (
        <>
          <StarRatingInput
            label="Sticker Quality"
            value={(data.rating as number) ?? 0}
            onChange={v => onChange({ rating: v })}
          />
          <StarRatingInput
            label="Adhesion & Alignment"
            value={(data.quality as number) ?? 0}
            onChange={v => onChange({ quality: v })}
          />
        </>
      )}
      <div>
        <Label>Notes</Label>
        <Textarea
          value={(data.notes as string) ?? ''}
          onChange={e => onChange({ notes: e.target.value })}
          placeholder="Any additional notes about stickers..."
          rows={2}
        />
      </div>
    </div>
  )
}

function ValueStep({ data, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <StarRatingInput
        label="Value Rating"
        value={(data.rating as number) ?? 0}
        onChange={v => onChange({ rating: v })}
      />
      <div>
        <Label>Price Per Piece</Label>
        <Select
          value={(data.pricePerPiece as string) ?? ''}
          onValueChange={v => onChange({ pricePerPiece: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="How was the value?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="great">Great Value</SelectItem>
            <SelectItem value="fair">Fair</SelectItem>
            <SelectItem value="expensive">Expensive</SelectItem>
            <SelectItem value="overpriced">Overpriced</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea
          value={(data.notes as string) ?? ''}
          onChange={e => onChange({ notes: e.target.value })}
          placeholder="Any additional notes about value..."
          rows={2}
        />
      </div>
    </div>
  )
}

function BuildExperienceStep({ data, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <StarRatingInput
        label="Build Experience"
        value={(data.rating as number) ?? 0}
        onChange={v => onChange({ rating: v })}
      />
      <div>
        <Label>Difficulty</Label>
        <Select
          value={(data.difficulty as string) ?? ''}
          onValueChange={v => onChange({ difficulty: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="How difficult was it?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
            <SelectItem value="expert">Expert</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Build Sessions</Label>
        <input
          type="number"
          min={1}
          value={(data.sessionCount as number) ?? ''}
          onChange={e => onChange({ sessionCount: parseInt(e.target.value) || undefined })}
          placeholder="How many sessions?"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <StarRatingInput
        label="Enjoyment"
        value={(data.enjoyment as number) ?? 0}
        onChange={v => onChange({ enjoyment: v })}
      />
      <div>
        <Label>Notes</Label>
        <Textarea
          value={(data.notes as string) ?? ''}
          onChange={e => onChange({ notes: e.target.value })}
          placeholder="Any additional notes about the build experience..."
          rows={2}
        />
      </div>
    </div>
  )
}

function DesignStep({ data, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <StarRatingInput
        label="Design Rating"
        value={(data.rating as number) ?? 0}
        onChange={v => onChange({ rating: v })}
      />
      <div>
        <Label>Notes</Label>
        <Textarea
          value={(data.notes as string) ?? ''}
          onChange={e => onChange({ notes: e.target.value })}
          placeholder="What did you think of the design? What stood out?"
          rows={4}
        />
      </div>
    </div>
  )
}
