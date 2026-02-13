/**
 * Story 3.1.10: Uploader File Item Component
 *
 * Displays a single file in the upload queue with progress, status, and actions.
 * Accessible with proper ARIA attributes and keyboard navigation.
 */

import { memo, useCallback } from 'react'
import { X, RefreshCw, Check, AlertCircle, Clock, Ban, FileText, Image } from 'lucide-react'
import { Button, Progress, AppBadge, cn } from '@repo/app-component-library'
import { type UploadStatus } from '@repo/upload/types'
import type { UploaderFileItemProps } from './__types__'

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Get status badge variant
 */
function getStatusVariant(
  status: UploadStatus,
): 'default' | 'success' | 'destructive' | 'warning' | 'secondary' {
  switch (status) {
    case 'success':
      return 'success'
    case 'failed':
    case 'expired':
      return 'destructive'
    case 'canceled':
      return 'secondary'
    case 'uploading':
      return 'default'
    case 'queued':
    default:
      return 'warning'
  }
}

/**
 * Get status label
 */
function getStatusLabel(status: UploadStatus): string {
  switch (status) {
    case 'queued':
      return 'Queued'
    case 'uploading':
      return 'Uploading'
    case 'success':
      return 'Complete'
    case 'failed':
      return 'Failed'
    case 'canceled':
      return 'Canceled'
    case 'expired':
      return 'Expired'
    default:
      return status
  }
}

/**
 * Get status icon
 */
function StatusIcon({ status }: { status: UploadStatus }) {
  switch (status) {
    case 'success':
      return <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
    case 'failed':
    case 'expired':
      return <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
    case 'canceled':
      return <Ban className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    case 'queued':
      return <Clock className="h-4 w-4 text-yellow-500" aria-hidden="true" />
    default:
      return null
  }
}

/**
 * Get file type icon
 */
function FileTypeIcon({ category }: { category: string }) {
  if (category === 'instruction') {
    return <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
  }
  return <Image className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
}

/**
 * Uploader file item component
 */
export const UploaderFileItem = memo(function UploaderFileItem({
  file,
  onCancel,
  onRetry,
  onRemove,
  disabled = false,
}: UploaderFileItemProps) {
  const handleCancel = useCallback(() => {
    onCancel?.(file.id)
  }, [file.id, onCancel])

  const handleRetry = useCallback(() => {
    onRetry?.(file.id)
  }, [file.id, onRetry])

  const handleRemove = useCallback(() => {
    onRemove?.(file.id)
  }, [file.id, onRemove])

  const showProgress = file.status === 'uploading'
  const showRetry = file.status === 'failed' || file.status === 'expired'
  const showCancel = file.status === 'uploading' || file.status === 'queued'
  const showRemove = file.status === 'success' || file.status === 'canceled'

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border bg-card',
        file.status === 'failed' && 'border-destructive/50 bg-destructive/5',
        file.status === 'expired' && 'border-yellow-500/50 bg-yellow-500/5',
        file.status === 'success' && 'border-green-500/50 bg-green-500/5',
      )}
      role="listitem"
      aria-label={`${file.name}, ${getStatusLabel(file.status)}`}
    >
      {/* File icon */}
      <div className="flex-shrink-0 mt-0.5">
        <FileTypeIcon category={file.category} />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate" title={file.name}>
            {file.name}
          </span>
          <AppBadge variant={getStatusVariant(file.status)} size="sm">
            <StatusIcon status={file.status} />
            <span className="ml-1">{getStatusLabel(file.status)}</span>
          </AppBadge>
        </div>

        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <span>{formatFileSize(file.size)}</span>
          <span>•</span>
          <span className="capitalize">{file.category.replace('-', ' ')}</span>
        </div>

        {/* Progress bar */}
        {showProgress ? (
          <div className="mt-2">
            <Progress
              value={file.progress}
              max={100}
              label={`Uploading ${file.name}`}
              showValue
              valueText={`${file.progress}%`}
              className="h-2"
            />
          </div>
        ) : null}

        {/* Error message */}
        {file.errorMessage ? (
          <p className="mt-1 text-sm text-destructive" role="alert" aria-live="polite">
            {file.errorMessage}
          </p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {showCancel ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            disabled={disabled}
            aria-label={`Cancel upload of ${file.name}`}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}

        {showRetry ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRetry}
            disabled={disabled}
            aria-label={`Retry upload of ${file.name}`}
            className="h-8 w-8"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        ) : null}

        {showRemove ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            disabled={disabled}
            aria-label={`Remove ${file.name}`}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
})
