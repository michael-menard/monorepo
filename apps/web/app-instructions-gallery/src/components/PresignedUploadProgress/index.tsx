/**
 * PresignedUploadProgress Component
 * Story INST-1105: Upload Instructions (Presigned >10MB)
 *
 * Features:
 * - AC11: Progress bar updates during upload
 * - AC13: Upload speed displayed
 * - AC14: Cancel button aborts active upload
 * - AC27: Retry button re-attempts failed uploads
 */

import { FileText, X, RefreshCw, Loader2, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { Button, Card, Progress } from '@repo/app-component-library'
import type { PresignedUploadProgressProps } from './__types__'

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

export function PresignedUploadProgress({
  file,
  status,
  progress,
  error,
  onCancel,
  onRetry,
  onRemove,
}: PresignedUploadProgressProps) {
  const isActive =
    status === 'creating_session' || status === 'uploading' || status === 'completing'
  const isComplete = status === 'success'
  const isFailed = status === 'error' || status === 'expired'
  const isCanceled = status === 'canceled'

  /**
   * Get status icon based on current state
   */
  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />
      case 'error':
      case 'expired':
        return <AlertCircle className="w-5 h-5 text-destructive" aria-hidden="true" />
      case 'canceled':
        return <XCircle className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
      case 'creating_session':
      case 'uploading':
      case 'completing':
        return <Loader2 className="w-5 h-5 text-primary animate-spin" aria-hidden="true" />
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
    }
  }

  /**
   * Get status text based on current state
   */
  const getStatusText = () => {
    switch (status) {
      case 'creating_session':
        return 'Preparing upload...'
      case 'uploading':
        return progress ? `Uploading... ${progress.percent}%` : 'Uploading...'
      case 'completing':
        return 'Finalizing...'
      case 'success':
        return 'Upload complete'
      case 'error':
        return error || 'Upload failed'
      case 'expired':
        return 'Session expired'
      case 'canceled':
        return 'Upload canceled'
      default:
        return 'Pending'
    }
  }

  return (
    <Card className="p-4" data-testid="presigned-upload-progress">
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="flex-shrink-0 mt-0.5">{getStatusIcon()}</div>

        {/* File Info & Progress */}
        <div className="flex-1 min-w-0">
          {/* File Name */}
          <p className="text-sm font-medium truncate" title={file.name}>
            {file.name}
          </p>

          {/* File Size */}
          <p className="text-xs text-muted-foreground mb-2">{formatFileSize(file.size)}</p>

          {/* Progress Bar (AC11) */}
          {isActive && progress ? (
            <div className="mb-2">
              <Progress
                value={progress.percent}
                className="h-2"
                aria-label={`Upload progress: ${progress.percent}%`}
              />
              <div className="flex justify-between mt-1">
                {/* Percentage */}
                <span className="text-xs text-muted-foreground">{progress.percent}%</span>
                {/* Upload Speed (AC13) */}
                <span className="text-xs text-muted-foreground">{progress.speedDisplay}</span>
              </div>
            </div>
          ) : null}

          {/* Status Text */}
          <p
            className={`text-xs ${isFailed ? 'text-destructive' : 'text-muted-foreground'}`}
            role={isFailed ? 'alert' : undefined}
          >
            {getStatusText()}
          </p>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex gap-2">
          {/* Cancel Button (AC14) */}
          {isActive ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              aria-label="Cancel upload"
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          ) : null}

          {/* Retry Button (AC27) */}
          {isFailed || isCanceled ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRetry}
              aria-label="Retry upload"
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          ) : null}

          {/* Remove Button */}
          {isComplete || isFailed || isCanceled ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              aria-label="Remove file"
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
