/**
 * FileDownloadButton Component
 * Story INST-1107: Download Files
 *
 * Features:
 * - AC-16: Component created in components/ directory
 * - AC-17: Props: mocId, fileId, fileName, className
 * - AC-18: Download icon + "Download" text
 * - AC-19-20: Loading spinner during API call, button disabled
 * - AC-21-22: Accessible (aria-label, aria-busy)
 * - AC-23: Focus visible indicator
 * - AC-24-25: Calls RTK Query, triggers browser download
 * - AC-26-27: Error toast, returns to ready state
 * - AC-28-29: Keyboard accessible, touch target ≥44px
 * - AC-30-31: Uses Button primitive, design tokens only
 */

import { useCallback, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button, showErrorToast, cn } from '@repo/app-component-library'
import { useLazyGetFileDownloadUrlQuery } from '@repo/api-client'
import type { FileDownloadButtonProps } from './__types__'

export function FileDownloadButton({
  mocId,
  fileId,
  fileName,
  className,
}: FileDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [getFileDownloadUrl] = useLazyGetFileDownloadUrlQuery()

  /**
   * Handle download click (AC-24, AC-25)
   * 1. Fetch presigned URL from API
   * 2. Trigger browser download via window.location.href
   */
  const handleDownload = useCallback(async () => {
    if (isDownloading) return

    setIsDownloading(true)

    try {
      // AC-24: Call RTK Query to get presigned URL
      const result = await getFileDownloadUrl({ mocId, fileId }).unwrap()

      // AC-25: Trigger browser download via window.location.href
      window.location.href = result.downloadUrl
    } catch (error: any) {
      // AC-26: Show toast notification with user-friendly message
      const errorMessage =
        error?.data?.error === 'NOT_FOUND'
          ? 'File not found. It may have been removed.'
          : error?.data?.error === 'UNAUTHORIZED'
            ? 'You are not authorized to download this file.'
            : 'Download failed. Please try again.'
      showErrorToast(errorMessage)
    } finally {
      // AC-27: Return to ready state after success or error
      setIsDownloading(false)
    }
  }, [mocId, fileId, getFileDownloadUrl, isDownloading])

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={isDownloading}
      aria-label={`Download ${fileName}`}
      aria-busy={isDownloading}
      className={cn(
        // AC-23: Focus visible indicator
        'focus:ring-2 focus:ring-primary focus-visible:ring-2 focus-visible:ring-primary',
        // AC-29: Touch target ≥44x44px on mobile
        'min-h-[44px] min-w-[44px]',
        className,
      )}
      data-testid="file-download-button"
    >
      {isDownloading ? (
        // AC-19: Loading spinner during API call
        <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
      ) : (
        // AC-18: Download icon
        <Download className="w-4 h-4 mr-2" aria-hidden="true" />
      )}
      Download
    </Button>
  )
}
