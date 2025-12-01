import * as React from 'react'
import type { UploadFile } from '../../types/index.js'

export interface FilePreviewProps {
  file: UploadFile
  onRemove?: (fileId: string) => void
  className?: string
}

export const FilePreview = React.forwardRef<HTMLDivElement, FilePreviewProps>(
  ({ file, onRemove, className, ...props }, ref) => {
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)

    React.useEffect(() => {
      if (file.file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file.file)
        setPreviewUrl(url)
        return () => URL.revokeObjectURL(url)
      }
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

    return (
      <div ref={ref} className={`border rounded-lg p-3 ${className || ''}`} {...props}>
        <div className="flex items-start space-x-3">
          {/* Preview */}
          <div className="flex-shrink-0">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={file.file.name}
                className="w-12 h-12 object-cover rounded"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                <span className="text-xs text-gray-500">
                  {file.file.name.split('.').pop()?.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{file.file.name}</div>
            <div className="text-xs text-gray-500">
              {(file.file.size / 1024 / 1024).toFixed(2)} MB
            </div>
            <div className={`text-xs ${getStatusColor()}`}>
              {file.status === 'uploading' && `${file.progress}%`}
              {file.status === 'completed' && 'Completed'}
              {file.status === 'error' && (file.error || 'Error')}
              {file.status === 'pending' && 'Pending'}
              {file.status === 'processing' && 'Processing'}
            </div>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0">
            {onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="text-gray-400 hover:text-red-600"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>

        {/* Progress Bar */}
        {file.status === 'uploading' && (
          <div className="mt-2">
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
