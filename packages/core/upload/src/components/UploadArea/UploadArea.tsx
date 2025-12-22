/**
 * Story 3.1.17: UploadArea Component
 *
 * Drag-and-drop file upload area with keyboard alternative and accessibility features.
 * Supports file type restrictions, multiple files, and different variants.
 */

import * as React from 'react'
import type { UploadConfig, UploadPreset } from '../../types/index.js'
import type { UseUploadReturn } from '../../hooks/useUpload.js'
import { useDragAndDrop } from '../../hooks/useDragAndDrop.js'

export interface UploadAreaProps {
  /** Upload hook instance */
  upload: UseUploadReturn
  /** Upload configuration */
  config?: UploadConfig
  /** Preset configuration name or object */
  preset?: string | UploadPreset
  /** Whether the upload area is disabled */
  disabled?: boolean
  /** Visual variant */
  variant?: 'default' | 'avatar'
  /** Additional CSS classes */
  className?: string
  /** Accessible label for the drop zone */
  'aria-label'?: string
  /** ID of element describing the drop zone */
  'aria-describedby'?: string
  /** Callback when files are added (for live region announcements) */
  onFilesAdded?: (count: number) => void
}

export const UploadArea = React.forwardRef<HTMLDivElement, UploadAreaProps>(
  (
    {
      upload,
      config,
      disabled = false,
      variant = 'default',
      className,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      onFilesAdded,
      ...props
    },
    ref,
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Wrap addFiles to trigger onFilesAdded callback
    const handleFilesDropped = React.useCallback(
      (files: File[]) => {
        upload.addFiles(files)
        onFilesAdded?.(files.length)
      },
      [upload, onFilesAdded],
    )

    const dragAndDrop = useDragAndDrop({
      onFilesDropped: handleFilesDropped,
      accept: config?.acceptedFileTypes,
      multiple: config?.multiple,
      disabled,
    })

    // Handle keyboard activation (Enter/Space)
    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent) => {
        if (disabled) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          inputRef.current?.click()
        }
      },
      [disabled],
    )

    const baseClasses =
      variant === 'avatar'
        ? 'w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        : 'border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'

    const dragClasses = dragAndDrop.isDragActive
      ? 'border-blue-500 bg-blue-50'
      : dragAndDrop.isDragReject
        ? 'border-red-500 bg-red-50'
        : ''

    const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''

    // Format accepted file types for display
    const formatAcceptedTypes = (types: string[]): string => {
      return types
        .filter(t => t !== '*/*')
        .map(t => {
          if (t.endsWith('/*')) return t.replace('/*', '')
          if (t.startsWith('.')) return t.toUpperCase()
          if (t.includes('/')) return t.split('/')[1]?.toUpperCase()
          return t
        })
        .join(', ')
    }

    const defaultAriaLabel =
      variant === 'avatar'
        ? 'Upload avatar image. Press Enter or Space to browse files.'
        : 'Drop zone. Drag and drop files here, or press Enter or Space to browse files.'

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${dragClasses} ${disabledClasses} ${className || ''}`}
        {...dragAndDrop.getRootProps()}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label={ariaLabel || defaultAriaLabel}
        aria-describedby={ariaDescribedBy}
        aria-disabled={disabled}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <input ref={inputRef} {...dragAndDrop.getInputProps()} aria-hidden="true" />

        {variant === 'avatar' ? (
          <div className="text-xs text-gray-500" aria-hidden="true">
            {upload.files.length > 0 ? '✓' : '+'}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-lg font-medium text-gray-700" aria-hidden="true">
              {dragAndDrop.isDragActive
                ? dragAndDrop.isDragReject
                  ? 'File type not accepted'
                  : 'Drop files here'
                : 'Drag & drop files here'}
            </div>
            <div className="text-sm text-gray-500">
              or{' '}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  inputRef.current?.click()
                }}
                className="text-blue-500 hover:text-blue-600 underline focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={disabled}
                aria-label="Browse files from your computer"
              >
                browse files
              </button>
            </div>
            {config?.acceptedFileTypes &&
            config.acceptedFileTypes.length > 0 &&
            !config.acceptedFileTypes.includes('*/*') ? (
              <div className="text-xs text-gray-400">
                Accepted: {formatAcceptedTypes(config.acceptedFileTypes)}
              </div>
            ) : null}
          </div>
        )}
      </div>
    )
  },
)

UploadArea.displayName = 'UploadArea'
