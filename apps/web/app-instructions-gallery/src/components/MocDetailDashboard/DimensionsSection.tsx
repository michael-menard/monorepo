import { useState, useCallback } from 'react'
import { Button, Input } from '@repo/app-component-library'
import { Pencil, Check, X, Ruler } from 'lucide-react'
import { logger } from '@repo/logger'
import { useUpdateMocMutation } from '@repo/api-client/rtk/instructions-api'
import type { Moc } from './__types__/moc'

type Unit = 'cm' | 'inches' | 'mm' | 'studs'

const UNIT_LABELS: Record<Unit, string> = {
  cm: 'cm',
  inches: 'in',
  mm: 'mm',
  studs: 'studs',
}

// 1 LEGO stud = 8mm = 0.8cm
const STUD_CM = 0.8

function toCm(value: number, unit: Unit): number {
  switch (unit) {
    case 'cm':
      return value
    case 'inches':
      return value * 2.54
    case 'mm':
      return value / 10
    case 'studs':
      return value * STUD_CM
  }
}

function fromCm(cm: number, unit: Unit): number {
  switch (unit) {
    case 'cm':
      return cm
    case 'inches':
      return cm / 2.54
    case 'mm':
      return cm * 10
    case 'studs':
      return cm / STUD_CM
  }
}

function formatDim(cm: number | null | undefined, unit: Unit): string {
  if (cm == null) return ''
  const val = fromCm(cm, unit)
  // Round nicely
  const rounded = Math.round(val * 10) / 10
  return `${rounded}`
}

function displayDim(cm: number | null | undefined, unit: Unit): string {
  if (cm == null) return '--'
  const val = fromCm(cm, unit)
  const rounded = Math.round(val * 10) / 10
  return `${rounded} ${UNIT_LABELS[unit]}`
}

type Dims = NonNullable<Moc['dimensions']>

interface DimensionsSectionProps {
  mocId: string
  dimensions: Moc['dimensions']
}

function getDimCm(
  dims: Dims | null | undefined,
  axis: 'height' | 'width' | 'depth',
): number | null {
  if (!dims) return null
  return dims[axis]?.cm ?? null
}

function getStuds(dims: Dims | null | undefined, axis: 'width' | 'depth'): number | null {
  if (!dims) return null
  return axis === 'width' ? (dims.studsWidth ?? null) : (dims.studsDepth ?? null)
}

export function DimensionsSection({ mocId, dimensions }: DimensionsSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [unit, setUnit] = useState<Unit>('cm')
  const [heightVal, setHeightVal] = useState('')
  const [widthVal, setWidthVal] = useState('')
  const [depthVal, setDepthVal] = useState('')
  const [studsW, setStudsW] = useState('')
  const [studsD, setStudsD] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [updateMoc, { isLoading }] = useUpdateMocMutation()

  const hasDimensions =
    getDimCm(dimensions, 'height') != null ||
    getDimCm(dimensions, 'width') != null ||
    getDimCm(dimensions, 'depth') != null ||
    getStuds(dimensions, 'width') != null ||
    getStuds(dimensions, 'depth') != null

  const handleEdit = useCallback(() => {
    setHeightVal(formatDim(getDimCm(dimensions, 'height'), unit))
    setWidthVal(formatDim(getDimCm(dimensions, 'width'), unit))
    setDepthVal(formatDim(getDimCm(dimensions, 'depth'), unit))
    setStudsW(getStuds(dimensions, 'width')?.toString() ?? '')
    setStudsD(getStuds(dimensions, 'depth')?.toString() ?? '')
    setSaveError(null)
    setIsEditing(true)
  }, [dimensions, unit])

  const handleCancel = useCallback(() => {
    setSaveError(null)
    setIsEditing(false)
  }, [])

  const handleSave = useCallback(async () => {
    const parseCm = (val: string): number | null => {
      if (!val.trim()) return null
      const n = parseFloat(val)
      if (isNaN(n)) return null
      return Math.round(toCm(n, unit) * 100) / 100
    }
    const parseStuds = (val: string): number | null => {
      if (!val.trim()) return null
      const n = parseFloat(val)
      if (isNaN(n)) return null
      return Math.round(n * 10) / 10
    }

    const hCm = parseCm(heightVal)
    const wCm = parseCm(widthVal)
    const dCm = parseCm(depthVal)
    const sw = parseStuds(studsW)
    const sd = parseStuds(studsD)

    const dims = {
      height: hCm != null ? { cm: hCm, inches: Math.round((hCm / 2.54) * 100) / 100 } : null,
      width: wCm != null ? { cm: wCm, inches: Math.round((wCm / 2.54) * 100) / 100 } : null,
      depth: dCm != null ? { cm: dCm, inches: Math.round((dCm / 2.54) * 100) / 100 } : null,
      studsWidth: sw,
      studsDepth: sd,
    }

    try {
      setSaveError(null)
      await updateMoc({ id: mocId, input: { dimensions: dims } as any }).unwrap()
      setIsEditing(false)
    } catch (err) {
      logger.error('Failed to save dimensions', err)
      setSaveError('Failed to save. Please try again.')
    }
  }, [mocId, heightVal, widthVal, depthVal, studsW, studsD, unit, updateMoc])

  const handleUnitChange = useCallback(
    (newUnit: Unit) => {
      // Convert existing input values to new unit
      const convert = (val: string, oldUnit: Unit, nu: Unit): string => {
        if (!val.trim()) return ''
        const n = parseFloat(val)
        if (isNaN(n)) return val
        const cm = toCm(n, oldUnit)
        const converted = fromCm(cm, nu)
        return `${Math.round(converted * 10) / 10}`
      }
      if (newUnit !== 'studs') {
        setHeightVal(prev => convert(prev, unit, newUnit))
        setWidthVal(prev => convert(prev, unit, newUnit))
        setDepthVal(prev => convert(prev, unit, newUnit))
      }
      setUnit(newUnit)
    },
    [unit],
  )

  if (isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Ruler className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="font-medium text-foreground">Dimensions</span>
          </div>
          <div className="flex gap-0.5">
            {(['cm', 'mm', 'inches', 'studs'] as Unit[]).map(u => (
              <button
                key={u}
                type="button"
                onClick={() => handleUnitChange(u)}
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
        </div>
        {unit !== 'studs' ? (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">H</label>
              <Input
                type="number"
                step="0.1"
                value={heightVal}
                onChange={e => setHeightVal(e.target.value)}
                disabled={isLoading}
                className="h-7 text-xs"
                placeholder="--"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">W</label>
              <Input
                type="number"
                step="0.1"
                value={widthVal}
                onChange={e => setWidthVal(e.target.value)}
                disabled={isLoading}
                className="h-7 text-xs"
                placeholder="--"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">D</label>
              <Input
                type="number"
                step="0.1"
                value={depthVal}
                onChange={e => setDepthVal(e.target.value)}
                disabled={isLoading}
                className="h-7 text-xs"
                placeholder="--"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Width (studs)</label>
              <Input
                type="number"
                step="1"
                value={studsW}
                onChange={e => setStudsW(e.target.value)}
                disabled={isLoading}
                className="h-7 text-xs"
                placeholder="--"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Depth (studs)</label>
              <Input
                type="number"
                step="1"
                value={studsD}
                onChange={e => setStudsD(e.target.value)}
                disabled={isLoading}
                className="h-7 text-xs"
                placeholder="--"
              />
            </div>
          </div>
        )}
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
        <dl className="space-y-0.5 text-sm">
          {getDimCm(dimensions, 'height') != null ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Height</dt>
              <dd className="font-medium text-foreground">
                {displayDim(getDimCm(dimensions, 'height'), unit)}
              </dd>
            </div>
          ) : null}
          {getDimCm(dimensions, 'width') != null ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Width</dt>
              <dd className="font-medium text-foreground">
                {displayDim(getDimCm(dimensions, 'width'), unit)}
              </dd>
            </div>
          ) : null}
          {getDimCm(dimensions, 'depth') != null ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Depth</dt>
              <dd className="font-medium text-foreground">
                {displayDim(getDimCm(dimensions, 'depth'), unit)}
              </dd>
            </div>
          ) : null}
          {getStuds(dimensions, 'width') != null || getStuds(dimensions, 'depth') != null ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Studs</dt>
              <dd className="font-medium text-foreground">
                {getStuds(dimensions, 'width') ?? '--'} x {getStuds(dimensions, 'depth') ?? '--'}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">Not specified</p>
      )}
      <div className="absolute top-0 right-0 flex gap-0.5 opacity-0 group-hover/dims:opacity-100 transition-opacity">
        {hasDimensions && unit !== 'studs' ? (
          <div className="flex gap-0.5">
            {(['cm', 'mm', 'inches'] as Unit[]).map(u => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`px-1 py-0.5 text-xs rounded transition-colors ${
                  unit === u
                    ? 'bg-foreground/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {UNIT_LABELS[u]}
              </button>
            ))}
          </div>
        ) : null}
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
