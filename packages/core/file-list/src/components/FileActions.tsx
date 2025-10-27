import React from 'react'
import { Button } from '@repo/ui'
import { MoreHorizontal, Eye, Download, Trash2, Edit, Share2 } from 'lucide-react'
import type { FileItem, ActionConfig } from '../schemas'

export interface FileActionsProps {
  /** The file item these actions are for */
  file: FileItem

  /** Array of action configurations */
  actions: Array<{
    key: string
    config: ActionConfig
    onClick: (file: FileItem) => void
  }>

  /** Additional CSS classes */
  className?: string
}

export const FileActions: React.FC<FileActionsProps> = ({ file, actions, className = '' }) => {
  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      Eye,
      Download,
      Trash2,
      Edit,
      Share2,
      MoreHorizontal,
    }
    return iconMap[iconName] || MoreHorizontal
  }

  return (
    <div className={`flex items-center gap-1 justify-end ${className}`}>
      {actions.map(({ key, config, onClick }) => {
        const IconComponent = getIconComponent(config.icon)

        return (
          <Button
            key={key}
            variant={config.destructive ? 'ghost' : config.variant}
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation() // Prevent row click if table row is clickable
              onClick(file)
            }}
            disabled={config.disabled}
            className={`h-8 w-8 p-0 ${config.destructive ? 'text-destructive hover:text-destructive' : ''}`}
            title={config.tooltip}
          >
            <IconComponent className="h-4 w-4" />
          </Button>
        )
      })}
    </div>
  )
}

// Predefined common actions for convenience
export const createViewAction = (onView: (file: FileItem) => void) => ({
  key: 'view',
  config: {
    icon: 'Eye',
    tooltip: 'View file',
    variant: 'ghost' as const,
  },
  onClick: onView,
})

export const createDownloadAction = (onDownload: (file: FileItem) => void) => ({
  key: 'download',
  config: {
    icon: 'Download',
    tooltip: 'Download file',
    variant: 'ghost' as const,
  },
  onClick: onDownload,
})

export const createDeleteAction = (onDelete: (file: FileItem) => void) => ({
  key: 'delete',
  config: {
    icon: 'Trash2',
    tooltip: 'Delete file',
    variant: 'ghost' as const,
    destructive: true,
  },
  onClick: onDelete,
})

export const createEditAction = (onEdit: (file: FileItem) => void) => ({
  key: 'edit',
  config: {
    icon: 'Edit',
    tooltip: 'Edit file',
    variant: 'ghost' as const,
  },
  onClick: onEdit,
})

export const createShareAction = (onShare: (file: FileItem) => void) => ({
  key: 'share',
  config: {
    icon: 'Share2',
    tooltip: 'Share file',
    variant: 'ghost' as const,
  },
  onClick: onShare,
})

// Utility function to create common action sets
export const createCommonActions = (handlers: {
  onView?: (file: FileItem) => void
  onDownload?: (file: FileItem) => void
  onEdit?: (file: FileItem) => void
  onDelete?: (file: FileItem) => void
  onShare?: (file: FileItem) => void
}) => {
  const actions = []

  if (handlers.onView) actions.push(createViewAction(handlers.onView))
  if (handlers.onDownload) actions.push(createDownloadAction(handlers.onDownload))
  if (handlers.onEdit) actions.push(createEditAction(handlers.onEdit))
  if (handlers.onShare) actions.push(createShareAction(handlers.onShare))
  if (handlers.onDelete) actions.push(createDeleteAction(handlers.onDelete))

  return actions
}
