import { useCallback } from 'react'
import { Settings } from 'lucide-react'
import { logger } from '@repo/logger'
import {
  useGetUserTagsQuery,
  useGetDistinctThemesQuery,
  useAddTagThemeMappingsMutation,
  useRemoveTagThemeMappingMutation,
} from '@repo/api-client/rtk/dashboard-api'
import { TagThemeBoard } from '../components/TagThemeBoard'

export function SettingsPage() {
  const { data: tags = [], isLoading: tagsLoading } = useGetUserTagsQuery()
  const { data: themes = [], isLoading: themesLoading } = useGetDistinctThemesQuery()
  const [addMappings] = useAddTagThemeMappingsMutation()
  const [removeMapping] = useRemoveTagThemeMappingMutation()

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

  const isLoading = tagsLoading || themesLoading

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Tag Theme Mappings
        </h2>
        <p className="text-sm text-muted-foreground">
          Drag tags into theme buckets to group your collection. Tags can belong to multiple themes.
          The dashboard chart updates automatically.
        </p>
      </div>

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
        />
      )}
    </div>
  )
}
