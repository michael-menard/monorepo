import { useState, useCallback } from 'react'
import { Button, Input } from '@repo/app-component-library'
import { Pencil, Check, X, Ruler, Plus, Trash2 } from 'lucide-react'
import { logger } from '@repo/logger'
import { useUpdateMocMutation } from '@repo/api-client/rtk/instructions-api'
import type { Moc } from './__types__/moc'

type Unit = 'cm' | 'inches' | 'mm' | 'studs'
type Dims = NonNullable<Moc['dimensions']>
type SubBuild = NonNullable<Dims['subBuilds']>[number]

const UNIT_LABELS: Record<Unit, string> = { cm: 'cm', inches: 'in', mm: 'mm', studs: 'studs' }

// 1 LEGO stud = 8mm = 0.8cm
const STUD_MM = 8

function toMm(value: number, unit: Unit): number {
  if (unit === 'cm') return value * 10
  if (unit === 'inches') return value * 25.4
  if (unit === 'studs') return value * STUD_MM
  return value // mm
}

function fromMm(mm: number, unit: Unit): number {
  if (unit === 'cm') return mm / 10
  if (unit === 'inches') return mm / 25.4
  if (unit === 'studs') return mm / STUD_MM
  return mm
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

// Get the canonical mm value from a dimension entry
// We store cm in the DB, so convert from that
function getAxisMm(
  entry: Dims | SubBuild | null | undefined,
  axis: 'height' | 'width' | 'depth',
): number | null {
  if (!entry) return null
  const cm = entry[axis]?.cm
  if (cm == null) return null
  return cm * 10
}

function formatInUnit(mm: number | null, unit: Unit): string {
  if (mm == null) return ''
  return `${round1(fromMm(mm, unit))}`
}

function displayInUnit(mm: number | null, unit: Unit): string {
  if (mm == null) return '--'
  return `${round1(fromMm(mm, unit))} ${UNIT_LABELS[unit]}`
}

function hasAnyDim(entry: Dims | SubBuild | null | undefined): boolean {
  if (!entry) return false
  return (
    getAxisMm(entry, 'height') != null ||
    getAxisMm(entry, 'width') != null ||
    getAxisMm(entry, 'depth') != null
  )
}

// Draft = values stored as mm (canonical)
interface DimDraft {
  name: string
  heightMm: number | null
  widthMm: number | null
  depthMm: number | null
}

function entryToDraft(entry: Dims | SubBuild | null | undefined, name?: string): DimDraft {
  return {
    name: name ?? (entry as any)?.name ?? '',
    heightMm: getAxisMm(entry, 'height'),
    widthMm: getAxisMm(entry, 'width'),
    depthMm: getAxisMm(entry, 'depth'),
  }
}

function draftToPayload(d: DimDraft) {
  const axis = (mm: number | null) => {
    if (mm == null) return null
    const cm = mm / 10
    return { cm: Math.round(cm * 100) / 100, inches: Math.round((cm / 2.54) * 100) / 100 }
  }
  return {
    height: axis(d.heightMm),
    width: axis(d.widthMm),
    depth: axis(d.depthMm),
    studsWidth: d.widthMm != null ? round1(d.widthMm / STUD_MM) : null,
    studsDepth: d.depthMm != null ? round1(d.depthMm / STUD_MM) : null,
    studsHeight: d.heightMm != null ? round1(d.heightMm / STUD_MM) : null,
  }
}

interface DimensionsSectionProps {
  mocId: string
  dimensions: Moc['dimensions']
}

// ─── Unit picker ────────────────────────────────────────────────────

function UnitPicker({ unit, onChange }: { unit: Unit; onChange: (u: Unit) => void }) {
  return (
    <div className="flex gap-0.5">
      {(['cm', 'mm', 'inches', 'studs'] as Unit[]).map(u => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
            unit === u
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          {UNIT_LABELS[u]}
        </button>
      ))}
    </div>
  )
}

// ─── Display for one entry ──────────────────────────────────────────

function DimDisplay({
  entry,
  unit,
  label,
}: {
  entry: Dims | SubBuild | null | undefined
  unit: Unit
  label?: string
}) {
  if (!hasAnyDim(entry)) return null

  return (
    <div>
      {label ? <p className="text-xs font-medium text-foreground mb-0.5">{label}</p> : null}
      <dl className="space-y-0.5 text-sm">
        {getAxisMm(entry, 'height') != null ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">H</dt>
            <dd className="font-medium text-foreground">
              {displayInUnit(getAxisMm(entry, 'height'), unit)}
            </dd>
          </div>
        ) : null}
        {getAxisMm(entry, 'width') != null ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">W</dt>
            <dd className="font-medium text-foreground">
              {displayInUnit(getAxisMm(entry, 'width'), unit)}
            </dd>
          </div>
        ) : null}
        {getAxisMm(entry, 'depth') != null ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">D</dt>
            <dd className="font-medium text-foreground">
              {displayInUnit(getAxisMm(entry, 'depth'), unit)}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

// ─── Edit fields for one entry ──────────────────────────────────────

function DimEditFields({
  draft,
  onChange,
  unit,
  disabled,
  showName,
  onRemove,
}: {
  draft: DimDraft
  onChange: (d: DimDraft) => void
  unit: Unit
  disabled: boolean
  showName?: boolean
  onRemove?: () => void
}) {
  // Display values in the current unit, edit in the current unit, store as mm
  const valFor = (mm: number | null) => (mm != null ? `${round1(fromMm(mm, unit))}` : '')

  const setAxis = (axis: 'heightMm' | 'widthMm' | 'depthMm', val: string) => {
    if (!val.trim()) {
      onChange({ ...draft, [axis]: null })
      return
    }
    const n = parseFloat(val)
    if (isNaN(n)) return
    onChange({ ...draft, [axis]: toMm(n, unit) })
  }

  return (
    <div className="space-y-1.5 p-2 border border-border/50 rounded-md">
      {showName ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="text"
            value={draft.name}
            onChange={e => onChange({ ...draft, name: e.target.value })}
            disabled={disabled}
            className="h-7 text-xs flex-1"
            placeholder="Sub-build name"
          />
          {onRemove ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              disabled={disabled}
              className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
              aria-label="Remove sub-build"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <label className="text-xs text-muted-foreground">H ({UNIT_LABELS[unit]})</label>
          <Input
            type="number"
            step={unit === 'studs' ? '1' : '0.1'}
            value={valFor(draft.heightMm)}
            onChange={e => setAxis('heightMm', e.target.value)}
            disabled={disabled}
            className="h-7 text-xs"
            placeholder="--"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">W ({UNIT_LABELS[unit]})</label>
          <Input
            type="number"
            step={unit === 'studs' ? '1' : '0.1'}
            value={valFor(draft.widthMm)}
            onChange={e => setAxis('widthMm', e.target.value)}
            disabled={disabled}
            className="h-7 text-xs"
            placeholder="--"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">D ({UNIT_LABELS[unit]})</label>
          <Input
            type="number"
            step={unit === 'studs' ? '1' : '0.1'}
            value={valFor(draft.depthMm)}
            onChange={e => setAxis('depthMm', e.target.value)}
            disabled={disabled}
            className="h-7 text-xs"
            placeholder="--"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────

export function DimensionsSection({ mocId, dimensions }: DimensionsSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [unit, setUnit] = useState<Unit>('cm')
  const [overallDraft, setOverallDraft] = useState<DimDraft>(entryToDraft(null))
  const [subDrafts, setSubDrafts] = useState<DimDraft[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const [updateMoc, { isLoading }] = useUpdateMocMutation()

  const subBuilds = dimensions?.subBuilds ?? []
  const hasDimensions = hasAnyDim(dimensions) || subBuilds.some(hasAnyDim)

  const handleEdit = useCallback(() => {
    setOverallDraft(entryToDraft(dimensions))
    setSubDrafts((dimensions?.subBuilds ?? []).map(sb => entryToDraft(sb, sb.name)))
    setSaveError(null)
    setIsEditing(true)
  }, [dimensions])

  const handleCancel = useCallback(() => {
    setSaveError(null)
    setIsEditing(false)
  }, [])

  const handleAddSubBuild = useCallback(() => {
    setSubDrafts(prev => [...prev, entryToDraft(null, '')])
  }, [])

  const handleRemoveSubBuild = useCallback((index: number) => {
    setSubDrafts(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubDraftChange = useCallback((index: number, draft: DimDraft) => {
    setSubDrafts(prev => prev.map((d, i) => (i === index ? draft : d)))
  }, [])

  const handleSave = useCallback(async () => {
    const overall = draftToPayload(overallDraft)
    const subs = subDrafts
      .filter(d => d.name.trim())
      .map(d => ({ name: d.name.trim(), ...draftToPayload(d) }))

    const dims = {
      ...overall,
      subBuilds: subs.length > 0 ? subs : null,
    }

    try {
      setSaveError(null)
      await updateMoc({ id: mocId, input: { dimensions: dims } as any }).unwrap()
      setIsEditing(false)
    } catch (err) {
      logger.error('Failed to save dimensions', err)
      setSaveError('Failed to save. Please try again.')
    }
  }, [mocId, overallDraft, subDrafts, updateMoc])

  if (isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Ruler className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="font-medium text-foreground">Dimensions</span>
          </div>
          <UnitPicker unit={unit} onChange={setUnit} />
        </div>

        <p className="text-xs text-muted-foreground">Overall</p>
        <DimEditFields
          draft={overallDraft}
          onChange={setOverallDraft}
          unit={unit}
          disabled={isLoading}
        />

        {subDrafts.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Sub-builds</p>
            {subDrafts.map((d, i) => (
              <DimEditFields
                key={i}
                draft={d}
                onChange={draft => handleSubDraftChange(i, draft)}
                unit={unit}
                disabled={isLoading}
                showName
                onRemove={() => handleRemoveSubBuild(i)}
              />
            ))}
          </div>
        ) : null}

        <Button
          variant="outline"
          size="sm"
          onClick={handleAddSubBuild}
          disabled={isLoading}
          className="h-7 text-xs px-2 w-full"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add sub-build
        </Button>

        {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}
        <div className="flex gap-1.5 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isLoading}
            className="h-7 text-xs px-2"
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isLoading} className="h-7 text-xs px-2">
            <Check className="h-3 w-3 mr-1" />
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="group/dims relative">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
        <Ruler className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="font-medium text-foreground">Dimensions</span>
      </div>
      {hasDimensions ? (
        <div className="space-y-2">
          <DimDisplay entry={dimensions} unit={unit} />
          {subBuilds.filter(hasAnyDim).map((sb, i) => (
            <DimDisplay key={i} entry={sb} unit={unit} label={sb.name || `Sub-build ${i + 1}`} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Not specified</p>
      )}
      <div className="absolute top-0 right-0 flex gap-0.5 opacity-0 group-hover/dims:opacity-100 transition-opacity">
        {hasDimensions ? <UnitPicker unit={unit} onChange={setUnit} /> : null}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleEdit}
          className="h-6 w-6"
          aria-label="Edit dimensions"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
