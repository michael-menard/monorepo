/**
 * REPA-0510: Uploader List Component
 * Migrated from apps/web/main-app/src/components/Uploader/UploaderList
 *
 * Displays grouped list of files with aggregate progress header.
 * Groups files by category with accessible list structure.
 */

import { useMemo } from 'react'
import { FileText, Image, List, ImageIcon } from 'lucide-react'
import { Progress, Card, CardContent, CardHeader, CardTitle } from '@repo/app-component-library'
import { type UploaderFileItem as FileItemType, type FileCategory } from '@repo/upload/types'
import { UploaderFileItem } from '../UploaderFileItem'
import type { UploaderListProps } from './__types__'

/**
 * Category display info
 */
const CATEGORY_INFO: Record<FileCategory, { label: string; icon: typeof FileText }> = {
  instruction: { label: 'Instructions', icon: FileText },
  'parts-list': { label: 'Parts Lists', icon: List },
  image: { label: 'Gallery Images', icon: Image },
  thumbnail: { label: 'Thumbnail', icon: ImageIcon },
}

/**
 * Uploader list component
 */
export function UploaderList({
  state,
  onCancel,
  onRetry,
  onRemove,
  disabled = false,
}: UploaderListProps) {
  // Group files by category
  const groupedFiles = useMemo(() => {
    const groups: Record<FileCategory, FileItemType[]> = {
      instruction: [],
      'parts-list': [],
      image: [],
      thumbnail: [],
    }

    state.files.forEach(file => {
      if (groups[file.category]) {
        groups[file.category].push(file)
      }
    })

    return groups
  }, [state.files])

  // Get non-empty categories in display order
  const categories = useMemo(() => {
    const order: FileCategory[] = ['instruction', 'parts-list', 'thumbnail', 'image']
    return order.filter(cat => groupedFiles[cat].length > 0)
  }, [groupedFiles])

  if (state.files.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Aggregate progress header */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Upload Progress</span>
            <span className="text-sm font-normal text-muted-foreground">
              {state.successCount} of {state.files.length} complete
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress
            value={state.overallProgress}
            max={100}
            label="Overall upload progress"
            showValue
            valueText={`${state.overallProgress}%`}
            className="h-3"
          />

          {/* Status summary */}
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            {state.queuedCount > 0 && <span>{state.queuedCount} queued</span>}
            {state.uploadingCount > 0 && <span>{state.uploadingCount} uploading</span>}
            {state.failedCount > 0 && (
              <span className="text-destructive">{state.failedCount} failed</span>
            )}
            {state.expiredCount > 0 && (
              <span className="text-yellow-600">{state.expiredCount} expired</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File groups */}
      {categories.map(category => {
        const info = CATEGORY_INFO[category]
        const files = groupedFiles[category]
        const Icon = info.icon

        return (
          <div key={category} className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
              {info.label} ({files.length})
            </h3>

            <div role="list" aria-label={`${info.label} files`} className="space-y-2">
              {files.map(file => (
                <UploaderFileItem
                  key={file.id}
                  file={file}
                  onCancel={onCancel}
                  onRetry={onRetry}
                  onRemove={onRemove}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Announcements for screen readers */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {state.isComplete ? 'All files uploaded successfully.' : null}
        {state.failedCount > 0 && `${state.failedCount} files failed to upload.`}
      </div>
    </div>
  )
}
