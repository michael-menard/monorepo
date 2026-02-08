/**
 * InspirationContextMenu Component
 *
 * Context menu (dropdown) for inspiration card actions.
 * Provides edit, add to album, link to MOC, and delete options.
 *
 * INSP-015: Delete Flows
 * INSP-016: Metadata Edit Modal
 */

import { z } from 'zod'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/app-component-library'
import { Edit, FolderPlus, Link2, ExternalLink, Trash2 } from 'lucide-react'

/**
 * Inspiration context menu item data
 */
const InspirationContextItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  sourceUrl: z.string().nullable().optional(),
})

export type InspirationContextItem = z.infer<typeof InspirationContextItemSchema>

/**
 * InspirationContextMenu props
 */
export interface InspirationContextMenuProps {
  /** Trigger element */
  children: React.ReactNode
  /** The inspiration item */
  item: InspirationContextItem
  /** Called when edit is clicked */
  onEdit?: () => void
  /** Called when add to album is clicked */
  onAddToAlbum?: () => void
  /** Called when link to MOC is clicked */
  onLinkToMoc?: () => void
  /** Called when delete is clicked */
  onDelete?: () => void
  /** Additional className for the menu content */
  className?: string
}

/**
 * InspirationContextMenu Component
 *
 * Dropdown menu for inspiration card actions:
 * - Edit metadata
 * - Add to album
 * - Link to MOC
 * - Open source link (if available)
 * - Delete
 */
export function InspirationContextMenu({
  children,
  item,
  onEdit,
  onAddToAlbum,
  onLinkToMoc,
  onDelete,
  className,
}: InspirationContextMenuProps) {
  const handleOpenSource = () => {
    if (item.sourceUrl) {
      window.open(item.sourceUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={className}>
        <DropdownMenuItem onClick={onEdit} data-testid="context-menu-edit">
          <Edit className="h-4 w-4 mr-2" />
          Edit Details
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onAddToAlbum} data-testid="context-menu-add-to-album">
          <FolderPlus className="h-4 w-4 mr-2" />
          Add to Album
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onLinkToMoc} data-testid="context-menu-link-moc">
          <Link2 className="h-4 w-4 mr-2" />
          Link to MOC
        </DropdownMenuItem>

        {item.sourceUrl ? (
          <DropdownMenuItem onClick={handleOpenSource} data-testid="context-menu-open-source">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Source
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
          data-testid="context-menu-delete"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default InspirationContextMenu
