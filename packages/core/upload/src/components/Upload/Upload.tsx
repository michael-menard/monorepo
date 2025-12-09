import * as React from 'react'
import type { BaseUploadProps } from '../../types/index.js'
import { useUpload } from '../../hooks/useUpload.js'
import { UploadArea } from '../UploadArea/UploadArea.js'
import { UploadModal } from '../UploadModal/UploadModal.js'

export interface UploadProps extends BaseUploadProps {
  children?: React.ReactNode
}

/**
 * Unified Upload component that can render in different modes:
 * - inline: Renders upload area directly in the component tree
 * - modal: Renders a button that opens upload in a modal
 * - avatar: Specialized mode for avatar uploads with circular preview
 */
export const Upload = React.forwardRef<HTMLDivElement, UploadProps>(
  (
    {
      mode = 'inline',
      config,
      preset,
      onUploadStart,
      onUploadProgress,
      onUploadComplete,
      onUploadError,
      onFilesChange,
      disabled = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const upload = useUpload({
      config,
      onUploadStart,
      onUploadProgress,
      onUploadComplete,
      onUploadError,
      onFilesChange,
    })

    const [isModalOpen, setIsModalOpen] = React.useState(false)

    const handleOpenModal = React.useCallback(() => {
      if (!disabled) {
        setIsModalOpen(true)
      }
    }, [disabled])

    const handleCloseModal = React.useCallback(() => {
      setIsModalOpen(false)
    }, [])

    // Render based on mode
    switch (mode) {
      case 'modal':
        return (
          <>
            <div ref={ref} className={className} {...props}>
              {children || (
                <button
                  type="button"
                  onClick={handleOpenModal}
                  disabled={disabled}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  Upload Files
                </button>
              )}
            </div>

            <UploadModal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              upload={upload}
              config={config}
              preset={preset}
              disabled={disabled}
            />
          </>
        )

      case 'avatar':
        return (
          <div ref={ref} className={`inline-block ${className || ''}`} {...props}>
            <UploadArea
              upload={upload}
              config={config}
              preset={preset}
              disabled={disabled}
              variant="avatar"
            />
          </div>
        )

      case 'inline':
      default:
        return (
          <div ref={ref} className={className} {...props}>
            <UploadArea upload={upload} config={config} preset={preset} disabled={disabled} />
            {children}
          </div>
        )
    }
  },
)

Upload.displayName = 'Upload'
