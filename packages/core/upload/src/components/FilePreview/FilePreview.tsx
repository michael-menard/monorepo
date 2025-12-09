/**
 * Story 3.1.17: FilePreview Component
 *
 * Displays file preview with thumbnail, name, size, and status.
 * Handles HEIC/HEIF files with placeholder since browsers can't display them.
 * Accessible with proper ARIA attributes.
 */

import * as React from 'react'
import type { UploadFile } from '../../types/index.js'

/** HEIC/HEIF MIME types that cannot be previewed in browsers */
const NON_PREVIEWABLE_IMAGE_TYPES = ['image/heic', 'image/heif']

/** Check if file type can be previewed in browser */
const canPreviewInBrowser = (mimeType: string): boolean => {
  if (!mimeType.startsWith('image/')) return false
  return !NON_PREVIEWABLE_IMAGE_TYPES.includes(mimeType.toLowerCase())
}

/** Check if file is HEIC/HEIF */
const isHeicFile = (file: File): boolean => {
  const mimeType = file.type.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase()
  return (
    NON_PREVIEWABLE_IMAGE_TYPES.includes(mimeType) || extension === 'heic' || extension === 'heif'
  )
}

export interface FilePreviewProps {
  /** File to preview */
  file: UploadFile
  /** Callback when remove button is clicked */
  onRemove?: (fileId: string) => void
  /** Additional CSS classes */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

export const FilePreview = React.forwardRef<HTMLDivElement, FilePreviewProps>(
  ({ file, onRemove, className, size = 'md', ...props }, ref) => {
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
    const [previewError, setPreviewError] = React.useState(false)

    const sizeClasses = {
      sm: { container: 'w-10 h-10', text: 'text-[10px]' },
      md: { container: 'w-12 h-12', text: 'text-xs' },
      lg: { container: 'w-16 h-16', text: 'text-sm' },
    }

    React.useEffect(() => {
      // Reset state when file changes
      setPreviewError(false)

      // Only create preview URL for previewable image types
      if (canPreviewInBrowser(file.file.type)) {
        const url = URL.createObjectURL(file.file)
        setPreviewUrl(url)
        return () => URL.revokeObjectURL(url)
      }

      setPreviewUrl(null)
      return undefined
    }, [file.file])

    const getStatusColor = () => {
      switch (file.status) {
        case 'completed':
          return 'text-green-600'
        case 'error':
          return 'text-red-600'
        case 'uploading':
          return 'text-blue-600'
        case 'processing':
          return 'text-yellow-600'
        default:
          return 'text-gray-600'
      }
    }

    const getStatusLabel = () => {
      switch (file.status) {
        case 'uploading':
          return `${file.progress}% uploaded`
        case 'completed':
          return 'Upload complete'
        case 'error':
          return file.error || 'Upload failed'
        case 'pending':
          return 'Pending upload'
        case 'processing':
          return 'Processing'
        case 'cancelled':
          return 'Cancelled'
        default:
          return file.status
      }
    }

    const formatFileSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }

    const fileExtension = file.file.name.split('.').pop()?.toUpperCase() || 'FILE'
    const isHeic = isHeicFile(file.file)
    const showPreview = previewUrl && !previewError

    return (
      <div
        ref={ref}
        className={`border rounded-lg p-3 ${className || ''}`}
        role="listitem"
        aria-label={`${file.file.name}, ${getStatusLabel()}`}
        {...props}
      >
        <div className="flex items-start space-x-3">
          {/* Preview / Thumbnail */}
          <div className="flex-shrink-0" aria-hidden="true">
            {showPreview ? (
              <img
                src={previewUrl}
                alt=""
                className={`${sizeClasses[size].container} object-cover rounded`}
                onError={() => setPreviewError(true)}
              />
            ) : (
              <div
                className={`${sizeClasses[size].container} bg-gray-200 rounded flex flex-col items-center justify-center`}
              >
                {isHeic ? (
                  <>
                    <span className={`${sizeClasses[size].text} text-gray-500 font-medium`}>
                      HEIC
                    </span>
                    <span className="text-[8px] text-gray-400">Preview N/A</span>
                  </>
                ) : (
                  <span className={`${sizeClasses[size].text} text-gray-500`}>{fileExtension}</span>
                )}
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate" title={file.file.name}>
              {file.file.name}
            </div>
            <div className="text-xs text-gray-500">{formatFileSize(file.file.size)}</div>
            <div className={`text-xs ${getStatusColor()}`} role="status" aria-live="polite">
              {file.status === 'uploading' && `${file.progress}%`}
              {file.status === 'completed' && 'Completed'}
              {file.status === 'error' && (file.error || 'Error')}
              {file.status === 'pending' && 'Pending'}
              {file.status === 'processing' && 'Processing'}
              {file.status === 'cancelled' && 'Cancelled'}
            </div>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0">
            {onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1"
                aria-label={`Remove ${file.file.name}`}
              >
                <span aria-hidden="true">✕</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Progress Bar */}
        {file.status === 'uploading' && (
          <div
            className="mt-2"
            role="progressbar"
            aria-valuenow={file.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Uploading ${file.file.name}`}
          >
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${file.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    )
  },
)

FilePreview.displayName = 'FilePreview'
