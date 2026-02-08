/**
 * AlbumContextMenu Component
 *
 * Context menu (dropdown) for album card actions.
 * Provides edit, add items, link to MOC, and delete options.
 *
 * INSP-015: Delete Flows
 */

import { z } from 'zod'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/app-component-library'
import { Edit, ImagePlus, Link2, FolderPlus, Trash2 } from 'lucide-react'

/**
 * Album context menu item data
 */
const AlbumContextItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
})

export type AlbumContextItem = z.infer<typeof AlbumContextItemSchema>

/**
 * AlbumContextMenu props
 */
export interface AlbumContextMenuProps {
  /** Trigger element */
  children: React.ReactNode
  /** The album item */
  item: AlbumContextItem
  /** Called when edit is clicked */
  onEdit?: () => void
  /** Called when add inspirations is clicked */
  onAddInspirations?: () => void
  /** Called when create sub-album is clicked */
  onCreateSubAlbum?: () => void
  /** Called when link to MOC is clicked */
  onLinkToMoc?: () => void
  /** Called when delete is clicked */
  onDelete?: () => void
  /** Additional className for the menu content */
  className?: string
}

/**
 * AlbumContextMenu Component
 *
 * Dropdown menu for album card actions:
 * - Edit album details
 * - Add inspirations
 * - Create sub-album
 * - Link to MOC
 * - Delete
 */
export function AlbumContextMenu({
  children,
  item,
  onEdit,
  onAddInspirations,
  onCreateSubAlbum,
  onLinkToMoc,
  onDelete,
  className,
}: AlbumContextMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={className}
        aria-label={`Actions for ${item.title}`}
      >
        <DropdownMenuItem onClick={onEdit} data-testid="album-context-edit">
          <Edit className="h-4 w-4 mr-2" />
          Edit Album
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onAddInspirations} data-testid="album-context-add-items">
          <ImagePlus className="h-4 w-4 mr-2" />
          Add Inspirations
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onCreateSubAlbum} data-testid="album-context-create-sub">
          <FolderPlus className="h-4 w-4 mr-2" />
          Create Sub-Album
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onLinkToMoc} data-testid="album-context-link-moc">
          <Link2 className="h-4 w-4 mr-2" />
          Link to MOC
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
          data-testid="album-context-delete"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Album
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default AlbumContextMenu
