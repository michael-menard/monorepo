/**
 * InstancesTable
 *
 * Per-copy tracking table for set instances. Each row represents a physical
 * copy of the set in the user's collection with click-to-edit inline editing.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { z } from 'zod'
import {
  Badge,
  Button,
  ConfirmationDialog,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
  useToast,
} from '@repo/app-component-library'
import {
  useCreateSetInstanceMutation,
  useUpdateSetInstanceMutation,
  useDeleteSetInstanceMutation,
} from '@repo/api-client/rtk/sets-api'
import type { SetInstance } from '@repo/api-client/schemas/sets'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

const InstancesTablePropsSchema = z.object({
  setId: z.string().uuid(),
  instances: z.array(z.any()),
  className: z.string().optional(),
})

export type InstancesTableProps = z.infer<typeof InstancesTablePropsSchema>

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONDITION_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
] as const

const COMPLETENESS_OPTIONS = [
  { value: 'sealed', label: 'Sealed' },
  { value: 'complete', label: 'Complete' },
  { value: 'incomplete', label: 'Incomplete' },
] as const

const BUILD_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'parted_out', label: 'Parted Out' },
] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLabel(value: string | null | undefined, fallback = '\u2014'): string {
  if (!value) return fallback
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '\u2014'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '\u2014'
  return d.toLocaleDateString()
}

function formatCurrency(value: string | null | undefined): string {
  if (!value) return '\u2014'
  const num = parseFloat(value)
  if (Number.isNaN(num)) return '\u2014'
  return `$${num.toFixed(2)}`
}

// ---------------------------------------------------------------------------
// Editable Cell Components
// ---------------------------------------------------------------------------

function EditableSelect({
  value,
  options,
  onSave,
}: {
  value: string | null | undefined
  options: ReadonlyArray<{ value: string; label: string }>
  onSave: (val: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (editing && selectRef.current) {
      selectRef.current.focus()
    }
  }, [editing])

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 1200)
      return () => clearTimeout(t)
    }
  }, [saved])

  if (editing) {
    return (
      <select
        ref={selectRef}
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
        defaultValue={value ?? ''}
        onBlur={e => {
          setEditing(false)
          if (e.target.value !== (value ?? '')) {
            onSave(e.target.value)
            setSaved(true)
          }
        }}
        onChange={e => {
          setEditing(false)
          if (e.target.value !== (value ?? '')) {
            onSave(e.target.value)
            setSaved(true)
          }
        }}
      >
        <option value="">--</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity"
      onClick={() => setEditing(true)}
      aria-label="Click to edit"
    >
      <Badge variant={value ? 'secondary' : 'outline'} className="text-xs">
        {formatLabel(value)}
      </Badge>
      {saved ? <Check className="h-3 w-3 text-green-500" /> : null}
    </button>
  )
}

function EditableBoolean({
  value,
  onSave,
}: {
  value: boolean | null | undefined
  onSave: (val: boolean) => void
}) {
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 1200)
      return () => clearTimeout(t)
    }
  }, [saved])

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity"
      onClick={() => {
        onSave(!value)
        setSaved(true)
      }}
      aria-label="Toggle includes minifigs"
    >
      <Badge variant={value ? 'default' : 'outline'} className="text-xs">
        {value ? 'Yes' : value === false ? 'No' : '\u2014'}
      </Badge>
      {saved ? <Check className="h-3 w-3 text-green-500" /> : null}
    </button>
  )
}

function EditableText({
  value,
  type = 'text',
  onSave,
  placeholder,
}: {
  value: string | null | undefined
  type?: 'text' | 'number' | 'date'
  onSave: (val: string) => void
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editing])

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 1200)
      return () => clearTimeout(t)
    }
  }, [saved])

  const displayValue =
    type === 'number'
      ? formatCurrency(value)
      : type === 'date'
        ? formatDate(value)
        : value || '\u2014'

  if (editing) {
    const inputValue = type === 'date' && value ? value.slice(0, 10) : (value ?? '')

    return (
      <Input
        ref={inputRef}
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        className="h-8 w-full text-sm"
        defaultValue={inputValue}
        placeholder={placeholder}
        onBlur={e => {
          setEditing(false)
          const newVal = e.target.value
          if (newVal !== (value ?? '')) {
            onSave(newVal)
            setSaved(true)
          }
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            ;(e.target as HTMLInputElement).blur()
          }
          if (e.key === 'Escape') {
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity text-sm',
        !value && 'text-muted-foreground',
      )}
      onClick={() => setEditing(true)}
      aria-label="Click to edit"
    >
      <span>{displayValue}</span>
      {saved ? <Check className="h-3 w-3 text-green-500" /> : null}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Instance Row
// ---------------------------------------------------------------------------

function InstanceRow({
  instance,
  index,
  setId,
}: {
  instance: SetInstance
  index: number
  setId: string
}) {
  const [updateInstance] = useUpdateSetInstanceMutation()
  const [deleteInstance] = useDeleteSetInstanceMutation()
  const { success: toastSuccess, error: toastError } = useToast()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleUpdate = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        await updateInstance({
          setId,
          instanceId: instance.id,
          data,
        }).unwrap()
        toastSuccess('Updated', 'Instance updated.')
      } catch (err) {
        toastError(err, 'Failed to update instance')
      }
    },
    [setId, instance.id, updateInstance, toastSuccess, toastError],
  )

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteInstance({ setId, instanceId: instance.id }).unwrap()
      toastSuccess('Deleted', 'Copy removed from collection.')
    } catch (err) {
      toastError(err, 'Failed to delete instance')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <TableRow>
        <TableCell className="text-muted-foreground font-mono text-xs w-10">{index + 1}</TableCell>
        <TableCell>
          <EditableSelect
            value={instance.condition}
            options={CONDITION_OPTIONS}
            onSave={val => handleUpdate({ condition: val || undefined })}
          />
        </TableCell>
        <TableCell>
          <EditableSelect
            value={instance.completeness}
            options={COMPLETENESS_OPTIONS}
            onSave={val => handleUpdate({ completeness: val || undefined })}
          />
        </TableCell>
        <TableCell>
          <EditableSelect
            value={instance.buildStatus}
            options={BUILD_STATUS_OPTIONS}
            onSave={val => handleUpdate({ buildStatus: val || undefined })}
          />
        </TableCell>
        <TableCell>
          <EditableBoolean
            value={instance.includesMinifigs}
            onSave={val => handleUpdate({ includesMinifigs: val })}
          />
        </TableCell>
        <TableCell>
          <EditableText
            value={instance.purchasePrice}
            type="number"
            onSave={val => handleUpdate({ purchasePrice: val || undefined })}
            placeholder="0.00"
          />
        </TableCell>
        <TableCell>
          <EditableText
            value={instance.purchaseDate}
            type="date"
            onSave={val => {
              if (val) {
                handleUpdate({ purchaseDate: new Date(val).toISOString() })
              }
            }}
          />
        </TableCell>
        <TableCell className="max-w-[200px]">
          <EditableText
            value={instance.notes}
            onSave={val => handleUpdate({ notes: val || undefined })}
            placeholder="Add notes..."
          />
        </TableCell>
        <TableCell className="w-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
            aria-label="Delete copy"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>

      <ConfirmationDialog
        title="Delete this copy?"
        description="Are you sure you want to remove this copy from your collection? This cannot be undone."
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        variant="destructive"
        open={showDeleteDialog}
        onOpenChange={open => {
          if (!open && !isDeleting) setShowDeleteDialog(false)
        }}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function InstancesEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Completeness</TableHead>
            <TableHead>Build Status</TableHead>
            <TableHead>Minifigs</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="opacity-40">
            <TableCell className="font-mono text-xs">1</TableCell>
            <TableCell>
              <Skeleton className="h-5 w-14" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-8" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-14" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-7" />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div className="flex items-center justify-center py-6">
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add your first copy
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function InstancesTable({ setId, instances, className }: InstancesTableProps) {
  const [createInstance] = useCreateSetInstanceMutation()
  const { success: toastSuccess, error: toastError } = useToast()
  const [isAdding, setIsAdding] = useState(false)

  const handleAddCopy = async () => {
    setIsAdding(true)
    try {
      await createInstance({
        setId,
        data: {
          condition: 'new',
          completeness: 'complete',
          buildStatus: 'not_started',
        },
      }).unwrap()
      toastSuccess('Added', 'New copy added to your collection.')
    } catch (err) {
      toastError(err, 'Failed to add copy')
    } finally {
      setIsAdding(false)
    }
  }

  const typedInstances = instances as SetInstance[]

  if (typedInstances.length === 0) {
    return (
      <div className={className}>
        <InstancesEmptyState onAdd={handleAddCopy} />
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Completeness</TableHead>
              <TableHead>Build Status</TableHead>
              <TableHead>Minifigs</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {typedInstances.map((instance, index) => (
              <InstanceRow key={instance.id} instance={instance} index={index} setId={setId} />
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-3">
        <Button variant="outline" size="sm" onClick={handleAddCopy} disabled={isAdding}>
          <Plus className="mr-2 h-4 w-4" />
          {isAdding ? 'Adding...' : 'Add Copy'}
        </Button>
      </div>
    </div>
  )
}
