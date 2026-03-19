import { useState, useEffect, useRef, startTransition } from 'react'
import {
  AppInput,
  CustomButton,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
} from '@repo/app-component-library'
import { Pencil, Check, X } from 'lucide-react'

export interface EditableFieldProps {
  label: string
  value: string | number | null | undefined
  isEditing: boolean
  onStartEdit: () => void
  onSave: (value: string | number) => void
  onCancel: () => void
  type?: 'text' | 'number'
  editable: boolean
  multiline?: boolean
  options?: string[]
}

export function EditableField({
  label,
  value,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  type = 'text',
  editable,
  multiline = false,
  options,
}: EditableFieldProps) {
  const [editValue, setEditValue] = useState(String(value ?? ''))
  const [isDebouncing, setIsDebouncing] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isEditing) {
      setEditValue(String(value ?? ''))
      setIsDebouncing(false)
    }
  }, [isEditing, value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setEditValue(newValue)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    setIsDebouncing(true)
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        if (type === 'number') {
          onSave(parseInt(newValue, 10) || 0)
        } else {
          onSave(newValue)
        }
        setIsDebouncing(false)
      })
    }, 500)
  }

  const handleSave = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (type === 'number') {
      onSave(parseInt(editValue, 10) || 0)
    } else {
      onSave(editValue)
    }
    setIsDebouncing(false)
  }

  if (!editable) {
    return (
      <div>
        <dt className="text-sm font-medium text-slate-400">{label}</dt>
        <dd className="text-slate-200">{value ?? '-'}</dd>
      </div>
    )
  }

  if (isEditing) {
    if (options) {
      return (
        <div>
          <dt className="text-sm font-medium text-slate-400 mb-1">{label}</dt>
          <dd className="flex items-center gap-2">
            <Select
              value={editValue}
              defaultOpen
              onValueChange={selected => {
                setEditValue(selected)
                onSave(selected)
              }}
            >
              <SelectTrigger className="h-8 text-sm bg-slate-800/50 border-slate-600/50 text-slate-100 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {options.map(opt => (
                  <SelectItem
                    key={opt}
                    value={opt}
                    className="focus:bg-slate-700 focus:text-slate-100 text-slate-200"
                  >
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CustomButton
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="h-8 w-8 text-red-400 hover:text-red-300 shrink-0"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </CustomButton>
          </dd>
        </div>
      )
    }

    return (
      <div>
        <dt className="text-sm font-medium text-slate-400 mb-1">{label}</dt>
        <dd className="flex flex-col gap-2">
          {multiline ? (
            <Textarea
              value={editValue}
              onChange={handleChange}
              rows={4}
              className="text-sm bg-slate-800/50 border-slate-600/50 text-slate-100 resize-y"
            />
          ) : (
            <AppInput
              type={type}
              value={editValue}
              onChange={handleChange}
              className="h-8 text-sm bg-slate-800/50 border-slate-600/50 text-slate-100"
            />
          )}
          <div className="flex items-center gap-2">
            {isDebouncing && <span className="text-xs text-slate-400 font-mono">saving...</span>}
            <CustomButton
              variant="ghost"
              size="icon"
              onClick={handleSave}
              className="h-8 w-8 text-green-400 hover:text-green-300"
              title="Save"
            >
              <Check className="h-4 w-4" />
            </CustomButton>
            <CustomButton
              variant="ghost"
              size="icon"
              onClick={() => {
                if (debounceRef.current) {
                  clearTimeout(debounceRef.current)
                }
                setIsDebouncing(false)
                onCancel()
              }}
              className="h-8 w-8 text-red-400 hover:text-red-300"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </CustomButton>
          </div>
        </dd>
      </div>
    )
  }

  if (multiline) {
    return (
      <div className="group">
        <div className="flex items-center gap-2 mb-1">
          <dt className="text-sm font-medium text-slate-400">{label}</dt>
          <CustomButton
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditValue(String(value ?? ''))
              onStartEdit()
            }}
            className="opacity-0 group-hover:opacity-100 h-5 w-5 text-slate-500 hover:text-cyan-400"
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </CustomButton>
        </div>
        <dd className="text-slate-300 text-sm leading-relaxed">{value ?? '-'}</dd>
      </div>
    )
  }

  return (
    <div>
      <dt className="text-sm font-medium text-slate-400">{label}</dt>
      <dd className="flex items-center gap-2 group">
        <span className="text-slate-200">{value ?? '-'}</span>
        <CustomButton
          variant="ghost"
          size="icon"
          onClick={() => {
            setEditValue(String(value ?? ''))
            onStartEdit()
          }}
          className="opacity-0 group-hover:opacity-100 h-6 w-6 text-slate-500 hover:text-cyan-400"
          title="Edit"
        >
          <Pencil className="h-3 w-3" />
        </CustomButton>
      </dd>
    </div>
  )
}
