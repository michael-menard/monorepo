/**
 * ThemeMappingsPage
 *
 * Dedicated page for tag-theme mappings at /settings/themes.
 * Extracted from the old tabbed SettingsPage so it can live
 * at its own URL.
 */
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Palette } from 'lucide-react'
import {
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogFooter,
  Button,
} from '@repo/app-component-library'
import { logger } from '@repo/logger'
import {
  useGetUserTagsQuery,
  useGetDistinctThemesQuery,
  useCreateThemeMutation,
  useDeleteThemeMutation,
  useAddTagThemeMappingsMutation,
  useRemoveTagThemeMappingMutation,
  useDeleteTagGloballyMutation,
} from '@repo/api-client/rtk/dashboard-api'
import { TagThemeBoard } from '../components/TagThemeBoard'

export function ThemeMappingsPage() {
  const { data: tags = [], isLoading: tagsLoading } = useGetUserTagsQuery()
  const { data: themes = [], isLoading: themesLoading } = useGetDistinctThemesQuery()
  const [createTheme] = useCreateThemeMutation()
  const [deleteTheme] = useDeleteThemeMutation()
  const [addMappings] = useAddTagThemeMappingsMutation()
  const [removeMapping] = useRemoveTagThemeMappingMutation()
  const [deleteTagGlobally] = useDeleteTagGloballyMutation()
  const [tagToDelete, setTagToDelete] = useState<string | null>(null)

  const handleAssign = useCallback(
    (mappings: { tag: string; theme: string }[]) => {
      addMappings({ mappings }).catch(error => {
        logger.error('Failed to assign tag to theme', error)
      })
    },
    [addMappings],
  )

  const handleRemove = useCallback(
    (tag: string, theme: string) => {
      removeMapping({ tag, theme }).catch(error => {
        logger.error('Failed to remove tag from theme', error)
      })
    },
    [removeMapping],
  )

  const handleCreateTheme = useCallback(
    (name: string) => {
      createTheme(name).catch(error => {
        logger.error('Failed to create theme', error)
      })
    },
    [createTheme],
  )

  const handleDeleteTheme = useCallback(
    (name: string) => {
      deleteTheme(name).catch(error => {
        logger.error('Failed to delete theme', error)
      })
    },
    [deleteTheme],
  )

  const handleConfirmDeleteTag = useCallback(() => {
    if (!tagToDelete) return
    deleteTagGlobally(tagToDelete).catch(error => {
      logger.error('Failed to delete tag globally', error)
    })
    setTagToDelete(null)
  }, [tagToDelete, deleteTagGlobally])

  const tagInfo = tagToDelete ? tags.find(t => t.tag === tagToDelete) : null

  const isLoading = tagsLoading || themesLoading

  return (
    <div className="flex flex-col h-[calc(100dvh-10rem)]">
      <div className="space-y-1 shrink-0 mb-4">
        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            className="p-1 -ml-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to settings"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Tag-Theme Mappings
          </h2>
        </div>
        <p className="text-sm text-muted-foreground ml-7">
          Drag tags into theme buckets to group your collection. Tags can belong to multiple
          themes. The dashboard chart updates automatically.
        </p>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <TagThemeBoard
            tags={tags}
            themes={themes}
            onAssign={handleAssign}
            onRemove={handleRemove}
            onCreateTheme={handleCreateTheme}
            onDeleteTheme={handleDeleteTheme}
            onDeleteTag={setTagToDelete}
          />
        )}
      </div>

      <AppDialog open={!!tagToDelete} onOpenChange={open => !open && setTagToDelete(null)}>
        <AppDialogContent>
          <AppDialogHeader>
            <AppDialogTitle>Delete tag globally?</AppDialogTitle>
          </AppDialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove <strong>&ldquo;{tagToDelete}&rdquo;</strong> from{' '}
            {tagInfo ? (
              <>
                <strong>{tagInfo.mocCount}</strong> MOC{tagInfo.mocCount !== 1 ? 's' : ''}
              </>
            ) : (
              'all MOCs'
            )}{' '}
            and any theme mappings. This cannot be undone.
          </p>
          <AppDialogFooter>
            <Button variant="outline" onClick={() => setTagToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteTag}>
              Delete
            </Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
    </div>
  )
}
